"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Species, Category, SessionType, StudyMode, QuizMode, NameDisplay } from "@/lib/types";
import { loadSpeciesData } from "@/lib/species";
import { getCachedLocationSpecies } from "@/lib/inat";
import { getDueCards, getNewCards } from "@/lib/srs";
import CategorySelector from "@/components/CategorySelector";
import ProgressDashboard from "@/components/ProgressDashboard";
import LocationPicker from "@/components/LocationPicker";

export default function HomePage() {
  const router = useRouter();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [quizMode, setQuizMode] = useState<QuizMode>("flashcard");
  const [studyMode, setStudyMode] = useState<StudyMode>("photo");
  const [nameDisplay, setNameDisplay] = useState<NameDisplay>("both");
  const [locationName, setLocationName] = useState<string | null>(null);

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

  const handleSpeciesLoaded = (newSpecies: Species[], name: string) => {
    setSpecies(newSpecies);
    setLocationName(name);
  };

  const dueCount = species.length > 0 ? getDueCards(species, categories).length : 0;
  const newAvailable =
    species.length > 0 ? getNewCards(species, categories, 1).length > 0 : false;

  const hasBirds = species.some((s) => s.category === "bird");

  const startSession = (type: SessionType, mode: StudyMode = studyMode) => {
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("mode", mode);
    if (categories.length > 0) {
      params.set("categories", categories.join(","));
    }
    // Sound mode forces birds category
    if (mode === "sound") {
      params.set("categories", "bird");
    }
    if (quizMode !== "flashcard") {
      params.set("quizMode", quizMode);
    }
    if (nameDisplay !== "both") {
      params.set("nameDisplay", nameDisplay);
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
        <p className="text-xs text-stone-400 mt-1 italic">
          built on the open source{" "}
          <a
            href="https://www.inaturalist.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-green-700 transition-colors"
          >
            iNaturalist API
          </a>
        </p>
      </div>

      {/* Location Picker */}
      <LocationPicker
        onSpeciesLoaded={handleSpeciesLoaded}
        onLoading={setLocationLoading}
      />

      {/* Loading overlay for location fetch */}
      {locationLoading && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 rounded-lg border border-green-200">
          <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-green-700">
            Discovering species near you...
          </span>
        </div>
      )}

      {species.length === 0 && !locationLoading ? (
        <div className="text-center py-8">
          <p className="text-stone-400 text-sm">
            Share your location or search for a place to load species.
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
          <div className="text-center">
            <h3 className="text-sm font-semibold text-stone-600 mb-2">
              Categories
            </h3>
            <CategorySelector selected={categories} onChange={setCategories} />
          </div>

          {/* Start Session */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => startSession("learn")}
                disabled={!newAvailable}
                className="p-3 bg-green-700 text-white rounded-xl text-center hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-sm">Learn</div>
              </button>

              <button
                onClick={() => startSession("review")}
                disabled={dueCount === 0}
                className="p-3 bg-amber-600 text-white rounded-xl text-center hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                <div className="font-semibold text-sm">Review</div>
                {dueCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    {dueCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => startSession("quiz")}
                className="p-3 bg-blue-600 text-white rounded-xl text-center hover:bg-blue-700 transition-colors"
              >
                <div className="font-semibold text-sm">Quiz</div>
              </button>
            </div>
          </div>

          {/* Name Display Toggle */}
          <div className="text-center">
            <h3 className="text-sm font-semibold text-stone-600 mb-2">
              Name Display
            </h3>
            <div className="inline-flex gap-1 bg-stone-100 p-1 rounded-lg">
              {([
                ["common", "Common"],
                ["scientific", "Scientific"],
                ["both", "Both"],
              ] as [NameDisplay, string][]).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setNameDisplay(mode)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    nameDisplay === mode
                      ? "bg-green-700 text-white"
                      : "text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quiz Mode Selection */}
          <div className="text-center">
            <h3 className="text-sm font-semibold text-stone-600 mb-2">
              Quiz Difficulty
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["flashcard", "Flashcard", "Flip to reveal"],
                ["multiple-choice", "Multiple Choice", "Pick from 4 options"],
                ["dropdown", "Dropdown", "Select from list"],
                ["free-response", "Free Response", "Type your answer"],
              ] as [QuizMode, string, string][]).map(([mode, label, desc]) => (
                <button
                  key={mode}
                  onClick={() => setQuizMode(mode)}
                  className={`p-3 rounded-lg text-center transition-colors border ${
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

          {/* Study Mode Selection */}
          <div className="text-center">
            <h3 className="text-sm font-semibold text-stone-600 mb-2">
              Study Mode
            </h3>
            <div className={`grid gap-2 ${hasBirds ? "grid-cols-3" : "grid-cols-2"}`}>
              <button
                onClick={() => setStudyMode("photo")}
                className={`p-3 rounded-lg text-center transition-colors border ${
                  studyMode === "photo"
                    ? "bg-green-50 border-green-400"
                    : "bg-white border-stone-200 hover:border-green-300"
                }`}
              >
                <div className="text-2xl mb-1">📷</div>
                <div className={`text-xs ${studyMode === "photo" ? "text-green-800 font-medium" : "text-stone-600"}`}>Photo ID</div>
              </button>
              <button
                onClick={() => setStudyMode("name")}
                className={`p-3 rounded-lg text-center transition-colors border ${
                  studyMode === "name"
                    ? "bg-green-50 border-green-400"
                    : "bg-white border-stone-200 hover:border-green-300"
                }`}
              >
                <div className="text-2xl mb-1">📝</div>
                <div className={`text-xs ${studyMode === "name" ? "text-green-800 font-medium" : "text-stone-600"}`}>Name Recall</div>
              </button>
              {hasBirds && (
                <button
                  onClick={() => setStudyMode("sound")}
                  className={`p-3 rounded-lg text-center transition-colors border ${
                    studyMode === "sound"
                      ? "bg-green-50 border-green-400"
                      : "bg-white border-stone-200 hover:border-green-300"
                  }`}
                >
                  <div className="text-2xl mb-1">🔊</div>
                  <div className={`text-xs ${studyMode === "sound" ? "text-green-800 font-medium" : "text-stone-600"}`}>Sound ID</div>
                </button>
              )}
            </div>
          </div>

          {/* Progress Dashboard */}
          <ProgressDashboard species={species} />
        </>
      ) : null}

      {/* Footer */}
      <footer className="text-center pt-4 pb-2 border-t border-stone-200 space-y-2">
        {/* Share Button */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: "Naturalist Nurturer",
                text: "Learn the species where you are!",
                url: window.location.href,
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
              alert("Link copied to clipboard!");
            }
          }}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-xs text-stone-600 transition-colors"
        >
          💚 Share This App
        </button>

        {/* App attribution */}
        <p className="text-xs text-stone-400">
          <a
            href="https://github.com/cjpaulphd/Naturalist-Nurturer"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-700 transition-colors"
          >
            NaturalistNurturer
          </a>
          {" by "}
          <a
            href="https://github.com/cjpaulphd"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-700 transition-colors"
          >
            cjpaulphd
          </a>
        </p>

        {/* Data attribution */}
        <p className="text-xs text-stone-400">
          Data:{" "}
          <a href="https://www.inaturalist.org" target="_blank" rel="noopener noreferrer" className="hover:text-green-700 transition-colors">iNaturalist</a>
          {" · "}
          <a href="https://xeno-canto.org" target="_blank" rel="noopener noreferrer" className="hover:text-green-700 transition-colors">Xeno-canto</a>
        </p>

        {/* License / Open Source / Feedback */}
        <p className="text-xs text-stone-400">
          <a
            href="https://github.com/cjpaulphd/Naturalist-Nurturer/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-700 transition-colors"
          >
            MIT License
          </a>
          {" · "}
          <a
            href="https://github.com/cjpaulphd/Naturalist-Nurturer"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-700 transition-colors"
          >
            Open Source
          </a>
          {" · "}
          <a
            href="https://github.com/cjpaulphd/Naturalist-Nurturer/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-700 transition-colors"
          >
            Feedback
          </a>
        </p>
      </footer>
    </div>
  );
}
