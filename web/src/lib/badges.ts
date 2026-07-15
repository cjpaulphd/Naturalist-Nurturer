/**
 * Badge definitions and evaluation for the optional gamification layer.
 *
 * Badges are derived from data the app already stores (card states,
 * progress, study locations). Only earned-at timestamps are persisted,
 * so badges are never revoked and celebrations fire exactly once.
 * Evaluation always runs regardless of the gamification toggle — the
 * toggle only gates display, so turning it back on loses nothing.
 */

import { Category, Species } from "./types";
import { getStorage, setStorage } from "./storage";
import { getAllCardStates, getUserProgress } from "./srs";
import { getStudyLocations } from "./location-tracker";

const BADGES_KEY = "badges";
const SPECIES_CATEGORY_KEY = "species_categories";
const GAMIFICATION_KEY = "gamification";

export type BadgeTier = 1 | 2 | 3;

export const TIER_NAMES: Record<BadgeTier, string> = {
  1: "Sprout",
  2: "Sapling",
  3: "Old-Growth",
};

export interface BadgeContext {
  /** Unique species studied per category, across all locations and time */
  categoryCounts: Partial<Record<Category, number>>;
  totalReviewed: number;
  /** Longest streak ever, so streak badges never regress */
  bestStreak: number;
  placesCount: number;
}

export interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  tier?: BadgeTier;
  progress: (ctx: BadgeContext) => { current: number; target: number };
}

export interface SpecialtyDef {
  key: string;
  name: string;
  icon: string;
  categories: Category[];
  /** What the counted species are called, e.g. "reptiles & amphibians" */
  subject: string;
  /** Species-learned thresholds for Sprout / Sapling / Old-Growth */
  thresholds: [number, number, number];
}

export const SPECIALTIES: SpecialtyDef[] = [
  { key: "herpetologist", name: "Herpetologist", icon: "🦎", categories: ["reptile", "amphibian"], subject: "reptiles & amphibians", thresholds: [5, 15, 30] },
  { key: "ornithologist", name: "Ornithologist", icon: "🐦", categories: ["bird"], subject: "birds", thresholds: [10, 30, 60] },
  { key: "botanist", name: "Botanist", icon: "🌸", categories: ["plant"], subject: "plants", thresholds: [10, 30, 60] },
  { key: "dendrologist", name: "Dendrologist", icon: "🌲", categories: ["tree"], subject: "trees", thresholds: [10, 30, 60] },
  { key: "mycologist", name: "Mycologist", icon: "🍄", categories: ["fungus"], subject: "fungi", thresholds: [5, 15, 30] },
  { key: "entomologist", name: "Entomologist", icon: "🦋", categories: ["insect"], subject: "insects", thresholds: [5, 15, 30] },
  { key: "mammalogist", name: "Mammalogist", icon: "🦌", categories: ["mammal"], subject: "mammals", thresholds: [5, 10, 20] },
];

export function specialtyCount(ctx: BadgeContext, specialty: SpecialtyDef): number {
  return specialty.categories.reduce(
    (sum, cat) => sum + (ctx.categoryCounts[cat] || 0),
    0
  );
}

export const SIMPLE_BADGES: BadgeDef[] = [
  {
    id: "streak-2",
    name: "First Steps",
    icon: "👣",
    description: "Study 2 days in a row",
    progress: (ctx) => ({ current: ctx.bestStreak, target: 2 }),
  },
  {
    id: "streak-7",
    name: "Week in the Woods",
    icon: "🏕️",
    description: "Keep a 7-day study streak",
    progress: (ctx) => ({ current: ctx.bestStreak, target: 7 }),
  },
  {
    id: "streak-30",
    name: "Field Season",
    icon: "📅",
    description: "Keep a 30-day study streak",
    progress: (ctx) => ({ current: ctx.bestStreak, target: 30 }),
  },
  {
    id: "reviewed-50",
    name: "Curious Neighbor",
    icon: "🔍",
    description: "Review 50 cards",
    progress: (ctx) => ({ current: ctx.totalReviewed, target: 50 }),
  },
  {
    id: "reviewed-250",
    name: "Dedicated Naturalist",
    icon: "📖",
    description: "Review 250 cards",
    progress: (ctx) => ({ current: ctx.totalReviewed, target: 250 }),
  },
  {
    id: "reviewed-1000",
    name: "Field Guide Author",
    icon: "✒️",
    description: "Review 1,000 cards",
    progress: (ctx) => ({ current: ctx.totalReviewed, target: 1000 }),
  },
  {
    id: "places-2",
    name: "Trailhead",
    icon: "🥾",
    description: "Study at 2 different places",
    progress: (ctx) => ({ current: ctx.placesCount, target: 2 }),
  },
  {
    id: "places-5",
    name: "Wayfarer",
    icon: "🗺️",
    description: "Study at 5 different places",
    progress: (ctx) => ({ current: ctx.placesCount, target: 5 }),
  },
  {
    id: "naturalist",
    name: "Naturalist",
    icon: "🌍",
    description: "Reach Sprout tier in every specialty",
    progress: (ctx) => ({
      current: SPECIALTIES.filter(
        (s) => specialtyCount(ctx, s) >= s.thresholds[0]
      ).length,
      target: SPECIALTIES.length,
    }),
  },
];

export const ALL_BADGES: BadgeDef[] = [
  ...SPECIALTIES.flatMap((s) =>
    ([1, 2, 3] as BadgeTier[]).map((tier) => ({
      id: `${s.key}-${tier}`,
      name: s.name,
      icon: s.icon,
      tier,
      description: `Learn ${s.thresholds[tier - 1]} ${s.subject}`,
      progress: (ctx: BadgeContext) => ({
        current: specialtyCount(ctx, s),
        target: s.thresholds[tier - 1],
      }),
    }))
  ),
  ...SIMPLE_BADGES,
];

export function isGamificationEnabled(): boolean {
  return getStorage<boolean>(GAMIFICATION_KEY, true);
}

export function setGamificationEnabled(enabled: boolean): void {
  setStorage(GAMIFICATION_KEY, enabled);
}

/** Earned badges: badge id -> earnedAt timestamp (ms). */
export function getEarnedBadges(): Record<string, number> {
  return getStorage<Record<string, number>>(BADGES_KEY, {});
}

/**
 * Build the evaluation context from stored data.
 *
 * Card states only hold species IDs, and species studied at a previous
 * location may not resolve against the currently loaded list — so a small
 * species-id -> category memo is refreshed here from whatever *is*
 * resolvable, and consulted for everything else. Counts are therefore
 * absolute across all time, and stable when the user switches locations.
 */
export function buildBadgeContext(allSpecies: Species[]): BadgeContext {
  const cardStates = getAllCardStates();
  const memo = getStorage<Record<string, Category>>(SPECIES_CATEGORY_KEY, {});
  let memoChanged = false;
  for (const s of allSpecies) {
    const id = String(s.id);
    if (cardStates[id] && memo[id] !== s.category) {
      memo[id] = s.category;
      memoChanged = true;
    }
  }
  if (memoChanged) setStorage(SPECIES_CATEGORY_KEY, memo);

  const categoryCounts: Partial<Record<Category, number>> = {};
  for (const id of Object.keys(cardStates)) {
    const cat = memo[id];
    if (!cat) continue;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  const progress = getUserProgress();
  return {
    categoryCounts,
    totalReviewed: progress.totalReviewed,
    bestStreak: Math.max(progress.longestStreak ?? 0, progress.streakDays),
    placesCount: getStudyLocations().length,
  };
}

/**
 * Persist any newly earned badges and return them for celebration.
 */
export function evaluateBadges(ctx: BadgeContext): BadgeDef[] {
  const earned = getEarnedBadges();
  const newlyEarned: BadgeDef[] = [];
  const now = Date.now();

  for (const def of ALL_BADGES) {
    if (earned[def.id]) continue;
    const { current, target } = def.progress(ctx);
    if (current >= target) {
      earned[def.id] = now;
      newlyEarned.push(def);
    }
  }

  if (newlyEarned.length > 0) setStorage(BADGES_KEY, earned);
  return newlyEarned;
}
