"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Species,
  Category,
  SessionType,
  StudyMode,
  QuizMode,
  NameDisplay,
  Rating,
} from "@/lib/types";
import { loadSpeciesData, getSpeciesById } from "@/lib/species";
import { getCachedLocationSpecies, fetchBirdSounds, updateCachedSpeciesSounds } from "@/lib/inat";
import {
  getNewCards,
  getDueCards,
  getAllLearnedCards,
  getQuizCards,
  rateCard,
} from "@/lib/srs";
import PhotoGallery from "@/components/PhotoGallery";
import SoundPlayer from "@/components/SoundPlayer";
import TaxonomyChart from "@/components/TaxonomyChart";

const LEARN_COUNT = 10;
const QUIZ_COUNT = 15;

const RATING_BUTTONS: { rating: Rating; label: string; color: string }[] = [
  { rating: "again", label: "Again", color: "bg-red-600 hover:bg-red-700" },
  { rating: "hard", label: "Hard", color: "bg-orange-500 hover:bg-orange-600" },
  { rating: "good", label: "Good", color: "bg-green-600 hover:bg-green-700" },
  { rating: "easy", label: "Easy", color: "bg-blue-600 hover:bg-blue-700" },
];

// Format species name based on display preference
function formatName(species: Species, display: NameDisplay): string {
  switch (display) {
    case "common":
      return species.commonName;
    case "scientific":
      return species.scientificName;
    case "both":
    default:
      return species.commonName;
  }
}

function formatNameSecondary(species: Species, display: NameDisplay): string | null {
  if (display === "both") return species.scientificName;
  return null;
}

// Generate multiple-choice options: correct answer + 3 distractors from SAME category only
function generateChoices(
  correctSpecies: Species,
  allSpecies: Species[],
  count: number = 4
): Species[] {
  const sameCategory = allSpecies.filter(
    (s) => s.category === correctSpecies.category && s.id !== correctSpecies.id
  );
  const shuffled = [...sameCategory].sort(() => Math.random() - 0.5);
  const distractors = shuffled.slice(0, count - 1);
  const choices = [correctSpecies, ...distractors].sort(() => Math.random() - 0.5);
  return choices;
}

function StudyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionType = (searchParams.get("type") || "learn") as SessionType;
  const isFallbackReview = searchParams.get("fallback") === "true";
  // Learn mode always uses photo on the front (card shows photo, user identifies)
  const studyMode = (sessionType === "learn"
    ? "photo"
    : searchParams.get("mode") || "mixed") as StudyMode;
  const quizMode = (searchParams.get("quizMode") || "flashcard") as QuizMode;
  const nameDisplay = (searchParams.get("nameDisplay") || "both") as NameDisplay;
  const categoryParam = searchParams.get("categories");
  const categories: Category[] = categoryParam
    ? (categoryParam.split(",") as Category[])
    : [];

  const [showFallbackBanner, setShowFallbackBanner] = useState(isFallbackReview);

  const [allSpecies, setAllSpecies] = useState<Species[]>([]);
  const [cardIds, setCardIds] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [currentMode, setCurrentMode] = useState<StudyMode>(studyMode);

  // Quiz mode state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [freeResponseInput, setFreeResponseInput] = useState("");
  const [dropdownValue, setDropdownValue] = useState("");
  const [isCorrect, setIsCorrect] = useState<"correct" | "partial" | "incorrect" | null>(null);
  const [showRatingOptions, setShowRatingOptions] = useState(false);

  // Swipe gesture state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState(0);

  const [sessionStats, setSessionStats] = useState({
    total: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    correct: 0,
    partial: 0,
    incorrect: 0,
  });

  // Track which bird species we've already attempted to fetch sounds for
  const soundFetchedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const cached = getCachedLocationSpecies();
    const dataPromise = cached && cached.length > 0 ? Promise.resolve(cached) : loadSpeciesData();

    dataPromise.then((data) => {
      setAllSpecies(data);

      let ids: number[];
      switch (sessionType) {
        case "learn":
          ids = getNewCards(data, categories, LEARN_COUNT);
          break;
        case "review":
          ids = getDueCards(data, categories);
          break;
        case "review-all":
          ids = getAllLearnedCards(data, categories);
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
      const modes: StudyMode[] = ["name"];
      // Photo mode only if species has photos
      if (sp?.photos && sp.photos.length > 0) {
        modes.push("photo");
      }
      // Sound mode only for birds with sounds
      if (sp?.category === "bird" && sp?.sounds && sp.sounds.length > 0) {
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

  // Fetch bird sounds on-demand when a bird card is displayed
  useEffect(() => {
    if (!currentSpecies) return;
    if (currentSpecies.category !== "bird") return;
    if (currentSpecies.sounds && currentSpecies.sounds.length > 0) return;
    if (soundFetchedRef.current.has(currentSpecies.id)) return;

    soundFetchedRef.current.add(currentSpecies.id);

    fetchBirdSounds([{ id: currentSpecies.id, scientificName: currentSpecies.scientificName }])
      .then((soundMap) => {
        const sounds = soundMap.get(currentSpecies.id);
        if (sounds && sounds.length > 0) {
          setAllSpecies((prev) =>
            prev.map((s) => (s.id === currentSpecies.id ? { ...s, sounds } : s))
          );
          updateCachedSpeciesSounds(soundMap);
        }
      })
      .catch(() => {
        // Sounds are optional
      });
  }, [currentSpecies]);

  // Generate choices for current card - same category only
  const choices = useMemo(() => {
    if (!currentSpecies || quizMode === "flashcard") return [];
    return generateChoices(currentSpecies, allSpecies);
  }, [currentSpecies, allSpecies, quizMode]);

  // Dropdown options - same category only, sorted
  const dropdownOptions = useMemo(() => {
    if (!currentSpecies) return [];
    return [...allSpecies]
      .filter((s) => s.category === currentSpecies.category)
      .sort((a, b) => a.commonName.localeCompare(b.commonName));
  }, [allSpecies, currentSpecies]);

  const handleFlip = () => setFlipped(true);

  const resetQuizState = () => {
    setSelectedAnswer(null);
    setAnswerSubmitted(false);
    setFreeResponseInput("");
    setDropdownValue("");
    setIsCorrect(null);
  };

  // Check if user input shares any significant word (3+ chars) with the answer
  const hasPartialWordMatch = (input: string, answer: string): boolean => {
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[-]/g, " ").split(/\s+/).filter((w) => w.length >= 3);
    const inputWords = normalize(input);
    const answerWords = normalize(answer);
    return inputWords.some((iw) => answerWords.some((aw) => iw === aw));
  };

  const handleSubmitAnswer = () => {
    if (!currentSpecies) return;

    let result: "correct" | "partial" | "incorrect" = "incorrect";
    if (quizMode === "multiple-choice") {
      result = selectedAnswer === currentSpecies.id ? "correct" : "incorrect";
    } else if (quizMode === "dropdown") {
      result = dropdownValue === String(currentSpecies.id) ? "correct" : "incorrect";
    } else if (quizMode === "free-response") {
      const input = freeResponseInput.trim().toLowerCase();
      const commonName = currentSpecies.commonName.toLowerCase();
      const sciName = currentSpecies.scientificName.toLowerCase();
      if (input === commonName || input === sciName) {
        result = "correct";
      } else if (
        hasPartialWordMatch(input, currentSpecies.commonName) ||
        hasPartialWordMatch(input, currentSpecies.scientificName)
      ) {
        result = "partial";
      }
    }

    setIsCorrect(result);
    setAnswerSubmitted(true);
    setFlipped(true);

    setSessionStats((s) => ({
      ...s,
      correct: result === "correct" ? s.correct + 1 : s.correct,
      partial: result === "partial" ? s.partial + 1 : s.partial,
      incorrect: result === "incorrect" ? s.incorrect + 1 : s.incorrect,
    }));
  };

  const advanceToNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= cardIds.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(nextIndex);
      setFlipped(false);
      resetQuizState();
      setShowRatingOptions(false);
      if (studyMode === "mixed") {
        setCurrentMode(pickRandomMode(allSpecies, cardIds[nextIndex]));
      }
    }
  }, [currentIndex, cardIds, studyMode, allSpecies, pickRandomMode]);

  // Auto-skip cards that require a photo but have none
  const activeModePrelim = studyMode === "mixed" ? currentMode : studyMode;
  useEffect(() => {
    if (
      currentSpecies &&
      activeModePrelim === "photo" &&
      currentSpecies.photos.length === 0
    ) {
      advanceToNext();
    }
  }, [currentSpecies, activeModePrelim, advanceToNext]);

  const handleRate = (rating: Rating) => {
    if (!currentSpecies) return;

    rateCard(currentSpecies.id, rating, currentSpecies.category);
    setSessionStats((s) => ({ ...s, [rating]: s[rating] + 1 }));
    advanceToNext();
  };

  const handleNext = () => {
    if (!currentSpecies) return;
    // Default to "good" rating when using Next button or swipe
    rateCard(currentSpecies.id, "good", currentSpecies.category);
    setSessionStats((s) => ({ ...s, good: s.good + 1 }));
    advanceToNext();
  };

  const handleSkip = () => {
    advanceToNext();
  };

  // Swipe gesture handlers
  const SWIPE_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchDeltaX(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;
    const delta = e.touches[0].clientX - touchStartX;
    // Only track leftward swipes (negative delta) when card is flipped
    if (flipped) {
      setTouchDeltaX(delta);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX === null) return;
    if (flipped && touchDeltaX < -SWIPE_THRESHOLD) {
      // Swiped left while viewing answer → advance with "good" rating
      handleNext();
    }
    setTouchStartX(null);
    setTouchDeltaX(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cardIds.length === 0) {
    const hasNew = getNewCards(allSpecies, categories, 1).length > 0;
    const hasDue = getDueCards(allSpecies, categories).length > 0;
    const hasLearned = getAllLearnedCards(allSpecies, categories).length > 0;

    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-4xl mb-4">✅</p>
        <h2 className="text-xl font-bold text-stone-800 mb-2">
          {sessionType === "review" || sessionType === "review-all"
            ? "No cards due for review!"
            : "No new cards available"}
        </h2>
        <p className="text-stone-500 text-sm mb-4">
          {sessionType === "review" || sessionType === "review-all"
            ? "Great job! Come back later for more reviews."
            : "You've learned all available cards in this category."}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          {hasNew && sessionType !== "learn" && (
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("type", "learn");
                params.delete("fallback");
                router.push(`/study?${params.toString()}`);
              }}
              className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800"
            >
              Learn New
            </button>
          )}
          {hasDue && sessionType !== "review" && (
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("type", "review");
                params.delete("fallback");
                router.push(`/study?${params.toString()}`);
              }}
              className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800"
            >
              Review Due
            </button>
          )}
          {hasLearned && sessionType !== "review-all" && (
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("type", "review-all");
                params.delete("fallback");
                router.push(`/study?${params.toString()}`);
              }}
              className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              Review All
            </button>
          )}
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    const showQuizStats = quizMode !== "flashcard";
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-4xl mb-4">🎉</p>
        <h2 className="text-xl font-bold text-stone-800 mb-4">
          Session Complete!
        </h2>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 mb-6">
          <div className="grid grid-cols-2 gap-3 text-sm text-center">
            <div>
              <span className="text-stone-500">Cards studied:</span>
              <span className="ml-2 font-semibold">{sessionStats.total}</span>
            </div>
            {showQuizStats ? (
              <>
                <div>
                  <span className="text-green-600">Correct:</span>
                  <span className="ml-2 font-semibold">{sessionStats.correct}</span>
                </div>
                {sessionStats.partial > 0 && (
                  <div>
                    <span className="text-yellow-600">Partial:</span>
                    <span className="ml-2 font-semibold">{sessionStats.partial}</span>
                  </div>
                )}
                <div>
                  <span className="text-red-500">Incorrect:</span>
                  <span className="ml-2 font-semibold">{sessionStats.incorrect}</span>
                </div>
                <div>
                  <span className="text-stone-500">Score:</span>
                  <span className="ml-2 font-semibold">
                    {sessionStats.total > 0
                      ? Math.round(
                          ((sessionStats.correct + sessionStats.partial * 0.5) / sessionStats.total) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => {
              const hasNew = getNewCards(allSpecies, categories, 1).length > 0;
              if (hasNew) {
                // More new cards available — reload to start a new learn session
                window.location.reload();
              } else {
                // No new cards — fall back to review
                const hasDue = getDueCards(allSpecies, categories).length > 0;
                const params = new URLSearchParams(searchParams.toString());
                if (hasDue) {
                  params.set("type", "review");
                } else {
                  params.set("type", "review-all");
                }
                params.set("fallback", "true");
                router.push(`/study?${params.toString()}`);
              }
            }}
            className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800"
          >
            {getNewCards(allSpecies, categories, 1).length > 0 ? "Meet More" : "Review"}
          </button>
          <button
            onClick={() => router.push("/progress")}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            Growth
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300"
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  if (!currentSpecies) return null;

  // Fall back to photo mode if sound mode but species has no sounds
  const rawMode = studyMode === "mixed" ? currentMode : studyMode;
  const activeMode =
    rawMode === "sound" && (!currentSpecies.sounds || currentSpecies.sounds.length === 0)
      ? "photo"
      : rawMode;
  const progress = ((currentIndex + 1) / cardIds.length) * 100;
  const isHardMode = quizMode !== "flashcard";

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

      {/* Fallback review banner */}
      {showFallbackBanner && (
        <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            {sessionType === "review"
              ? "No new species to learn \u2014 reviewing due cards instead."
              : "No new species to learn \u2014 reviewing what you know."}
          </p>
          <button
            onClick={() => setShowFallbackBanner(false)}
            className="text-amber-400 hover:text-amber-600 text-sm flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quiz mode badge */}
      {isHardMode && (
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
            {quizMode === "multiple-choice"
              ? "Multiple Choice"
              : quizMode === "dropdown"
              ? "Dropdown"
              : "Free Response"}
          </span>
          {isHardMode && sessionStats.correct + sessionStats.partial + sessionStats.incorrect > 0 && (
            <span className="text-xs text-stone-400">
              {sessionStats.correct}/{sessionStats.correct + sessionStats.partial + sessionStats.incorrect} correct
              {sessionStats.partial > 0 && `, ${sessionStats.partial} partial`}
            </span>
          )}
        </div>
      )}

      {/* Flashcard */}
      <div
        className="card-flip"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: touchDeltaX < 0 && flipped ? `translateX(${touchDeltaX}px)` : undefined,
          opacity: touchDeltaX < -SWIPE_THRESHOLD && flipped ? 0.6 : 1,
          transition: touchStartX !== null ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
        }}
      >
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
                  />
                  <div className="p-4 text-center">
                    <p className="text-lg font-semibold text-stone-700">
                      Who is this?
                    </p>
                    {isHardMode && (
                      <p className="text-sm text-stone-400 mt-1">
                        Choose your answer below
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeMode === "name" && (
                <div className="p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-stone-800">
                    {formatName(currentSpecies, nameDisplay)}
                  </p>
                  {formatNameSecondary(currentSpecies, nameDisplay) && (
                    <p className="text-stone-400 italic mt-2">
                      {formatNameSecondary(currentSpecies, nameDisplay)}
                    </p>
                  )}
                  <p className="text-sm text-stone-500 mt-6">
                    Can you describe this species?
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Think: appearance, habitat, identifying features
                  </p>
                </div>
              )}

              {activeMode === "sound" && (
                <div className="p-6 min-h-[300px] flex flex-col items-center justify-center text-center">
                  <p className="text-4xl mb-4">🔊</p>
                  <p className="text-lg font-semibold text-stone-700 mb-4">
                    Who is this?
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
                  {isHardMode && (
                    <p className="text-sm text-stone-400 mt-4">
                      Choose your answer below
                    </p>
                  )}
                </div>
              )}

              {/* Quiz answer area */}
              {/* Quiz answer area for hard modes (not name mode) */}
              {isHardMode && activeMode !== "name" && (
                <div className="p-4 border-t border-stone-100 space-y-3">
                  {/* Multiple Choice */}
                  {quizMode === "multiple-choice" && (
                    <div className="grid grid-cols-1 gap-2">
                      {choices.map((choice) => (
                        <button
                          key={choice.id}
                          onClick={() => {
                            if (answerSubmitted) return;
                            setSelectedAnswer(choice.id);
                            const result = choice.id === currentSpecies?.id ? "correct" : "incorrect";
                            setIsCorrect(result);
                            setAnswerSubmitted(true);
                            setFlipped(true);
                            setSessionStats((s) => ({
                              ...s,
                              correct: result === "correct" ? s.correct + 1 : s.correct,
                              incorrect: result === "incorrect" ? s.incorrect + 1 : s.incorrect,
                            }));
                          }}
                          disabled={answerSubmitted}
                          className={`p-3 rounded-lg text-center text-sm transition-colors border ${
                            selectedAnswer === choice.id
                              ? "bg-green-50 border-green-400 text-green-800"
                              : "bg-white border-stone-200 text-stone-700 hover:border-stone-400"
                          }${answerSubmitted ? " cursor-not-allowed opacity-75" : ""}`}
                        >
                          <span>{formatName(choice, nameDisplay)}</span>
                          {formatNameSecondary(choice, nameDisplay) && (
                            <span className="text-xs text-stone-400 italic ml-2">
                              ({formatNameSecondary(choice, nameDisplay)})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Dropdown */}
                  {quizMode === "dropdown" && (
                    <select
                      value={dropdownValue}
                      onChange={(e) => setDropdownValue(e.target.value)}
                      className="w-full p-3 rounded-lg border border-stone-300 bg-white text-stone-700 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      <option value="">Select a species...</option>
                      {dropdownOptions.map((sp) => {
                        const primary = formatName(sp, nameDisplay);
                        const secondary = formatNameSecondary(sp, nameDisplay);
                        return (
                          <option key={sp.id} value={String(sp.id)}>
                            {primary}{secondary ? ` (${secondary})` : ""}
                          </option>
                        );
                      })}
                    </select>
                  )}

                  {/* Free Response */}
                  {quizMode === "free-response" && (
                    <div>
                      <input
                        type="text"
                        value={freeResponseInput}
                        onChange={(e) => setFreeResponseInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && freeResponseInput.trim()) {
                            handleSubmitAnswer();
                          }
                        }}
                        placeholder={
                          nameDisplay === "common"
                            ? "Type common name..."
                            : nameDisplay === "scientific"
                            ? "Type scientific name..."
                            : "Type common or scientific name..."
                        }
                        className="w-full p-3 rounded-lg border border-stone-300 bg-white text-stone-700 text-sm text-center placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                        autoComplete="off"
                        autoCapitalize="off"
                      />
                    </div>
                  )}

                  {quizMode !== "multiple-choice" && (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={
                      (quizMode === "dropdown" && !dropdownValue) ||
                      (quizMode === "free-response" && !freeResponseInput.trim())
                    }
                    className="w-full py-3 bg-green-700 text-white font-medium hover:bg-green-800 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Answer
                  </button>
                  )}
                </div>
              )}

              {/* Single Show Answer button for flashcard mode */}
              {!isHardMode && (
                <button
                  onClick={handleFlip}
                  className="w-full py-3 bg-green-700 text-white font-medium hover:bg-green-800 transition-colors"
                >
                  Show Answer
                </button>
              )}
            </div>
          </div>

          {/* Back */}
          <div className={`card-back ${!flipped ? "hidden" : ""}`}>
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              {/* Quiz result banner */}
              {isHardMode && answerSubmitted && (
                <div
                  className={`px-4 py-3 text-center font-semibold text-sm ${
                    isCorrect === "correct"
                      ? "bg-green-100 text-green-800"
                      : isCorrect === "partial"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {isCorrect === "correct"
                    ? "Correct!"
                    : isCorrect === "partial"
                    ? "Partially Correct"
                    : "Incorrect"}
                </div>
              )}

              {/* Navigation buttons - at top for visibility */}
              <div className="p-3 border-b border-stone-100 text-center">
                {isHardMode ? (
                  <button
                    onClick={() => handleRate(isCorrect === "correct" ? "good" : isCorrect === "partial" ? "hard" : "again")}
                    className="w-full py-2.5 rounded-lg text-white text-sm font-medium bg-green-700 hover:bg-green-800 transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <div>
                    <button
                      onClick={handleNext}
                      className="w-full py-2.5 rounded-lg text-white text-sm font-medium bg-green-700 hover:bg-green-800 transition-colors"
                    >
                      Next
                    </button>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setShowRatingOptions(!showRatingOptions)}
                        className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        {showRatingOptions ? "Hide" : "Rate difficulty"}
                      </button>
                      <span className="text-stone-300">·</span>
                      <button
                        onClick={handleSkip}
                        className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                    {showRatingOptions && (
                      <div className="mt-2">
                        <div className="grid grid-cols-4 gap-2">
                          {RATING_BUTTONS.map((btn) => (
                            <button
                              key={btn.rating}
                              onClick={() => handleRate(btn.rating)}
                              className={`py-2 rounded-lg text-white text-xs font-medium ${btn.color} transition-colors`}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!isHardMode && (
                  <p className="text-[10px] text-stone-300 mt-2">
                    Swipe left for next
                  </p>
                )}
              </div>

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

              <div className="p-4 space-y-3 text-center">
                <div>
                  <h3 className="text-xl font-bold text-stone-800">
                    {currentSpecies.commonName}
                  </h3>
                  <p className="text-sm italic text-stone-500">
                    {currentSpecies.scientificName}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap justify-center">
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                    {currentSpecies.category.charAt(0).toUpperCase() + currentSpecies.category.slice(1)}
                  </span>
                  {currentSpecies.family && currentSpecies.family !== "Unknown" && (
                    <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs">
                      {currentSpecies.family}
                    </span>
                  )}
                  {currentSpecies.nativeStatus && currentSpecies.nativeStatus !== "unknown" && (
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      currentSpecies.nativeStatus === "native" || currentSpecies.nativeStatus === "likely native"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-orange-50 text-orange-700"
                    }`}>
                      {currentSpecies.nativeStatus}
                    </span>
                  )}
                  {currentSpecies.seasons && currentSpecies.seasons.length > 0 && currentSpecies.seasons.length < 4 && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs capitalize">
                      {currentSpecies.seasons.join(", ")}
                    </span>
                  )}
                </div>

                {/* Taxonomy Chart */}
                <TaxonomyChart
                  species={currentSpecies}
                  allSpecies={allSpecies}
                />

                {currentSpecies.keyFacts.length > 0 && (
                  <ul className="text-sm text-stone-600 space-y-1 text-left">
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
                  <p className="text-sm text-stone-600 bg-amber-50 p-2 rounded text-left">
                    <strong className="text-amber-700">Tip:</strong>{" "}
                    {currentSpecies.identificationTips}
                  </p>
                )}

                {currentSpecies.sounds.length > 0 && (
                  <SoundPlayer
                    speciesId={currentSpecies.id}
                    sounds={currentSpecies.sounds}
                  />
                )}
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
