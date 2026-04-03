/**
 * iNaturalist API client for browser-side species lookup by location.
 */

import { Species, Category, SpeciesPhoto } from "./types";
import { getStorage, setStorage } from "./storage";

const INAT_API = "https://api.inaturalist.org/v1";
const CACHE_KEY = "nn_location_species";
const CACHE_LOCATION_KEY = "nn_last_location";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Families known to contain trees (from the Python pipeline)
const TREE_FAMILIES = new Set([
  "Pinaceae", "Cupressaceae", "Taxaceae",
  "Fagaceae", "Betulaceae", "Juglandaceae",
  "Sapindaceae", "Anacardiaceae",
  "Magnoliaceae", "Annonaceae",
  "Lauraceae",
  "Rosaceae", "Fabaceae", "Ericaceae",
  "Cornaceae", "Nyssaceae",
  "Oleaceae", "Malvaceae",
  "Aquifoliaceae", "Altingiaceae", "Platanaceae",
  "Hamamelidaceae", "Ulmaceae", "Salicaceae",
  "Bignoniaceae", "Ebenaceae", "Styracaceae",
  "Symplocaceae", "Adoxaceae",
]);

// Common-name keywords that strongly suggest a tree
const TREE_NAME_KEYWORDS = [
  "oak", "maple", "pine", "birch", "beech", "ash", "elm", "hickory",
  "walnut", "cherry", "poplar", "willow", "locust", "redbud", "dogwood",
  "magnolia", "tulip tree", "sassafras", "sweetgum", "sycamore", "hemlock",
  "spruce", "fir", "cedar", "juniper", "holly", "sourwood", "basswood",
  "buckeye", "chestnut", "persimmon", "serviceberry", "silverbell",
  "pawpaw", "catalpa", "hackberry", "hornbeam", "linden",
];

export interface LocationCoords {
  lat: number;
  lng: number;
  name?: string;
}

interface CachedLocationData {
  coords: LocationCoords;
  species: Species[];
  timestamp: number;
}

/**
 * Get the user's current location via browser geolocation API.
 */
export function getUserLocation(): Promise<LocationCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Location permission denied"));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Location unavailable"));
            break;
          case error.TIMEOUT:
            reject(new Error("Location request timed out"));
            break;
          default:
            reject(new Error("Unknown location error"));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

/**
 * Reverse geocode coordinates to a place name using iNaturalist places.
 */
async function reverseGeocode(coords: LocationCoords): Promise<string> {
  try {
    const res = await fetch(
      `${INAT_API}/places/nearby?nelat=${coords.lat + 0.01}&nelng=${coords.lng + 0.01}&swlat=${coords.lat - 0.01}&swlng=${coords.lng - 0.01}`,
      { headers: { "User-Agent": "NaturalistNurturer/1.0" } }
    );
    if (!res.ok) return `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`;
    const data = await res.json();
    const standard = data.results?.standard;
    if (standard && standard.length > 0) {
      // Prefer county or state-level place
      const place = standard.find((p: { place_type: number }) => p.place_type === 9) // county
        || standard.find((p: { place_type: number }) => p.place_type === 8) // state
        || standard[0];
      return place.display_name || place.name || `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`;
    }
    return `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`;
  } catch {
    return `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`;
  }
}

/**
 * Build a bounding box (~10 miles) around coordinates.
 */
function buildBBox(coords: LocationCoords) {
  const delta = 0.15; // ~10 miles
  return {
    swlat: coords.lat - delta,
    swlng: coords.lng - delta,
    nelat: coords.lat + delta,
    nelng: coords.lng + delta,
  };
}

/**
 * Classify a Plantae taxon as tree or plant.
 */
function classifyPlant(taxon: {
  preferred_common_name?: string;
  name?: string;
  ancestors?: { rank?: string; name?: string }[];
}): Category {
  // Check family from ancestors
  const ancestors = taxon.ancestors || [];
  for (const ancestor of ancestors) {
    if (ancestor.rank === "family" && ancestor.name && TREE_FAMILIES.has(ancestor.name)) {
      // For families with many non-trees, check common name
      const ambiguousFamilies = new Set(["Rosaceae", "Fabaceae", "Ericaceae", "Salicaceae", "Adoxaceae"]);
      if (ambiguousFamilies.has(ancestor.name)) {
        const commonName = (taxon.preferred_common_name || "").toLowerCase();
        if (TREE_NAME_KEYWORDS.some((kw) => commonName.includes(kw))) {
          return "tree";
        }
        return "plant";
      }
      return "tree";
    }
  }

  // Fallback: check common name
  const commonName = (taxon.preferred_common_name || "").toLowerCase();
  if (TREE_NAME_KEYWORDS.some((kw) => commonName.includes(kw))) {
    return "tree";
  }

  return "plant";
}

/**
 * Extract family name from taxon ancestors.
 */
function extractFamily(taxon: {
  ancestors?: { rank?: string; name?: string }[];
}): string {
  const ancestors = taxon.ancestors || [];
  for (const ancestor of ancestors) {
    if (ancestor.rank === "family") {
      return ancestor.name || "Unknown";
    }
  }
  return "Unknown";
}

/**
 * Get photo URL at medium resolution from iNaturalist taxon data.
 */
function getPhotoUrl(defaultPhoto: { medium_url?: string; url?: string } | null): string {
  if (!defaultPhoto) return "";
  if (defaultPhoto.medium_url) return defaultPhoto.medium_url;
  if (defaultPhoto.url) return defaultPhoto.url.replace("square", "medium");
  return "";
}

/**
 * Fetch species counts from iNaturalist for a location.
 */
async function fetchSpeciesCounts(
  coords: LocationCoords,
  iconicTaxa: string,
  perPage: number = 100
): Promise<
  {
    count: number;
    taxon: Record<string, unknown>;
  }[]
> {
  const bbox = buildBBox(coords);
  const params = new URLSearchParams({
    swlat: bbox.swlat.toString(),
    swlng: bbox.swlng.toString(),
    nelat: bbox.nelat.toString(),
    nelng: bbox.nelng.toString(),
    iconic_taxa: iconicTaxa,
    quality_grade: "research",
    rank: "species",
    per_page: perPage.toString(),
    order_by: "count",
    order: "desc",
  });

  const res = await fetch(`${INAT_API}/observations/species_counts?${params}`, {
    headers: { "User-Agent": "NaturalistNurturer/1.0" },
  });

  if (!res.ok) {
    throw new Error(`iNaturalist API error: ${res.status}`);
  }

  const data = await res.json();
  return data.results || [];
}

/**
 * Convert iNaturalist API results to our Species format.
 */
function convertToSpecies(
  results: { count: number; taxon: Record<string, unknown> }[],
  defaultCategory: Category
): Species[] {
  return results.map((item, index) => {
    const taxon = item.taxon as {
      id?: number;
      name?: string;
      preferred_common_name?: string;
      default_photo?: { medium_url?: string; url?: string; attribution?: string };
      ancestors?: { rank?: string; name?: string }[];
      wikipedia_summary?: string;
      iconic_taxon_name?: string;
    };

    const category =
      defaultCategory === "bird"
        ? "bird"
        : classifyPlant(taxon);

    const photoUrl = getPhotoUrl(taxon.default_photo || null);
    const photos: SpeciesPhoto[] = photoUrl
      ? [
          {
            url: photoUrl,
            attribution: taxon.default_photo?.attribution || "",
            filename: "",
          },
        ]
      : [];

    // Extract key facts from Wikipedia summary if available
    const keyFacts: string[] = [];
    const summary = taxon.wikipedia_summary as string | undefined;
    if (summary) {
      const clean = summary.replace(/<[^>]+>/g, "").trim();
      const sentences = clean.split(/(?<=[.!?])\s+/);
      for (const s of sentences) {
        if (s.length > 20 && s.length < 500 && keyFacts.length < 3) {
          keyFacts.push(s.trim());
        }
      }
    }

    // Extract order and genus from ancestors if available
    const ancestors = (taxon.ancestors || []) as { rank?: string; name?: string }[];
    const orderAncestor = ancestors.find((a) => a.rank === "order");
    const genusAncestor = ancestors.find((a) => a.rank === "genus");
    const scientificName = taxon.name || "";
    const genus = genusAncestor?.name || scientificName.split(" ")[0] || "";

    return {
      id: taxon.id || index,
      category,
      commonName: taxon.preferred_common_name || scientificName || "Unknown",
      scientificName,
      order: orderAncestor?.name || "",
      family: extractFamily(taxon),
      genus,
      observationCount: item.count,
      prevalenceRank: 0, // assigned after sorting
      nativeStatus: "unknown",
      seasons: ["spring", "summer", "fall", "winter"], // default to all seasons for live data
      photos,
      sounds: [],
      keyFacts,
      habitat: "",
      identificationTips: "",
    };
  });
}

/**
 * Fetch species for a location, merging Plantae and Aves results.
 * Returns species sorted by prevalence within each category.
 */
export async function fetchSpeciesForLocation(
  coords: LocationCoords
): Promise<{ species: Species[]; locationName: string }> {
  // Check cache
  const cached = getStorage<CachedLocationData | null>(CACHE_KEY, null);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const dist = Math.abs(cached.coords.lat - coords.lat) + Math.abs(cached.coords.lng - coords.lng);
    if (dist < 0.01) {
      return {
        species: cached.species,
        locationName: cached.coords.name || `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`,
      };
    }
  }

  // Fetch in parallel
  const [plantaeResults, avesResults, locationName] = await Promise.all([
    fetchSpeciesCounts(coords, "Plantae", 100),
    fetchSpeciesCounts(coords, "Aves", 100),
    reverseGeocode(coords),
  ]);

  // Convert to Species format
  const plantSpecies = convertToSpecies(plantaeResults, "plant");
  const birdSpecies = convertToSpecies(avesResults, "bird");

  // Assign prevalence ranks within each category
  const allSpecies = [...plantSpecies, ...birdSpecies];

  const byCategory: Record<string, Species[]> = {};
  for (const sp of allSpecies) {
    if (!byCategory[sp.category]) byCategory[sp.category] = [];
    byCategory[sp.category].push(sp);
  }

  for (const catSpecies of Object.values(byCategory)) {
    catSpecies.sort((a, b) => b.observationCount - a.observationCount);
    catSpecies.forEach((sp, i) => {
      sp.prevalenceRank = i + 1;
    });
  }

  // Sort final list: by category then prevalence
  allSpecies.sort((a, b) => {
    const catOrder = { tree: 0, plant: 1, bird: 2 };
    const catDiff = catOrder[a.category] - catOrder[b.category];
    if (catDiff !== 0) return catDiff;
    return a.prevalenceRank - b.prevalenceRank;
  });

  // Cache
  const coordsWithName = { ...coords, name: locationName };
  setStorage<CachedLocationData>(CACHE_KEY, {
    coords: coordsWithName,
    species: allSpecies,
    timestamp: Date.now(),
  });

  // Also save as the stored location
  setStorage(CACHE_LOCATION_KEY, coordsWithName);

  return { species: allSpecies, locationName };
}

/**
 * Get the last used location from cache.
 */
export function getLastLocation(): LocationCoords | null {
  return getStorage<LocationCoords | null>(CACHE_LOCATION_KEY, null);
}

/**
 * Get cached species data if available.
 */
export function getCachedLocationSpecies(): Species[] | null {
  const cached = getStorage<CachedLocationData | null>(CACHE_KEY, null);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.species;
  }
  return null;
}
