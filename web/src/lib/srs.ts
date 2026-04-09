/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Based on the SuperMemo SM-2 algorithm:
 * https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

import { CardState, Rating, Species, Category } from "./types";
import { getStorage, setStorage } from "./storage";
import { recordStudyLocation } from "./location-tracker";

const CARD_STATE_KEY = "nn_card_states";
const PROGRESS_KEY = "nn_progress";

/** Fisher-Yates shuffle — produces a uniformly random permutation. */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Rating quality mappings for SM-2 (0-5 scale)
const RATING_QUALITY: Record<Rating, number> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
};

// Base intervals in days
const INITIAL_INTERVAL = 1;
const SECOND_INTERVAL = 6;

// In-memory cache to avoid re-parsing localStorage JSON on every call.
// Invalidated whenever saveCardState writes new data.
let _cardStatesCache: Record<string, CardState> | null = null;

export function getAllCardStates(): Record<string, CardState> {
  if (_cardStatesCache) return _cardStatesCache;
  _cardStatesCache = getStorage<Record<string, CardState>>(CARD_STATE_KEY, {});
  return _cardStatesCache;
}

export function getCardState(speciesId: number): CardState | null {
  const states = getAllCardStates();
  return states[String(speciesId)] || null;
}

export function saveCardState(state: CardState): void {
  const states = getAllCardStates();
  states[String(state.speciesId)] = state;
  setStorage(CARD_STATE_KEY, states);
  _cardStatesCache = states; // keep in-memory cache in sync
}

export function createNewCardState(speciesId: number): CardState {
  return {
    speciesId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: 0,
    lastRating: null,
  };
}

/**
 * Apply SM-2 algorithm to update card state based on rating.
 */
export function rateCard(speciesId: number, rating: Rating, category?: Category): CardState {
  const existing = getCardState(speciesId) || createNewCardState(speciesId);
  const quality = RATING_QUALITY[rating];

  let { easeFactor, interval, repetitions } = existing;

  if (quality < 3) {
    // Failed: reset repetitions
    repetitions = 0;
    interval = INITIAL_INTERVAL;
  } else {
    // Passed
    if (repetitions === 0) {
      interval = INITIAL_INTERVAL;
    } else if (repetitions === 1) {
      interval = SECOND_INTERVAL;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor
  easeFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const now = Date.now();
  const nextReview = now + interval * 24 * 60 * 60 * 1000;

  const newState: CardState = {
    speciesId,
    easeFactor,
    interval,
    repetitions,
    nextReview,
    lastRating: rating,
  };

  saveCardState(newState);
  updateProgress(speciesId);

  if (category) {
    recordStudyLocation(speciesId, category);
  }

  return newState;
}

/**
 * Get species IDs that are due for review.
 */
export function getDueCards(
  allSpecies: Species[],
  categories: Category[]
): number[] {
  const states = getAllCardStates();
  const now = Date.now();

  return allSpecies
    .filter((s) => {
      if (categories.length > 0 && !categories.includes(s.category)) {
        return false;
      }
      const state = states[String(s.id)];
      // Include cards with repetitions===0 (rated "again"/"hard") that are due
      return state && state.nextReview <= now;
    })
    .sort((a, b) => {
      const stateA = states[String(a.id)]!;
      const stateB = states[String(b.id)]!;
      return stateA.nextReview - stateB.nextReview;
    })
    .map((s) => s.id);
}

/**
 * Get all species IDs that have been learned (regardless of review schedule).
 */
export function getAllLearnedCards(
  allSpecies: Species[],
  categories: Category[]
): number[] {
  const states = getAllCardStates();

  return allSpecies
    .filter((s) => {
      if (categories.length > 0 && !categories.includes(s.category)) {
        return false;
      }
      const state = states[String(s.id)];
      // Any card that has been seen (has state) counts as "learned"
      return !!state;
    })
    .sort((a, b) => {
      const stateA = states[String(a.id)]!;
      const stateB = states[String(b.id)]!;
      return stateA.nextReview - stateB.nextReview;
    })
    .map((s) => s.id);
}

/**
 * Get next unlearned species IDs in prevalence order.
 */
export function getNewCards(
  allSpecies: Species[],
  categories: Category[],
  count: number
): number[] {
  const states = getAllCardStates();

  return allSpecies
    .filter((s) => {
      if (categories.length > 0 && !categories.includes(s.category)) {
        return false;
      }
      const state = states[String(s.id)];
      // Only truly unseen cards (no state at all) are "new"
      // Cards rated "again"/"hard" have state but repetitions===0;
      // those belong in the review queue, not here.
      return !state;
    })
    .sort((a, b) => {
      // Deprioritize confirmed introduced species; native and unknown are equal
      const aIntroduced = a.nativeStatus === "introduced" ? 1 : 0;
      const bIntroduced = b.nativeStatus === "introduced" ? 1 : 0;
      if (aIntroduced !== bIntroduced) return aIntroduced - bIntroduced;
      return a.prevalenceRank - b.prevalenceRank;
    })
    .slice(0, count)
    .map((s) => s.id);
}

/**
 * Get random species IDs for a quiz session.
 */
export function getQuizCards(
  allSpecies: Species[],
  categories: Category[],
  count: number
): number[] {
  const states = getAllCardStates();
  const filtered = allSpecies.filter(
    (s) => categories.length === 0 || categories.includes(s.category)
  );

  // Split into new (unlearned) and learned species
  const newSpecies = filtered.filter((s) => !states[String(s.id)]);
  const learnedSpecies = filtered.filter((s) => !!states[String(s.id)]);

  // Within each group, deprioritize confirmed introduced species
  const shuffleWithNativePriority = (species: Species[]): Species[] => {
    const notIntroduced = species.filter((s) => s.nativeStatus !== "introduced");
    const introduced = species.filter((s) => s.nativeStatus === "introduced");
    return [...shuffleArray(notIntroduced), ...shuffleArray(introduced)];
  };

  // Prioritize new species, then fill remaining slots with learned species
  const combined = [
    ...shuffleWithNativePriority(newSpecies),
    ...shuffleWithNativePriority(learnedSpecies),
  ];
  return combined.slice(0, count).map((s) => s.id);
}

/**
 * Count unlearned (new) cards per category without building full arrays.
 */
export function getNewCardCount(
  allSpecies: Species[],
  categories: Category[]
): number {
  const states = getAllCardStates();
  let count = 0;
  for (const s of allSpecies) {
    if (categories.length > 0 && !categories.includes(s.category)) continue;
    if (!states[String(s.id)]) count++;
  }
  return count;
}

/**
 * Get count of learned cards per category.
 */
export function getLearnedCount(
  allSpecies: Species[],
  category?: Category
): number {
  const states = getAllCardStates();
  return allSpecies.filter((s) => {
    if (category && s.category !== category) return false;
    const state = states[String(s.id)];
    return !!state;
  }).length;
}

// Progress tracking

interface Progress {
  totalReviewed: number;
  streakDays: number;
  lastStudyDate: string | null;
}

function getProgress(): Progress {
  return getStorage<Progress>(PROGRESS_KEY, {
    totalReviewed: 0,
    streakDays: 0,
    lastStudyDate: null,
  });
}

function updateProgress(speciesId: number): void {
  const progress = getProgress();
  progress.totalReviewed += 1;

  const today = new Date().toISOString().split("T")[0];

  if (progress.lastStudyDate !== today) {
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];
    if (progress.lastStudyDate === yesterday) {
      progress.streakDays += 1;
    } else if (progress.lastStudyDate !== today) {
      progress.streakDays = 1;
    }
    progress.lastStudyDate = today;
  }

  setStorage(PROGRESS_KEY, progress);
}

export function getUserProgress(): Progress {
  return getProgress();
}
