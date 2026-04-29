"use client";

import { useRouter } from "next/navigation";
import { Species } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { getLearnedCount, getUserProgress } from "@/lib/srs";
import { buildStudyUrlForCategory, getLastStudyFormat } from "@/lib/studyFormat";

interface ProgressDashboardProps {
  species: Species[];
}

export default function ProgressDashboard({ species }: ProgressDashboardProps) {
  const progress = getUserProgress();
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
      <h2 className="text-sm font-semibold text-stone-700 mb-3">
        Neighbors You Know
      </h2>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {CATEGORIES.map((cat) => {
          const total = species.filter((s) => s.category === cat.value).length;
          const learned = getLearnedCount(species, cat.value);
          const pct = total > 0 ? Math.round((learned / total) * 100) : 0;

          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => {
                router.push(buildStudyUrlForCategory(getLastStudyFormat(), cat.value));
              }}
              className="text-center block w-full rounded-lg p-1 hover:bg-stone-50 transition-colors"
            >
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
            </button>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-stone-500 border-t border-stone-100 pt-3">
        <span>
          Streak: <strong className="text-stone-700">{progress.streakDays} day{progress.streakDays !== 1 ? "s" : ""}</strong>
        </span>
        <span>
          Total known: <strong className="text-stone-700">{progress.totalReviewed}</strong>
        </span>
      </div>
    </div>
  );
}
