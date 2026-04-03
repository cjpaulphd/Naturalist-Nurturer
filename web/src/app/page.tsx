"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Species, Category, SessionType, StudyMode, QuizMode, NameDisplay } from "@/lib/types";
import { loadSpeciesData } from "@/lib/species";
import { getCachedLocationSpecies } from "@/lib/inat";
import { getNewCards } from "@/lib/srs";
import CategorySelector from "@/components/CategorySelector";
import LocationPicker from "@/components/LocationPicker";
import QuizSettingsModal from "@/components/QuizSettingsModal";

export default function HomePage() {
  const router = useRouter();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>(["tree"]);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [showQuizSettings, setShowQuizSettings] = useState(false);

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

  // Preload species photos so Learn/Quiz work instantly
  useEffect(() => {
    if (species.length === 0) return;
    for (const sp of species) {
      for (const photo of sp.photos) {
        const src = photo.filename
          ? `/data/photos/${sp.id}/${photo.filename}`
          : photo.url;
        if (src) {
          const img = new Image();
          img.src = src;
        }
      }
    }
  }, [species]);

  const handleSpeciesLoaded = (newSpecies: Species[], name: string) => {
    setSpecies(newSpecies);
    setLocationName(name);
  };

  const newAvailable =
    species.length > 0 ? getNewCards(species, categories, 1).length > 0 : false;

  const hasBirds = species.some((s) => s.category === "bird");

  const startLearn = () => {
    const params = new URLSearchParams();
    params.set("type", "learn");
    params.set("mode", "photo");
    if (categories.length > 0) {
      params.set("categories", categories.join(","));
    }
    router.push(`/study?${params.toString()}`);
  };

  const startQuiz = (quizMode: QuizMode, nameDisplay: NameDisplay, studyMode: StudyMode) => {
    const params = new URLSearchParams();
    params.set("type", "quiz");
    params.set("mode", studyMode);
    if (categories.length > 0) {
      params.set("categories", categories.join(","));
    }
    if (studyMode === "sound") {
      params.set("categories", "bird");
    }
    if (quizMode !== "flashcard") {
      params.set("quizMode", quizMode);
    }
    if (nameDisplay !== "both") {
      params.set("nameDisplay", nameDisplay);
    }
    setShowQuizSettings(false);
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
          Built on the open source{" "}
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

      {/* Learn & Quiz buttons — above location search */}
      {species.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={startLearn}
            disabled={!newAvailable}
            className="p-3 bg-green-700 text-white rounded-xl text-center hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="font-semibold text-sm">Learn</div>
          </button>

          <button
            onClick={() => setShowQuizSettings(true)}
            className="p-3 bg-blue-600 text-white rounded-xl text-center hover:bg-blue-700 transition-colors"
          >
            <div className="font-semibold text-sm">Quiz</div>
          </button>
        </div>
      )}

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
        </>
      ) : null}

      {/* Quiz Settings Modal */}
      {showQuizSettings && (
        <QuizSettingsModal
          hasBirds={hasBirds}
          onStart={startQuiz}
          onClose={() => setShowQuizSettings(false)}
        />
      )}

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
        <p className="text-xs text-stone-400">
          For{" "}
          <a
            href="https://www.greenriverpreserve.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 underline hover:text-green-800 transition-colors"
          >
            Green River Preserve
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
