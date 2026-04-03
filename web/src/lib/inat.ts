/**
 * iNaturalist API client for browser-side species lookup by location.
 */

import { Species, Season, Category, SpeciesPhoto, SpeciesSound } from "./types";
import { getStorage, setStorage } from "./storage";
import { CATEGORY_ORDER, ICONIC_TAXA_CONFIGS } from "./categories";

const INAT_API = "https://api.inaturalist.org/v1";
const CACHE_KEY = "nn_location_species_v2";
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

// Map months to seasons
const MONTH_TO_SEASON: Record<number, Season> = {
  1: "winter", 2: "winter", 3: "spring", 4: "spring", 5: "spring",
  6: "summer", 7: "summer", 8: "summer", 9: "fall", 10: "fall",
  11: "fall", 12: "winter",
};

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
      const place = standard.find((p: { place_type: number }) => p.place_type === 9)
        || standard.find((p: { place_type: number }) => p.place_type === 8)
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
  const delta = 0.15;
  return {
    swlat: coords.lat - delta,
    swlng: coords.lng - delta,
    nelat: coords.lat + delta,
    nelng: coords.lng + delta,
  };
}

/**
 * Classify a Plantae taxon as tree or plant using family and name.
 */
function classifyPlant(
  familyName: string,
  commonName: string
): Category {
  if (familyName && TREE_FAMILIES.has(familyName)) {
    const ambiguousFamilies = new Set(["Rosaceae", "Fabaceae", "Ericaceae", "Salicaceae", "Adoxaceae"]);
    if (ambiguousFamilies.has(familyName)) {
      const cn = commonName.toLowerCase();
      if (TREE_NAME_KEYWORDS.some((kw) => cn.includes(kw))) {
        return "tree";
      }
      return "plant";
    }
    return "tree";
  }

  const cn = commonName.toLowerCase();
  if (TREE_NAME_KEYWORDS.some((kw) => cn.includes(kw))) {
    return "tree";
  }

  return "plant";
}

/**
 * Map an iconic taxa name to a Category.
 * For Plantae, uses classifyPlant to distinguish trees from plants.
 */
function mapIconicTaxaToCategory(
  iconicTaxa: string,
  familyName: string,
  commonName: string
): Category {
  switch (iconicTaxa) {
    case "Plantae":
      return classifyPlant(familyName, commonName);
    case "Aves":
      return "bird";
    case "Fungi":
      return "fungus";
    case "Insecta":
      return "insect";
    case "Mammalia":
      return "mammal";
    case "Reptilia":
      return "reptile";
    case "Amphibia":
      return "amphibian";
    default:
      return "plant";
  }
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
 * Batch-fetch full taxon details including ancestors from /taxa endpoint.
 * The taxa endpoint returns ancestor data (order, family, genus).
 */
async function fetchTaxonDetails(
  taxonIds: number[]
): Promise<Map<number, { order: string; family: string; genus: string; native: boolean }>> {
  const result = new Map<number, { order: string; family: string; genus: string; native: boolean }>();
  if (taxonIds.length === 0) return result;

  // Batch in groups of 30 (API limit)
  const batchSize = 30;
  for (let i = 0; i < taxonIds.length; i += batchSize) {
    const batch = taxonIds.slice(i, i + batchSize);
    try {
      const res = await fetch(
        `${INAT_API}/taxa/${batch.join(",")}`,
        { headers: { "User-Agent": "NaturalistNurturer/1.0" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const taxon of data.results || []) {
        let order = "";
        let family = "";
        let genus = "";
        const native = taxon.native !== false; // default to true if not specified

        // Extract from ancestors array
        const ancestors = (taxon.ancestors || []) as { rank?: string; name?: string }[];
        for (const anc of ancestors) {
          if (anc.rank === "order") order = anc.name || "";
          if (anc.rank === "family") family = anc.name || "";
          if (anc.rank === "genus") genus = anc.name || "";
        }

        // Genus fallback: parse from scientific name
        if (!genus && taxon.name) {
          genus = taxon.name.split(" ")[0] || "";
        }

        result.set(taxon.id, { order, family, genus, native });
      }
    } catch {
      // Continue with what we have
    }
  }

  return result;
}

/**
 * Fetch observation histogram to determine seasonal presence.
 * Returns the seasons where a species has significant observations in the area.
 */
async function fetchSeasonalData(
  coords: LocationCoords,
  taxonIds: number[]
): Promise<Map<number, Season[]>> {
  const result = new Map<number, Season[]>();
  const bbox = buildBBox(coords);

  // Batch in groups of 10 to avoid too many parallel requests
  const batchSize = 10;
  const promises: Promise<void>[] = [];

  for (let i = 0; i < taxonIds.length; i += batchSize) {
    const batch = taxonIds.slice(i, i + batchSize);
    // Fetch histogram for each taxon in this batch
    for (const taxonId of batch) {
      const p = (async () => {
        try {
          const params = new URLSearchParams({
            taxon_id: taxonId.toString(),
            swlat: bbox.swlat.toString(),
            swlng: bbox.swlng.toString(),
            nelat: bbox.nelat.toString(),
            nelng: bbox.nelng.toString(),
            quality_grade: "research",
            interval: "month_of_year",
          });
          const res = await fetch(
            `${INAT_API}/observations/histogram?${params}`,
            { headers: { "User-Agent": "NaturalistNurturer/1.0" } }
          );
          if (!res.ok) return;
          const data = await res.json();
          const monthData = data.results?.month_of_year;
          if (!monthData) return;

          // Determine which seasons have significant observations
          // Sum observations by season
          const seasonCounts: Record<Season, number> = {
            spring: 0, summer: 0, fall: 0, winter: 0,
          };
          for (const [month, count] of Object.entries(monthData)) {
            const m = parseInt(month);
            const season = MONTH_TO_SEASON[m];
            if (season) seasonCounts[season] += count as number;
          }

          // Total observations
          const total = Object.values(seasonCounts).reduce((a, b) => a + b, 0);
          if (total === 0) return;

          // A season is "active" if it has at least 10% of total observations
          const threshold = total * 0.1;
          const seasons: Season[] = [];
          for (const [season, count] of Object.entries(seasonCounts)) {
            if (count >= threshold) {
              seasons.push(season as Season);
            }
          }

          if (seasons.length > 0) {
            result.set(taxonId, seasons);
          }
        } catch {
          // Skip this taxon
        }
      })();
      promises.push(p);
    }

    // Wait for batch before starting next to be respectful of rate limits
    if (promises.length >= batchSize) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }

  // Wait for remaining
  if (promises.length > 0) {
    await Promise.all(promises);
  }

  return result;
}

/**
 * Fetch bird sounds from Xeno-canto API.
 * Returns a map of scientific name -> sounds array.
 */
export async function fetchBirdSounds(
  birdNames: { id: number; scientificName: string }[]
): Promise<Map<number, SpeciesSound[]>> {
  const result = new Map<number, SpeciesSound[]>();
  const XENO_CANTO_API = "https://xeno-canto.org/api/2/recordings";

  // Fetch in small batches to respect rate limits
  for (const bird of birdNames.slice(0, 30)) {
    try {
      const res = await fetch(
        `${XENO_CANTO_API}?query=${encodeURIComponent(bird.scientificName)}+q:A&page=1`,
        { headers: { "User-Agent": "NaturalistNurturer/1.0" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const recordings = data.recordings || [];

      if (recordings.length > 0) {
        // Take up to 2 best quality recordings
        const sounds: SpeciesSound[] = recordings.slice(0, 2).map((rec: {
          file: string;
          rec: string;
          lic: string;
          length: string;
        }) => ({
          url: rec.file ? (rec.file.startsWith("//") ? "https:" + rec.file : rec.file) : "",
          attribution: `${rec.rec || "Unknown"} (${rec.lic || "CC"}) via Xeno-canto`,
          filename: "",
          duration: parseXenoCantoDuration(rec.length),
        }));
        result.set(bird.id, sounds);
      }
    } catch {
      // Skip this bird
    }
  }

  return result;
}

/**
 * Parse Xeno-canto duration string (e.g. "0:15" or "1:30") to seconds.
 */
function parseXenoCantoDuration(length: string): number | null {
  if (!length) return null;
  const parts = length.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return null;
}

/**
 * Convert iNaturalist API results to our Species format.
 */
function convertToSpecies(
  results: { count: number; taxon: Record<string, unknown> }[],
  iconicTaxa: string,
  taxonomyMap: Map<number, { order: string; family: string; genus: string; native: boolean }>,
  seasonMap: Map<number, Season[]>,
  soundMap: Map<number, SpeciesSound[]> = new Map()
): Species[] {
  return results.map((item, index) => {
    const taxon = item.taxon as {
      id?: number;
      name?: string;
      preferred_common_name?: string;
      default_photo?: { medium_url?: string; url?: string; attribution?: string };
      wikipedia_summary?: string;
      iconic_taxon_name?: string;
    };

    const taxonId = taxon.id || index;
    const taxonomy = taxonomyMap.get(taxonId);
    const scientificName = taxon.name || "";
    const commonName = taxon.preferred_common_name || scientificName || "Unknown";

    const family = taxonomy?.family || "";
    const order = taxonomy?.order || "";
    const genus = taxonomy?.genus || scientificName.split(" ")[0] || "";
    const isNative = taxonomy?.native ?? true;

    const category = mapIconicTaxaToCategory(iconicTaxa, family, commonName);

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

    // Get seasonal data, default to all seasons if not available
    const seasons = seasonMap.get(taxonId) || ["spring", "summer", "fall", "winter"];

    return {
      id: taxonId,
      category,
      commonName,
      scientificName,
      order,
      family,
      genus,
      observationCount: item.count,
      prevalenceRank: 0,
      nativeStatus: isNative ? "native" : "introduced",
      seasons,
      photos,
      sounds: soundMap.get(taxonId) || [],
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

  // Fetch species counts for all taxa groups in parallel
  const taxaFetches = ICONIC_TAXA_CONFIGS.map((cfg) =>
    fetchSpeciesCounts(coords, cfg.iconicTaxa, cfg.perPage).then((results) => ({
      iconicTaxa: cfg.iconicTaxa,
      results,
    }))
  );

  const [locationName, ...taxaResults] = await Promise.all([
    reverseGeocode(coords),
    ...taxaFetches,
  ]);

  // Collect all taxon IDs for batch taxonomy fetch
  const allResults = taxaResults.flatMap((t) => t.results);
  const taxonIds = allResults
    .map((r) => (r.taxon as { id?: number }).id)
    .filter((id): id is number => id !== undefined);

  // Collect bird scientific names for sound fetching
  const avesGroup = taxaResults.find((t) => t.iconicTaxa === "Aves");
  const birdNames = (avesGroup?.results || [])
    .map((r) => {
      const t = r.taxon as { id?: number; name?: string };
      return { id: t.id || 0, scientificName: t.name || "" };
    })
    .filter((b) => b.id && b.scientificName);

  // Select top ~7 species per taxa group for seasonal histograms (cap ~50 total)
  const histogramBudget = 50;
  const perGroupBudget = Math.max(5, Math.floor(histogramBudget / taxaResults.length));
  const histogramIds = taxaResults.flatMap((t) =>
    t.results
      .slice(0, perGroupBudget)
      .map((r) => (r.taxon as { id?: number }).id)
      .filter((id): id is number => id !== undefined)
  );

  // Fetch taxonomy details, seasonal data, and bird sounds in parallel
  const [taxonomyMap, seasonMap, soundMap] = await Promise.all([
    fetchTaxonDetails(taxonIds),
    fetchSeasonalData(coords, histogramIds),
    fetchBirdSounds(birdNames),
  ]);

  // Convert each taxa group to Species format
  const allSpecies: Species[] = [];
  for (const group of taxaResults) {
    const sounds = group.iconicTaxa === "Aves" ? soundMap : new Map<number, SpeciesSound[]>();
    const species = convertToSpecies(group.results, group.iconicTaxa, taxonomyMap, seasonMap, sounds);
    allSpecies.push(...species);
  }

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
    const catDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
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
