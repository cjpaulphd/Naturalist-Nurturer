"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Species, Category, SessionType, StudyMode } from "@/lib/types";
import { loadSpeciesData } from "@/lib/species";
import { getDueCards, getNewCards } from "@/lib/srs";
import CategorySelector from "@/components/CategorySelector";
import ProgressDashboard from "@/components/ProgressDashboard";

export default function HomePage() {
  const router = useRouter();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    loadSpeciesData().then((data) => {
      setSpecies(data);
      setLoading(false);
    });
  }, []);

  const dueCount = species.length > 0 ? getDueCards(species, categories).length : 0;
  const newAvailable =
    species.length > 0 ? getNewCards(species, categories, 1).length > 0 : false;

  const startSession = (type: SessionType, mode: StudyMode = "mixed") => {
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("mode", mode);
    if (categories.length > 0) {
      params.set("categories", categories.join(","));
    }
    router.push(`/study?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-stone-500">Loading species data...</p>
        </div>
      </div>
    );
  }

  if (species.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-6xl mb-4">🌿</p>
        <h2 className="text-xl font-bold text-stone-800 mb-2">
          No Species Data Found
        </h2>
        <p className="text-stone-500 text-sm">
          Run the data pipeline scripts first to fetch species data, then copy{" "}
          <code className="bg-stone-200 px-1 rounded">species_data.json</code>{" "}
          to{" "}
          <code className="bg-stone-200 px-1 rounded">public/data/</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Hero */}
      <div className="text-center">
        <p className="text-4xl mb-2">🌿</p>
        <h2 className="text-2xl font-bold text-stone-800">
          Naturalist Nurturer
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          Learn the species of Green River Preserve
        </p>
      </div>

      {/* Category Selection */}
      <div>
        <h3 className="text-sm font-semibold text-stone-600 mb-2">
          Categories
        </h3>
        <CategorySelector selected={categories} onChange={setCategories} />
      </div>

      {/* Session Options */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-600">Start a Session</h3>

        <button
          onClick={() => startSession("learn", "photo")}
          disabled={!newAvailable}
          className="w-full p-4 bg-green-700 text-white rounded-xl text-left hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="font-semibold">Learn New</div>
          <div className="text-sm text-green-100 mt-0.5">
            Introduce new species in order of local prevalence
          </div>
        </button>

        <button
          onClick={() => startSession("review", "mixed")}
          disabled={dueCount === 0}
          className="w-full p-4 bg-amber-600 text-white rounded-xl text-left hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="font-semibold flex items-center justify-between">
            <span>Review Due</span>
            {dueCount > 0 && (
              <span className="bg-amber-500 px-2 py-0.5 rounded-full text-xs">
                {dueCount} due
              </span>
            )}
          </div>
          <div className="text-sm text-amber-100 mt-0.5">
            Practice cards using spaced repetition
          </div>
        </button>

        <button
          onClick={() => startSession("quiz", "mixed")}
          className="w-full p-4 bg-blue-600 text-white rounded-xl text-left hover:bg-blue-700 transition-colors"
        >
          <div className="font-semibold">Quick Quiz</div>
          <div className="text-sm text-blue-100 mt-0.5">
            15 random cards across all modes
          </div>
        </button>
      </div>

      {/* Study Mode Selection */}
      <div>
        <h3 className="text-sm font-semibold text-stone-600 mb-2">
          Or pick a specific mode
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => startSession("learn", "photo")}
            className="p-3 bg-white rounded-lg border border-stone-200 text-center hover:border-green-400 transition-colors"
          >
            <div className="text-2xl mb-1">📷</div>
            <div className="text-xs text-stone-600">Photo ID</div>
          </button>
          <button
            onClick={() => startSession("learn", "name")}
            className="p-3 bg-white rounded-lg border border-stone-200 text-center hover:border-green-400 transition-colors"
          >
            <div className="text-2xl mb-1">📝</div>
            <div className="text-xs text-stone-600">Name Recall</div>
          </button>
          <button
            onClick={() => startSession("learn", "sound")}
            className="p-3 bg-white rounded-lg border border-stone-200 text-center hover:border-green-400 transition-colors"
          >
            <div className="text-2xl mb-1">🔊</div>
            <div className="text-xs text-stone-600">Sound ID</div>
          </button>
        </div>
      </div>

      {/* Progress Dashboard */}
      <ProgressDashboard species={species} />
    </div>
  );
}
