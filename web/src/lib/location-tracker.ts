/**
 * Tracks which species the user has studied at each location.
 * Persists a list of study locations with species IDs and category breakdowns.
 */

import { Category } from "./types";
import { getStorage, setStorage } from "./storage";
import { getLastLocation, LocationCoords } from "./inat";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "./categories";

const STUDY_LOCATIONS_KEY = "nn_study_locations";

export interface StudyLocation {
  lat: number;
  lng: number;
  name: string;
  speciesIds: number[];
  /** Category -> count of unique species studied */
  categoryCounts: Partial<Record<Category, number>>;
  firstStudied: number; // timestamp
  lastStudied: number; // timestamp
}

export function getStudyLocations(): StudyLocation[] {
  const locations = getStorage<StudyLocation[]>(STUDY_LOCATIONS_KEY, []);
  const merged = deduplicateLocations(locations);
  if (merged.length < locations.length) {
    saveStudyLocations(merged);
  }
  return merged;
}

/**
 * Merge duplicate locations that share the same name.
 */
function deduplicateLocations(locations: StudyLocation[]): StudyLocation[] {
  const result: StudyLocation[] = [];
  for (const loc of locations) {
    const existing = result.find((r) => r.name === loc.name);
    if (existing) {
      // Merge species IDs
      for (const id of loc.speciesIds) {
        if (!existing.speciesIds.includes(id)) {
          existing.speciesIds.push(id);
        }
      }
      // Merge category counts (take the max)
      for (const [cat, count] of Object.entries(loc.categoryCounts)) {
        const c = cat as Category;
        existing.categoryCounts[c] = Math.max(
          existing.categoryCounts[c] || 0,
          count
        );
      }
      // Keep the earliest firstStudied and latest lastStudied
      existing.firstStudied = Math.min(existing.firstStudied, loc.firstStudied);
      existing.lastStudied = Math.max(existing.lastStudied, loc.lastStudied);
    } else {
      result.push({ ...loc, speciesIds: [...loc.speciesIds], categoryCounts: { ...loc.categoryCounts } });
    }
  }
  return result;
}

function saveStudyLocations(locations: StudyLocation[]): void {
  setStorage(STUDY_LOCATIONS_KEY, locations);
}

/**
 * Find the existing study location near the given coords (within ~1km)
 * or with the same name.
 */
function findNearbyLocation(
  locations: StudyLocation[],
  coords: LocationCoords
): StudyLocation | null {
  for (const loc of locations) {
    const dist =
      Math.abs(loc.lat - coords.lat) + Math.abs(loc.lng - coords.lng);
    if (dist < 0.01) return loc; // ~1km threshold
    if (coords.name && loc.name === coords.name) return loc;
  }
  return null;
}

/**
 * Record that a species was studied at the user's current location.
 * Called from rateCard() in srs.ts.
 */
export function recordStudyLocation(
  speciesId: number,
  category: Category
): void {
  const coords = getLastLocation();
  if (!coords) return; // no location set, skip

  const locations = getStudyLocations();
  let loc = findNearbyLocation(locations, coords);
  const now = Date.now();

  if (loc) {
    // Update existing location
    if (!loc.speciesIds.includes(speciesId)) {
      loc.speciesIds.push(speciesId);
      loc.categoryCounts[category] =
        (loc.categoryCounts[category] || 0) + 1;
    }
    loc.lastStudied = now;
    // Update name if it was previously just coordinates
    if (coords.name && (!loc.name || loc.name.includes(","))) {
      loc.name = coords.name;
    }
  } else {
    // Create new location entry
    loc = {
      lat: coords.lat,
      lng: coords.lng,
      name: coords.name || `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`,
      speciesIds: [speciesId],
      categoryCounts: { [category]: 1 },
      firstStudied: now,
      lastStudied: now,
    };
    locations.push(loc);
  }

  saveStudyLocations(locations);
}

/**
 * Format a study location's category counts for display.
 */
export function formatCategorySummary(
  loc: StudyLocation
): { icon: string; label: string; count: number }[] {
  return Object.entries(loc.categoryCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, count]) => ({
      icon: CATEGORY_ICONS[cat as Category] || "",
      label: CATEGORY_LABELS[cat as Category] || cat,
      count,
    }));
}
