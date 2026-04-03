"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Species, Category, Season, SessionType, StudyMode, QuizMode } from "@/lib/types";
import { loadSpeciesData, filterBySeason } from "@/lib/species";
import { getCachedLocationSpecies } from "@/lib/inat";
import { getDueCards, getNewCards } from "@/lib/srs";
import CategorySelector from "@/components/CategorySelector";
import SeasonChooser from "@/components/SeasonChooser";
import ProgressDashboard from "@/components/ProgressDashboard";
import LocationPicker from "@/components/LocationPicker";

export default function HomePage() {
  const router = useRouter();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [season, setSeason] = useState<Season | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>("flashcard");
  const [locationName, setLocationName] = useState<string | null>(null);

  useEffect(() => {
    // Try cached location species first, then fall back to static data
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

  const handleSpeciesLoaded = (newSpecies: Species[], name: string) => {
    setSpecies(newSpecies);
    setLocationName(name);
  };

  const seasonFiltered = filterBySeason(species, season);
  const dueCount = seasonFiltered.length > 0 ? getDueCards(seasonFiltered, categories).length : 0;
  const newAvailable =
    seasonFiltered.length > 0 ? getNewCards(seasonFiltered, categories, 1).length > 0 : false;

  const startSession = (type: SessionType, mode: StudyMode = "mixed") => {
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("mode", mode);
    if (categories.length > 0) {
      params.set("categories", categories.join(","));
    }
    if (season) {
      params.set("season", season);
    }
    if (quizMode !== "flashcard") {
      params.set("quizMode", quizMode);
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

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Hero */}
      <div className="text-center">
        <p className="text-4xl mb-2">🌿</p>
        <h2 className="text-2xl font-bold text-stone-800">
          Naturalist Nurturer
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          Know Your Neighbors. Learn the Species Where You Are.
        </p>
      </div>

      {/* Location Picker */}
      <LocationPicker
        onSpeciesLoaded={handleSpeciesLoaded}
        onLoading={setLocationLoading}
      />

      {/* Loading overlay for location fetch */}
      {locationLoading && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 rounded-lg border border-green-200">
          <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-green-700">
            Discovering species near you...
          </span>
        </div>
      )}

      {species.length === 0 && !locationLoading ? (
        <div className="text-center py-8">
          <p className="text-stone-400 text-sm">
            Share your location or tap &ldquo;Green River Preserve&rdquo; to load species.
          </p>
        </div>
      ) : species.length > 0 ? (
        <>
          {/* Species count summary */}
          {locationName && (
            <div className="text-center">
              <p className="text-sm text-stone-600">
                <span className="font-semibold text-green-700">{species.length}</span> species found
                {locationName && <> near <span className="font-medium">{locationName}</span></>}
              </p>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <h3 className="text-sm font-semibold text-stone-600 mb-2">
              Categories
            </h3>
            <CategorySelector selected={categories} onChange={setCategories} />
          </div>

          {/* Season Selection */}
          <SeasonChooser selected={season} onChange={setSeason} />
          {season && (
            <p className="text-xs text-stone-500 -mt-2">
              {seasonFiltered.length} species active in{" "}
              <span className="font-medium capitalize">{season}</span>
            </p>
          )}

          {/* Quiz Mode Selection */}
          <div>
            <h3 className="text-sm font-semibold text-stone-600 mb-2">
              Quiz Difficulty
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["flashcard", "Flashcard", "Flip to reveal"],
                ["multiple-choice", "Multiple Choice", "Pick from 4 options"],
                ["dropdown", "Dropdown", "Select from all species"],
                ["free-response", "Free Response", "Type your answer"],
              ] as [QuizMode, string, string][]).map(([mode, label, desc]) => (
                <button
                  key={mode}
                  onClick={() => setQuizMode(mode)}
                  className={`p-3 rounded-lg text-left transition-colors border ${
                    quizMode === mode
                      ? "bg-green-50 border-green-400"
                      : "bg-white border-stone-200 hover:border-green-300"
                  }`}
                >
                  <div className={`text-sm font-medium ${quizMode === mode ? "text-green-800" : "text-stone-700"}`}>
                    {label}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Session Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-600">
              Start a Session
            </h3>

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
        </>
      ) : null}
    </div>
  );
}
