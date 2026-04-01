"use client";

import { Species, Category } from "@/lib/types";
import { getLearnedCount, getDueCards, getUserProgress } from "@/lib/srs";

interface ProgressDashboardProps {
  species: Species[];
}

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: "tree", label: "Trees", icon: "🌲" },
  { value: "plant", label: "Plants", icon: "🌸" },
  { value: "bird", label: "Birds", icon: "🐦" },
];

export default function ProgressDashboard({ species }: ProgressDashboardProps) {
  const progress = getUserProgress();
  const dueCount = getDueCards(species, []).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
      <h2 className="text-sm font-semibold text-stone-700 mb-3">
        Your Progress
      </h2>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {CATEGORIES.map((cat) => {
          const total = species.filter((s) => s.category === cat.value).length;
          const learned = getLearnedCount(species, cat.value);
          const pct = total > 0 ? Math.round((learned / total) * 100) : 0;

          return (
            <div key={cat.value} className="text-center">
              <div className="text-lg mb-1">{cat.icon}</div>
              <div className="text-xs text-stone-500 mb-1">{cat.label}</div>
              <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-xs text-stone-600 mt-1">
                {learned}/{total}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-stone-500 border-t border-stone-100 pt-3">
        <span>
          Streak: <strong className="text-stone-700">{progress.streakDays} day{progress.streakDays !== 1 ? "s" : ""}</strong>
        </span>
        <span>
          Reviews due: <strong className="text-stone-700">{dueCount}</strong>
        </span>
        <span>
          Total reviewed: <strong className="text-stone-700">{progress.totalReviewed}</strong>
        </span>
      </div>
    </div>
  );
}
