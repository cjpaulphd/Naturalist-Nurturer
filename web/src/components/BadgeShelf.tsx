"use client";

import { useEffect, useState } from "react";
import { Species } from "@/lib/types";
import {
  ALL_BADGES,
  SPECIALTIES,
  SIMPLE_BADGES,
  TIER_NAMES,
  BadgeTier,
  buildBadgeContext,
  evaluateBadges,
  getEarnedBadges,
  specialtyCount,
} from "@/lib/badges";

interface ShelfItem {
  key: string;
  icon: string;
  name: string;
  /** Highest earned tier name, e.g. "Sapling" (specialties only) */
  tierLabel: string | null;
  /** Rule text for the next (or final) target */
  description: string;
  earned: boolean;
  /** All tiers/targets complete — nothing left to progress toward */
  maxed: boolean;
  earnedAt: number | null;
  current: number;
  target: number;
}

interface BadgeShelfProps {
  species: Species[];
}

const RING_RADIUS = 22;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function BadgeShelf({ species }: BadgeShelfProps) {
  const [items, setItems] = useState<ShelfItem[] | null>(null);
  const [earnedCount, setEarnedCount] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Built in an effect (not render) because evaluation may write to localStorage
  useEffect(() => {
    const ctx = buildBadgeContext(species);
    evaluateBadges(ctx);
    const earned = getEarnedBadges();

    const specialtyItems: ShelfItem[] = SPECIALTIES.map((s) => {
      const tiers = [1, 2, 3] as BadgeTier[];
      const earnedTiers = tiers.filter((t) => earned[`${s.key}-${t}`]);
      const highest = earnedTiers[earnedTiers.length - 1] ?? null;
      const nextTier = tiers.find((t) => !earned[`${s.key}-${t}`]) ?? null;
      const current = specialtyCount(ctx, s);
      const target = s.thresholds[(nextTier ?? 3) - 1];
      return {
        key: s.key,
        icon: s.icon,
        name: s.name,
        tierLabel: highest ? TIER_NAMES[highest] : null,
        description: nextTier
          ? `Learn ${target} ${s.subject}`
          : `All tiers earned — ${s.subject} expert!`,
        earned: highest !== null,
        maxed: nextTier === null,
        earnedAt: highest ? earned[`${s.key}-${highest}`] : null,
        current,
        target,
      };
    });

    const simpleItems: ShelfItem[] = SIMPLE_BADGES.map((b) => {
      const { current, target } = b.progress(ctx);
      const isEarned = !!earned[b.id];
      return {
        key: b.id,
        icon: b.icon,
        name: b.name,
        tierLabel: null,
        description: b.description,
        earned: isEarned,
        maxed: isEarned,
        earnedAt: earned[b.id] ?? null,
        current,
        target,
      };
    });

    setItems([...specialtyItems, ...simpleItems]);
    setEarnedCount(ALL_BADGES.filter((b) => earned[b.id]).length);
  }, [species]);

  if (!items) return null;

  const selected = items.find((i) => i.key === selectedKey) ?? null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-stone-700">Field Notes</h2>
        <span className="text-xs text-stone-500">
          {earnedCount} of {ALL_BADGES.length} badges
        </span>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {items.map((item) => {
          const pct = Math.min(item.current / item.target, 1);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setSelectedKey(selectedKey === item.key ? null : item.key)
              }
              className="flex justify-center rounded-lg p-1 hover:bg-stone-50 transition-colors"
              aria-label={`${item.name}${item.tierLabel ? ` (${item.tierLabel})` : ""}`}
            >
              <div
                className={`relative w-12 h-12 rounded-full flex items-center justify-center border ${
                  item.earned
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-stone-200"
                } ${selectedKey === item.key ? "ring-2 ring-green-500" : ""}`}
              >
                <span
                  className={`text-xl ${item.earned ? "" : "grayscale opacity-50"}`}
                >
                  {item.icon}
                </span>
                {!item.maxed && pct > 0 && (
                  <svg
                    className="absolute inset-0 w-full h-full -rotate-90 text-green-600"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <circle
                      cx="24"
                      cy="24"
                      r={RING_RADIUS}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={`${pct * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                    />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-3 pt-3 border-t border-stone-100 text-center">
          <p className="text-xs font-medium text-stone-700">
            {selected.icon} {selected.name}
            {selected.tierLabel ? ` · ${selected.tierLabel}` : ""}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">{selected.description}</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {selected.maxed && selected.earnedAt
              ? `Earned ${new Date(selected.earnedAt).toLocaleDateString()}`
              : `${Math.min(selected.current, selected.target)} of ${selected.target}`}
          </p>
        </div>
      )}
    </div>
  );
}
