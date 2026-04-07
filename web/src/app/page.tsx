"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Species, Category, SessionType, StudyMode, QuizMode, QuizDifficulty, NameDisplay } from "@/lib/types";
import { loadSpeciesData } from "@/lib/species";
import { getCachedLocationSpecies, getLastLocation } from "@/lib/inat";
import { getNewCards, getDueCards, getAllLearnedCards, getLearnedCount } from "@/lib/srs";
import { CATEGORIES } from "@/lib/categories";
import { getStorage, setStorage } from "@/lib/storage";
import CategorySelector from "@/components/CategorySelector";
import LocationPicker from "@/components/LocationPicker";
import QuizSettingsModal from "@/components/QuizSettingsModal";
import WelcomePopup from "@/components/WelcomePopup";
import InstallPrompt from "@/components/InstallPrompt";
import ShareButton from "@/components/ShareButton";

export default function HomePage() {
  const router = useRouter();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>(["tree"]);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [showQuizSettings, setShowQuizSettings] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [animations, setAnimations] = useState(true);

  useEffect(() => {
    if (!getStorage<boolean>("welcome_seen", false)) {
      setShowWelcome(true);
    }
    setAnimations(getStorage("animations", true));
  }, []);

  useEffect(() => {
    const cached = getCachedLocationSpecies();
    if (cached && cached.length > 0) {
      setSpecies(cached);
      const last = getLastLocation();
      if (last?.name) setLocationName(last.name);
      setLoading(false);
    } else {
      loadSpeciesData().then((data) => {
        setSpecies(data);
        setLocationName("Green River Preserve, NC");
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

  const hasAnyForCategory = species.length > 0 && species.some(
    (s) => categories.length === 0 || categories.includes(s.category)
  );

  // Compute per-category new (unlearned) species counts
  const newCountsByCategory = useMemo(() => {
    if (species.length === 0) return undefined;
    const counts = {} as Record<Category, number>;
    for (const cat of CATEGORIES) {
      counts[cat.value] = getNewCards(species, [cat.value], Infinity).length;
    }
    return counts;
  }, [species]);

  // Compute per-category learned and total counts for ratio display
  const learnedCountsByCategory = useMemo(() => {
    if (species.length === 0) return undefined;
    const counts = {} as Record<Category, number>;
    for (const cat of CATEGORIES) {
      counts[cat.value] = getLearnedCount(species, cat.value);
    }
    return counts;
  }, [species]);

  const totalCountsByCategory = useMemo(() => {
    if (species.length === 0) return undefined;
    const counts = {} as Record<Category, number>;
    for (const cat of CATEGORIES) {
      counts[cat.value] = species.filter((s) => s.category === cat.value).length;
    }
    return counts;
  }, [species]);

  // Global check: any new species across all categories?
  const hasAnyNew = species.length > 0 && getNewCards(species, [], 1).length > 0;
  const hasAnyDue = species.length > 0 && getDueCards(species, []).length > 0;
  const hasAnyLearned = species.length > 0 && getAllLearnedCards(species, []).length > 0;
  const canLearn = hasAnyNew || hasAnyDue || hasAnyLearned;

  const [learnToast, setLearnToast] = useState<string | null>(null);

  const hasBirds = species.some((s) => s.category === "bird");

  const startLearn = () => {
    const params = new URLSearchParams();
    let effectiveCategories = categories;

    // Check if current selection has new species
    const hasNewInCurrent = species.length > 0 && getNewCards(species, categories, 1).length > 0;

    if (!hasNewInCurrent && hasAnyNew) {
      // Auto-switch to a category that has new species
      const nextCat = CATEGORIES.find(
        (cat) => newCountsByCategory && newCountsByCategory[cat.value] > 0
      );
      if (nextCat) {
        effectiveCategories = [nextCat.value];
        setCategories(effectiveCategories);
        const currentLabel = categories.length === 1
          ? CATEGORIES.find(c => c.value === categories[0])?.label?.toLowerCase()
          : "species";
        setLearnToast(`All ${currentLabel} learned! Switching to ${nextCat.label.toLowerCase()}.`);
        setTimeout(() => setLearnToast(null), 3000);
      }
    }

    if (getNewCards(species, effectiveCategories, 1).length > 0) {
      params.set("type", "learn");
    } else if (getDueCards(species, effectiveCategories).length > 0) {
      params.set("type", "review");
      params.set("fallback", "true");
    } else if (getAllLearnedCards(species, effectiveCategories).length > 0) {
      params.set("type", "review-all");
      params.set("fallback", "true");
    } else {
      return;
    }
    params.set("mode", "photo");
    if (effectiveCategories.length > 0) {
      params.set("categories", effectiveCategories.join(","));
    }
    router.push(`/study?${params.toString()}`);
  };

  const startQuiz = (quizMode: QuizMode, nameDisplay: NameDisplay, studyMode: StudyMode, difficulty: QuizDifficulty) => {
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
    if (difficulty !== "medium") {
      params.set("difficulty", difficulty);
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
            disabled={!canLearn}
            className={`p-3 text-white rounded-xl text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-700 hover:bg-green-800`}
          >
            <div className="font-semibold text-sm">Learn</div>
          </button>

          <button
            onClick={() => setShowQuizSettings(true)}
            disabled={!hasAnyForCategory}
            className="p-3 bg-blue-600 text-white rounded-xl text-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="font-semibold text-sm">Challenge</div>
          </button>
        </div>
      )}

      {/* Ephemeral toast for auto-category switch */}
      {learnToast && (
        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center -mt-3 animate-fade-in">
          {learnToast}
        </div>
      )}

      {/* Location Picker */}
      <LocationPicker
        onSpeciesLoaded={handleSpeciesLoaded}
        onLoading={setLocationLoading}
      />

      {/* Loading overlay for location fetch */}
      {locationLoading && (
        <div className="flex flex-col items-center justify-center gap-1 px-4 py-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-green-700">
              Discovering species near you...
            </span>
          </div>
          <span className="text-xs text-green-600">
            This may take a minute...
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
            <CategorySelector
              selected={categories}
              onChange={setCategories}
              newCounts={newCountsByCategory}
              learnedCounts={learnedCountsByCategory}
              totalCounts={totalCountsByCategory}
            />
          </div>
        </>
      ) : null}

      {/* Welcome Popup */}
      {showWelcome && (
        <WelcomePopup
          onClose={() => {
            setShowWelcome(false);
            setStorage("welcome_seen", true);
          }}
        />
      )}

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
        {/* Animations Toggle */}
        <button
          onClick={() => {
            const next = !animations;
            setAnimations(next);
            setStorage("animations", next);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-xs text-stone-600 transition-colors"
        >
          🍂 Animations {animations ? "On" : "Off"}
        </button>

        {/* Add to Home Screen */}
        <InstallPrompt />

        {/* Share Button */}
        <ShareButton />

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
          Made for{" "}
          <a
            href="https://www.greenriverpreserve.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 underline hover:text-green-800 transition-colors"
          >
            Green River Preserve
          </a>
          , a 3,400 acre nature camp in the Blue Ridge Mountains of North
          Carolina, and all who want to better know their neighbors.
        </p>

        {/* Data attribution */}
        <p className="text-xs text-stone-400">
          Data:{" "}
          <a href="https://www.inaturalist.org" target="_blank" rel="noopener noreferrer" className="hover:text-green-700 transition-colors">iNaturalist</a>
          {" · "}
          <a href="https://www.wikipedia.org" target="_blank" rel="noopener noreferrer" className="hover:text-green-700 transition-colors">Wikipedia</a>
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
          {" · "}
          <button
            onClick={() => setShowWelcome(true)}
            className="hover:text-green-700 transition-colors"
          >
            Welcome Page
          </button>
        </p>
      </footer>
    </div>
  );
}
