import { Species, Category, Season } from "./types";

let speciesCache: Species[] | null = null;

export async function loadSpeciesData(): Promise<Species[]> {
  if (speciesCache) return speciesCache;

  try {
    const res = await fetch("/data/species_data.json");
    if (!res.ok) throw new Error(`Failed to load species data: ${res.status}`);
    const data: Species[] = await res.json();
    speciesCache = data;
    return data;
  } catch (err) {
    console.error("Error loading species data:", err);
    return [];
  }
}

export function filterByCategory(
  species: Species[],
  categories: Category[]
): Species[] {
  if (categories.length === 0) return species;
  return species.filter((s) => categories.includes(s.category));
}

export function filterNativeOnly(species: Species[]): Species[] {
  return species.filter(
    (s) => s.nativeStatus === "native" || s.nativeStatus === "likely native"
  );
}

export function sortByPrevalence(species: Species[]): Species[] {
  return [...species].sort((a, b) => a.prevalenceRank - b.prevalenceRank);
}

export function sortAlphabetical(species: Species[]): Species[] {
  return [...species].sort((a, b) =>
    a.commonName.localeCompare(b.commonName)
  );
}

export function sortByFamily(species: Species[]): Species[] {
  return [...species].sort(
    (a, b) =>
      a.family.localeCompare(b.family) ||
      a.commonName.localeCompare(b.commonName)
  );
}

export function searchSpecies(species: Species[], query: string): Species[] {
  const q = query.toLowerCase().trim();
  if (!q) return species;
  return species.filter(
    (s) =>
      s.commonName.toLowerCase().includes(q) ||
      s.scientificName.toLowerCase().includes(q) ||
      s.family.toLowerCase().includes(q) ||
      (s.order && s.order.toLowerCase().includes(q)) ||
      (s.genus && s.genus.toLowerCase().includes(q))
  );
}

export function getSpeciesById(
  species: Species[],
  id: number
): Species | undefined {
  return species.find((s) => s.id === id);
}

export function getCurrentSeason(): Season {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export function getRandomSeason(): Season {
  const seasons: Season[] = ["spring", "summer", "fall", "winter"];
  return seasons[Math.floor(Math.random() * seasons.length)];
}

export function filterBySeason(species: Species[], season: Season | null): Species[] {
  if (!season) return species;
  return species.filter((s) => s.seasons && s.seasons.includes(season));
}

export function getCategoryCount(
  species: Species[],
  category: Category
): number {
  return species.filter((s) => s.category === category).length;
}

export function getPhotoPath(speciesId: number, filename: string): string {
  return `/data/photos/${speciesId}/${filename}`;
}

export function getSoundPath(speciesId: number, filename: string): string {
  return `/data/sounds/${speciesId}/${filename}`;
}
