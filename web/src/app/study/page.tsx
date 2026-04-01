"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Species,
  Category,
  SessionType,
  StudyMode,
  Rating,
} from "@/lib/types";
import { loadSpeciesData, getSpeciesById } from "@/lib/species";
import {
  getNewCards,
  getDueCards,
  getQuizCards,
  rateCard,
} from "@/lib/srs";
import PhotoGallery from "@/components/PhotoGallery";
import SoundPlayer from "@/components/SoundPlayer";

const LEARN_COUNT = 10;
const QUIZ_COUNT = 15;

const RATING_BUTTONS: { rating: Rating; label: string; color: string }[] = [
  { rating: "again", label: "Again", color: "bg-red-600 hover:bg-red-700" },
  { rating: "hard", label: "Hard", color: "bg-orange-500 hover:bg-orange-600" },
  { rating: "good", label: "Good", color: "bg-green-600 hover:bg-green-700" },
  { rating: "easy", label: "Easy", color: "bg-blue-600 hover:bg-blue-700" },
];

function StudyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionType = (searchParams.get("type") || "learn") as SessionType;
  const studyMode = (searchParams.get("mode") || "mixed") as StudyMode;
  const categoryParam = searchParams.get("categories");
  const categories: Category[] = categoryParam
    ? (categoryParam.split(",") as Category[])
    : [];

  const [allSpecies, setAllSpecies] = useState<Species[]>([]);
  const [cardIds, setCardIds] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [currentMode, setCurrentMode] = useState<StudyMode>(studyMode);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  useEffect(() => {
    loadSpeciesData().then((data) => {
      setAllSpecies(data);

      let ids: number[];
      switch (sessionType) {
        case "learn":
          ids = getNewCards(data, categories, LEARN_COUNT);
          break;
        case "review":
          ids = getDueCards(data, categories);
          break;
        case "quiz":
          ids = getQuizCards(data, categories, QUIZ_COUNT);
          break;
        default:
          ids = getNewCards(data, categories, LEARN_COUNT);
      }

      setCardIds(ids);
      setSessionStats((s) => ({ ...s, total: ids.length }));
      setLoading(false);

      if (studyMode === "mixed" && ids.length > 0) {
        setCurrentMode(pickRandomMode(data, ids[0]));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickRandomMode = useCallback(
    (species: Species[], speciesId: number): StudyMode => {
      const sp = getSpeciesById(species, speciesId);
      const modes: StudyMode[] = ["photo", "name"];
      if (sp?.sounds && sp.sounds.length > 0) {
        modes.push("sound");
      }
      return modes[Math.floor(Math.random() * modes.length)];
    },
    []
  );

  const currentSpecies =
    cardIds.length > 0
      ? getSpeciesById(allSpecies, cardIds[currentIndex])
      : undefined;

  const handleFlip = () => setFlipped(true);

  const handleRate = (rating: Rating) => {
    if (!currentSpecies) return;

    rateCard(currentSpecies.id, rating);
    setSessionStats((s) => ({ ...s, [rating]: s[rating] + 1 }));

    const nextIndex = currentIndex + 1;
    if (nextIndex >= cardIds.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(nextIndex);
      setFlipped(false);
      if (studyMode === "mixed") {
        setCurrentMode(pickRandomMode(allSpecies, cardIds[nextIndex]));
      }
    }
  };

  const handleSkip = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= cardIds.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(nextIndex);
      setFlipped(false);
      if (studyMode === "mixed") {
        setCurrentMode(pickRandomMode(allSpecies, cardIds[nextIndex]));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cardIds.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-4xl mb-4">✅</p>
        <h2 className="text-xl font-bold text-stone-800 mb-2">
          {sessionType === "review"
            ? "No cards due for review!"
            : "No new cards available"}
        </h2>
        <p className="text-stone-500 text-sm mb-4">
          {sessionType === "review"
            ? "Great job! Come back later for more reviews."
            : "You've learned all available cards in this category."}
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-4xl mb-4">🎉</p>
        <h2 className="text-xl font-bold text-stone-800 mb-4">
          Session Complete!
        </h2>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 mb-6 text-left">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-stone-500">Cards studied:</span>
              <span className="ml-2 font-semibold">{sessionStats.total}</span>
            </div>
            <div>
              <span className="text-green-600">Easy:</span>
              <span className="ml-2 font-semibold">{sessionStats.easy}</span>
            </div>
            <div>
              <span className="text-green-600">Good:</span>
              <span className="ml-2 font-semibold">{sessionStats.good}</span>
            </div>
            <div>
              <span className="text-orange-500">Hard:</span>
              <span className="ml-2 font-semibold">{sessionStats.hard}</span>
            </div>
            <div>
              <span className="text-red-500">Again:</span>
              <span className="ml-2 font-semibold">{sessionStats.again}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300"
          >
            Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800"
          >
            Study More
          </button>
        </div>
      </div>
    );
  }

  if (!currentSpecies) return null;

  const activeMode = studyMode === "mixed" ? currentMode : studyMode;
  const progress = ((currentIndex + 1) / cardIds.length) * 100;

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.push("/")}
          className="text-stone-400 hover:text-stone-600 text-sm"
        >
          ✕
        </button>
        <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-stone-500">
          {currentIndex + 1}/{cardIds.length}
        </span>
      </div>

      {/* Flashcard */}
      <div className="card-flip">
        <div className={`card-flip-inner ${flipped ? "flipped" : ""}`}>
          {/* Front */}
          <div className={`card-face ${flipped ? "hidden" : ""}`}>
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              {/* Card front content based on mode */}
              {activeMode === "photo" && (
                <div>
                  <PhotoGallery
                    speciesId={currentSpecies.id}
                    photos={currentSpecies.photos}
                    showAttribution={false}
                  />
                  <div className="p-4 text-center">
                    <p className="text-lg font-semibold text-stone-700">
                      What species is this?
                    </p>
                    <p className="text-sm text-stone-400 mt-1">
                      Tap to reveal the answer
                    </p>
                  </div>
                </div>
              )}

              {activeMode === "name" && (
                <div className="p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-stone-800">
                    {currentSpecies.commonName}
                  </p>
                  <p className="text-stone-400 italic mt-2">
                    {currentSpecies.scientificName}
                  </p>
                  <p className="text-sm text-stone-500 mt-6">
                    Can you describe this species?
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Think: appearance, habitat, identifying features
                  </p>
                </div>
              )}

              {activeMode === "sound" && (
                <div className="p-6 min-h-[300px] flex flex-col items-center justify-center">
                  <p className="text-4xl mb-4">🔊</p>
                  <p className="text-lg font-semibold text-stone-700 mb-4">
                    What bird is this?
                  </p>
                  {currentSpecies.sounds.length > 0 ? (
                    <SoundPlayer
                      speciesId={currentSpecies.id}
                      sounds={currentSpecies.sounds}
                    />
                  ) : (
                    <p className="text-sm text-stone-400">
                      No sound available for this species
                    </p>
                  )}
                  <p className="text-sm text-stone-400 mt-4">
                    Listen and tap to reveal
                  </p>
                </div>
              )}

              {/* Tap to flip */}
              <button
                onClick={handleFlip}
                className="w-full py-3 bg-green-700 text-white font-medium hover:bg-green-800 transition-colors"
              >
                Show Answer
              </button>
            </div>
          </div>

          {/* Back */}
          <div className={`card-back ${!flipped ? "hidden" : ""}`}>
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              {/* Always show photo on back */}
              {currentSpecies.photos.length > 0 && activeMode !== "photo" && (
                <PhotoGallery
                  speciesId={currentSpecies.id}
                  photos={currentSpecies.photos}
                />
              )}
              {activeMode === "photo" && (
                <PhotoGallery
                  speciesId={currentSpecies.id}
                  photos={currentSpecies.photos}
                />
              )}

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-xl font-bold text-stone-800">
                    {currentSpecies.commonName}
                  </h3>
                  <p className="text-sm italic text-stone-500">
                    {currentSpecies.scientificName}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                    {currentSpecies.category === "tree"
                      ? "Tree"
                      : currentSpecies.category === "plant"
                      ? "Plant"
                      : "Bird"}
                  </span>
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs">
                    {currentSpecies.family}
                  </span>
                </div>

                {currentSpecies.keyFacts.length > 0 && (
                  <ul className="text-sm text-stone-600 space-y-1">
                    {currentSpecies.keyFacts.map((fact, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-green-600 flex-shrink-0">
                          &#8226;
                        </span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {currentSpecies.identificationTips && (
                  <p className="text-sm text-stone-600 bg-amber-50 p-2 rounded">
                    <strong className="text-amber-700">Tip:</strong>{" "}
                    {currentSpecies.identificationTips}
                  </p>
                )}

                {currentSpecies.sounds.length > 0 &&
                  activeMode !== "sound" && (
                    <SoundPlayer
                      speciesId={currentSpecies.id}
                      sounds={currentSpecies.sounds}
                    />
                  )}
              </div>

              {/* Rating buttons */}
              <div className="p-3 border-t border-stone-100">
                <p className="text-xs text-stone-500 text-center mb-2">
                  How well did you know this?
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {RATING_BUTTONS.map((btn) => (
                    <button
                      key={btn.rating}
                      onClick={() => handleRate(btn.rating)}
                      className={`py-2.5 rounded-lg text-white text-sm font-medium ${btn.color} transition-colors`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSkip}
                  className="w-full mt-2 py-1.5 text-xs text-stone-400 hover:text-stone-600"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StudyContent />
    </Suspense>
  );
}
