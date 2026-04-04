"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Species, Category } from "@/lib/types";
import { loadSpeciesData } from "@/lib/species";
import { getCachedLocationSpecies } from "@/lib/inat";
import { getDueCards, getAllLearnedCards } from "@/lib/srs";
import ProgressDashboard from "@/components/ProgressDashboard";
import CategorySelector from "@/components/CategorySelector";

export default function ProgressPage() {
  const router = useRouter();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const cached = getCachedLocationSpecies();
    if (cached && cached.length > 0) {
      setSpecies(cached);
      setLoading(false);
    } else {
      loadSpeciesData().then((data) => {
        setSpecies(data);
        setLoading(false);
      });
    }
  }, []);

  const dueCount = species.length > 0 ? getDueCards(species, categories).length : 0;
  const learnedCount = species.length > 0 ? getAllLearnedCards(species, categories).length : 0;

  const startReview = () => {
    const params = new URLSearchParams();
    params.set("type", dueCount > 0 ? "review" : "review-all");
    params.set("mode", "photo");
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
          <p className="text-stone-500">Loading progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-800">Growth</h2>
      </div>

      {species.length > 0 ? (
        <>
          <ProgressDashboard species={species} />

          <div className="text-center space-y-3">
            <h3 className="text-sm font-semibold text-stone-600">
              Filter Review by Category
            </h3>
            <CategorySelector selected={categories} onChange={setCategories} />
          </div>

          <div className="text-center">
            <button
              onClick={startReview}
              disabled={dueCount === 0 && learnedCount === 0}
              className="px-6 py-3 bg-amber-600 text-white rounded-xl text-center hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative inline-block"
            >
              <span className="font-semibold">Revisit</span>
              {dueCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                  {dueCount}
                </span>
              ) : learnedCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                  {learnedCount}
                </span>
              ) : null}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-stone-400 text-sm">
            No species loaded. Go to the home page to load species first.
          </p>
        </div>
      )}
    </div>
  );
}
