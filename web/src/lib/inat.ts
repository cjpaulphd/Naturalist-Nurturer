/**
 * iNaturalist API client for browser-side species lookup by location.
 */

import { Species, Season, Category, SpeciesPhoto, SpeciesSound } from "./types";
import { getStorage, setStorage } from "./storage";
import { CATEGORY_ORDER, CATEGORIES, ICONIC_TAXA_CONFIGS } from "./categories";
import { loadSpeciesData } from "./species";
import { getIndigenousNames } from "./indigenousNames";

const INAT_API = "https://api.inaturalist.org/v1";
const CACHE_KEY = "nn_location_species_v2";
const CACHE_LOCATION_KEY = "nn_last_location";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Default location: Green River Preserve, NC
const GRP_LAT = 35.25;
const GRP_LNG = -82.61;

function isGreenRiverPreserve(coords: LocationCoords): boolean {
  return (
    Math.abs(coords.lat - GRP_LAT) < 0.05 &&
    Math.abs(coords.lng - GRP_LNG) < 0.05
  );
}

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

// Common-name keywords that strongly suggest a tree.
// Matched using word boundaries to avoid false positives like
// "bashful" matching "ash" or "helmet" matching "elm".
const TREE_NAME_KEYWORDS = [
  "oak", "maple", "pine", "birch", "beech", "ash", "elm", "hickory",
  "walnut", "cherry", "poplar", "willow", "locust", "redbud", "dogwood",
  "magnolia", "tulip tree", "sassafras", "sweetgum", "sycamore", "hemlock",
  "spruce", "fir", "cedar", "juniper", "holly", "sourwood", "basswood",
  "buckeye", "chestnut", "persimmon", "serviceberry", "silverbell",
  "pawpaw", "catalpa", "hackberry", "hornbeam", "linden",
  "sumac", "smoketree", "fringe tree",
];

// Pre-compiled regex patterns for word-boundary matching
const TREE_NAME_PATTERNS = TREE_NAME_KEYWORDS.map(
  (kw) => new RegExp(`\\b${kw}\\b`, "i")
);

/**
 * Check if a common name contains a tree keyword as a whole word.
 * Uses word boundaries to prevent "helmet" matching "elm", etc.
 */
function hasTreeKeyword(commonName: string): boolean {
  return TREE_NAME_PATTERNS.some((pat) => pat.test(commonName));
}


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
    const ambiguousFamilies = new Set(["Rosaceae", "Fabaceae", "Ericaceae", "Salicaceae", "Adoxaceae", "Anacardiaceae", "Oleaceae", "Bignoniaceae", "Aquifoliaceae"]);
    if (ambiguousFamilies.has(familyName)) {
      if (hasTreeKeyword(commonName)) {
        return "tree";
      }
      return "plant";
    }
    return "tree";
  }

  if (hasTreeKeyword(commonName)) {
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
/**
 * Look up the most specific iNaturalist place for the given coordinates.
 * Returns the place ID to use as preferred_place_id when fetching taxa,
 * which ensures establishment_means reflects the user's actual location.
 */
async function findNearestPlaceId(coords: LocationCoords): Promise<number | null> {
  try {
    const delta = 0.5;
    const res = await fetch(
      `${INAT_API}/places/nearby?nelat=${coords.lat + delta}&nelng=${coords.lng + delta}&swlat=${coords.lat - delta}&swlng=${coords.lng - delta}`,
      { headers: { "User-Agent": "NaturalistNurturer/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Prefer standard administrative places (states, countries) over community places
    const standard = (data.results?.standard || []) as { id?: number; bbox_area?: number }[];
    if (standard.length > 0) {
      // Pick the most specific (smallest area) standard place
      const sorted = [...standard].sort(
        (a, b) => (a.bbox_area ?? Infinity) - (b.bbox_area ?? Infinity)
      );
      return sorted[0]?.id ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchTaxonDetails(
  taxonIds: number[],
  placeId: number = 1
): Promise<Map<number, { order: string; family: string; genus: string; nativeStatus: string; wikipediaSummary: string }>> {
  const result = new Map<number, { order: string; family: string; genus: string; nativeStatus: string; wikipediaSummary: string }>();
  if (taxonIds.length === 0) return result;

  // Batch in groups of 30 (API limit), fetch all batches in parallel
  const batchSize = 30;
  const batches: number[][] = [];
  for (let i = 0; i < taxonIds.length; i += batchSize) {
    batches.push(taxonIds.slice(i, i + batchSize));
  }

  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      try {
        const res = await fetch(
          `${INAT_API}/taxa/${batch.join(",")}?preferred_place_id=${placeId}&locale=en`,
          { headers: { "User-Agent": "NaturalistNurturer/1.0" } }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || []) as Record<string, unknown>[];
      } catch {
        return [];
      }
    })
  );

  for (const taxons of batchResults) {
    for (const taxon of taxons) {
      let order = "";
      let family = "";
      let genus = "";
      // Extract establishment_means when iNaturalist provides it.
      // The API returns this as an object: { establishment_means: "native", place: {...} }
      // or occasionally as a plain string. Handle both formats.
      let nativeStatus = "unknown";
      if (taxon.establishment_means) {
        const emRaw = taxon.establishment_means;
        const em = typeof emRaw === "string"
          ? emRaw
          : (emRaw as { establishment_means?: string }).establishment_means || "";
        if (em === "native" || em === "endemic") {
          nativeStatus = "native";
        } else if (em === "introduced") {
          nativeStatus = "introduced";
        }
      }

      // Extract from ancestors array
      const ancestors = (taxon.ancestors || []) as { rank?: string; name?: string }[];
      for (const anc of ancestors) {
        if (anc.rank === "order") order = anc.name || "";
        if (anc.rank === "family") family = anc.name || "";
        if (anc.rank === "genus") genus = anc.name || "";
      }

      // Genus fallback: parse from scientific name
      if (!genus && (taxon.name as string)) {
        genus = (taxon.name as string).split(" ")[0] || "";
      }

      const wikipediaSummary = (taxon.wikipedia_summary as string) || "";
      result.set(taxon.id as number, { order, family, genus, nativeStatus, wikipediaSummary });
    }
  }

  return result;
}

/**
 * Build an audio URL for a Xeno-canto recording, trying multiple strategies.
 * Returns a proxied URL through /api/sounds/audio, or empty string if none works.
 */
function buildAudioUrl(rec: {
  id: string;
  file: string;
  fileName: string;
  sonoSmall: string;
}): string {
  let audioUrl = "";

  // Strategy 1: Download endpoint from recording id (most reliable)
  if (rec.id) {
    audioUrl = `https://xeno-canto.org/${rec.id}/download`;
  }

  // Strategy 2: Direct file URL
  if (!audioUrl && rec.file) {
    audioUrl = rec.file.startsWith("//") ? "https:" + rec.file : rec.file;
  }

  // Strategy 3: Construct from sonogram URL + filename
  if (!audioUrl && rec.sonoSmall && rec.fileName) {
    const sonoUrl = rec.sonoSmall.startsWith("//")
      ? "https:" + rec.sonoSmall
      : rec.sonoSmall;
    const baseMatch = sonoUrl.match(/^(.*?)ffts\//);
    if (baseMatch) {
      audioUrl = baseMatch[1] + rec.fileName;
    }
  }

  if (!audioUrl) return "";

  // Proxy all audio through our server to avoid 403 / hotlinking blocks
  return `/api/sounds/audio?url=${encodeURIComponent(audioUrl)}`;
}

/**
 * Fetch bird sounds from Xeno-canto API.
 * Returns a map of species id -> sounds array.
 */
export async function fetchBirdSounds(
  birdNames: { id: number; scientificName: string }[]
): Promise<Map<number, SpeciesSound[]>> {
  const result = new Map<number, SpeciesSound[]>();

  // Use local API proxy to avoid CORS/403 from Xeno-canto
  const SOUNDS_API = "/api/sounds";

  // Fetch in parallel batches of 10 to balance speed and rate limits
  const birds = birdNames.slice(0, 30);
  const batchSize = 10;
  for (let i = 0; i < birds.length; i += batchSize) {
    const batch = birds.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (bird) => {
        try {
          // Search without quality filter for broader results
          const res = await fetch(
            `${SOUNDS_API}?query=${encodeURIComponent(bird.scientificName)}`
          );
          if (!res.ok) return;
          const data = await res.json();
          const recordings = data.recordings || [];

          if (recordings.length > 0) {
            const sounds: SpeciesSound[] = recordings.slice(0, 2).map((rec: {
              id: string;
              file: string;
              fileName: string;
              sonoSmall: string;
              rec: string;
              lic: string;
              length: string;
            }) => {
              const url = buildAudioUrl(rec);
              if (!url) return null;
              return {
                url,
                attribution: `${rec.rec || "Unknown"} (${rec.lic || "CC"}) via Xeno-canto`,
                filename: "",
                duration: parseXenoCantoDuration(rec.length),
              };
            }).filter((s: SpeciesSound | null): s is SpeciesSound => s !== null);
            if (sounds.length > 0) {
              result.set(bird.id, sounds);
            }
          }
        } catch {
          // Skip this bird
        }
      })
    );
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
  taxonomyMap: Map<number, { order: string; family: string; genus: string; nativeStatus: string; wikipediaSummary: string }>,
  seasonMap: Map<number, Season[]>,
  soundMap: Map<number, SpeciesSound[]> = new Map(),
  coords?: LocationCoords | null
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
    const nativeStatus = taxonomy?.nativeStatus ?? "unknown";

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
    // Prefer the summary from the /taxa endpoint (via taxonomyMap) as the species_counts
    // endpoint often omits wikipedia_summary
    const keyFacts: string[] = [];
    const summary = taxonomy?.wikipediaSummary || (taxon.wikipedia_summary as string | undefined);
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

    const indigenousNames = getIndigenousNames(scientificName, coords);

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
      nativeStatus,
      seasons,
      photos,
      sounds: soundMap.get(taxonId) || [],
      keyFacts,
      habitat: "",
      identificationTips: "",
      ...(indigenousNames.length > 0 ? { indigenousNames } : {}),
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
  // Use Promise.allSettled so one failing group doesn't block others
  const taxaFetches = ICONIC_TAXA_CONFIGS.map((cfg) =>
    fetchSpeciesCounts(coords, cfg.iconicTaxa, cfg.perPage).then((results) => ({
      iconicTaxa: cfg.iconicTaxa,
      results,
    }))
  );

  // Look up the nearest iNaturalist place in parallel with taxa fetches
  // so establishment_means reflects the user's actual location
  const [locationNameResult, placeIdResult, ...taxaSettled] = await Promise.all([
    reverseGeocode(coords),
    findNearestPlaceId(coords),
    ...taxaFetches.map((p) =>
      p.catch(() => null)
    ),
  ]);

  const locationName = locationNameResult as string;
  const placeId = (placeIdResult as number | null) ?? 1;
  const taxaResults = (taxaSettled as (({ iconicTaxa: string; results: { count: number; taxon: Record<string, unknown> }[] }) | null)[])
    .filter((r): r is { iconicTaxa: string; results: { count: number; taxon: Record<string, unknown> }[] } => r !== null);

  // Collect all taxon IDs for batch taxonomy fetch
  const allResults = taxaResults.flatMap((t) => t.results);
  const taxonIds = allResults
    .map((r) => (r.taxon as { id?: number }).id)
    .filter((id): id is number => id !== undefined);

  // Fetch taxonomy details using the location-specific place ID
  // so native/introduced labels are accurate for the user's area
  const taxonomyMap = await fetchTaxonDetails(taxonIds, placeId);

  // Convert each taxa group to Species format (no seasonal data — defaults to all seasons)
  const emptySeasonMap = new Map<number, Season[]>();
  const allSpecies: Species[] = [];
  for (const group of taxaResults) {
    const species = convertToSpecies(group.results, group.iconicTaxa, taxonomyMap, emptySeasonMap, new Map(), coords);
    allSpecies.push(...species);
  }

  const byCategory: Record<string, Species[]> = {};
  for (const sp of allSpecies) {
    if (!byCategory[sp.category]) byCategory[sp.category] = [];
    byCategory[sp.category].push(sp);
  }

  // For the default Green River Preserve location, backfill categories that
  // have fewer than 5 species with curated defaults from bundled data.
  // Other locations only show species actually observed there.
  const isDefaultLocation = isGreenRiverPreserve(coords);
  if (isDefaultLocation) {
    const MIN_SPECIES_PER_CATEGORY = 5;
    const categoriesToBackfill = CATEGORIES
      .map((c) => c.value)
      .filter((cat) => !byCategory[cat] || byCategory[cat].length < MIN_SPECIES_PER_CATEGORY);

    if (categoriesToBackfill.length > 0) {
      const defaultSpecies = await loadSpeciesData();
      const fetchedIds = new Set(allSpecies.map((sp) => sp.id));

      for (const cat of categoriesToBackfill) {
        const existing = byCategory[cat] || [];
        const needed = MIN_SPECIES_PER_CATEGORY - existing.length;
        const defaults = defaultSpecies
          .filter((sp) => sp.category === cat && !fetchedIds.has(sp.id))
          .slice(0, needed);
        for (const sp of defaults) {
          fetchedIds.add(sp.id);
          allSpecies.push(sp);
          if (!byCategory[cat]) byCategory[cat] = [];
          byCategory[cat].push(sp);
        }
      }
    }
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
 * Update cached species data with bird sounds so they persist across navigations.
 */
export function updateCachedSpeciesSounds(soundMap: Map<number, SpeciesSound[]>): void {
  const cached = getStorage<CachedLocationData | null>(CACHE_KEY, null);
  if (!cached) return;
  let updated = false;
  for (const species of cached.species) {
    const sounds = soundMap.get(species.id);
    if (sounds && sounds.length > 0 && (!species.sounds || species.sounds.length === 0)) {
      species.sounds = sounds;
      updated = true;
    }
  }
  if (updated) {
    setStorage<CachedLocationData>(CACHE_KEY, cached);
  }
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
