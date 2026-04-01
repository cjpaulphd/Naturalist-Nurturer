import { Species, Category } from "./types";

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
      s.family.toLowerCase().includes(q)
  );
}

export function getSpeciesById(
  species: Species[],
  id: number
): Species | undefined {
  return species.find((s) => s.id === id);
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
