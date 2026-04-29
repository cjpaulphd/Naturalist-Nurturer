"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Species,
  Category,
  SessionType,
  StudyMode,
  QuizMode,
  QuizDifficulty,
  NameDisplay,
  Rating,
} from "@/lib/types";
import { loadSpeciesData, getSpeciesById } from "@/lib/species";
import { getCachedLocationSpecies, fetchBirdSounds, updateCachedSpeciesSounds, fetchSimilarSpeciesForQuiz, getLastLocation } from "@/lib/inat";
import {
  getNewCards,
  getDueCards,
  getAllLearnedCards,
  getQuizCards,
  rateCard,
  getLearnedCount,
} from "@/lib/srs";
import { CATEGORIES } from "@/lib/categories";
import PhotoGallery from "@/components/PhotoGallery";
import SoundPlayer from "@/components/SoundPlayer";
import TaxonomyChart from "@/components/TaxonomyChart";
import FallingLeaves from "@/components/FallingLeaves";
import { getStorage } from "@/lib/storage";
import { setLastStudyFormat } from "@/lib/studyFormat";

const LEARN_COUNT = 10;
const QUIZ_COUNT = 15;

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

/** Fisher-Yates shuffle — produces a uniformly random permutation. */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// General identification tips by category
function getCategoryTips(category: Category): string[] {
  switch (category) {
    case "tree":
      return [
        "Look at leaf shape, size, and arrangement (opposite vs alternate)",
        "Check bark texture and color — smooth, furrowed, plated, or peeling",
        "Note the overall silhouette and branching pattern",
        "Look for fruits, seeds, or flowers if present",
        "Consider leaf margins — toothed, lobed, or smooth",
      ];
    case "plant":
      return [
        "Observe flower color, petal count, and arrangement",
        "Check leaf shape, margins, and how leaves attach to the stem",
        "Note plant height and growth habit (upright, sprawling, climbing)",
        "Look at stem characteristics — round, square, hairy, or smooth",
        "Consider habitat — wetland, forest floor, meadow, or disturbed ground",
      ];
    case "fungus":
      return [
        "Note cap shape, color, and surface texture",
        "Check the underside — gills, pores, teeth, or smooth",
        "Look at stem presence, ring, and base shape",
        "Consider where it's growing — on wood, soil, or other substrates",
        "Note the overall size and any color changes when bruised",
      ];
    case "bird":
      return [
        "Note overall size and body shape relative to familiar species",
        "Look at bill shape and size — it indicates diet and behavior",
        "Check key field marks: wing bars, eye rings, breast markings",
        "Observe color patterns on head, back, wings, and underparts",
        "Consider habitat, behavior, and flight pattern",
      ];
    case "mammal":
      return [
        "Note body size, shape, and proportions",
        "Look at fur color and any distinctive markings or patterns",
        "Check ear shape and size, tail length and bushiness",
        "Consider habitat and time of day (nocturnal vs diurnal)",
        "Look at tracks, gait, and movement style if observed in motion",
      ];
    case "insect":
      return [
        "Count the wings and legs — body segments help narrow the order",
        "Note color patterns, especially warning colors or mimicry",
        "Check wing shape, venation, and whether they're clear or opaque",
        "Look at antennae shape — clubbed, feathered, or thread-like",
        "Consider size, habitat, and what plants it's associated with",
      ];
    case "reptile":
      return [
        "Look at scale patterns, texture, and coloration",
        "Note body shape — slender, stocky, flattened, or elongated",
        "Check head shape and eye characteristics",
        "Consider size, habitat preference, and geographic range",
        "Look for distinctive markings — bands, stripes, or blotches",
      ];
    case "amphibian":
      return [
        "Note skin texture — smooth (frogs) vs bumpy (toads)",
        "Look at body proportions, especially hind leg length",
        "Check coloration and any distinctive patterns or markings",
        "Consider habitat — aquatic, terrestrial, or arboreal",
        "Note size and eye characteristics (color, pupil shape)",
      ];
  }
}

// Generate multiple-choice options with taxonomy-aware distractor selection.
// `extraDistractors` are additional similar species fetched from iNaturalist
// for hard/hardest modes — species present in the geography but not in the
// user's downloaded list.
function generateChoices(
  correctSpecies: Species,
  allSpecies: Species[],
  difficulty: QuizDifficulty = "medium",
  count: number = 4,
  extraDistractors: Species[] = []
): Species[] {
  const needed = count - 1;
  // Merge local species with extra API-fetched distractors for the pool
  const combined = [...allSpecies, ...extraDistractors];
  const sameCategory = combined.filter(
    (s) => s.category === correctSpecies.category && s.id !== correctSpecies.id
  );

  if (difficulty === "easy") {
    // Random from same category (original behavior)
    const shuffled = shuffleArray(sameCategory);
    const distractors = shuffled.slice(0, needed);
    return shuffleArray([correctSpecies, ...distractors]);
  }

  // For medium/hard: prefer taxonomically similar species
  const sameGenus = sameCategory.filter((s) => s.genus === correctSpecies.genus);
  const sameFamily = sameCategory.filter(
    (s) => s.family === correctSpecies.family && s.genus !== correctSpecies.genus
  );
  const sameOrder = sameCategory.filter(
    (s) => s.order === correctSpecies.order && s.family !== correctSpecies.family
  );
  const rest = sameCategory.filter(
    (s) => s.order !== correctSpecies.order
  );

  let pool: Species[];
  if (difficulty === "hard" || difficulty === "hardest") {
    // Prioritize: same genus > same family > same order > rest
    pool = [
      ...shuffleArray(sameGenus),
      ...shuffleArray(sameFamily),
      ...shuffleArray(sameOrder),
      ...shuffleArray(rest),
    ];
  } else {
    // Medium: prioritize same order > same family > rest
    pool = [
      ...shuffleArray(sameOrder),
      ...shuffleArray(sameFamily),
      ...shuffleArray(sameGenus),
      ...shuffleArray(rest),
    ];
  }

  const distractors = pool.slice(0, needed);

  // If we don't have enough, fill from the full category
  if (distractors.length < needed) {
    const usedIds = new Set([correctSpecies.id, ...distractors.map((d) => d.id)]);
    const remaining = sameCategory.filter((s) => !usedIds.has(s.id));
    const extra = shuffleArray(remaining).slice(0, needed - distractors.length);
    distractors.push(...extra);
  }

  return shuffleArray([correctSpecies, ...distractors]);
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
  const difficulty = (searchParams.get("difficulty") || "medium") as QuizDifficulty;
  const nameDisplay = (searchParams.get("nameDisplay") || "both") as NameDisplay;
  const categoryParam = searchParams.get("categories");
  const categories: Category[] = categoryParam
    ? (categoryParam.split(",") as Category[])
    : [];

  const [showFallbackBanner, setShowFallbackBanner] = useState(isFallbackReview);
  const [fallbackType, setFallbackType] = useState<SessionType | null>(null);

  // Remember the format so the Grow page category buttons can resume it.
  // Skip when this load was an auto-fallback so the user's original intent persists.
  useEffect(() => {
    if (isFallbackReview) return;
    setLastStudyFormat({
      sessionType,
      studyMode,
      quizMode,
      difficulty,
      nameDisplay,
    });
  }, [sessionType, studyMode, quizMode, difficulty, nameDisplay, isFallbackReview]);

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
  // Per-card result tracking for segmented progress bar
  const [cardResults, setCardResults] = useState<Map<number, "correct" | "partial" | "incorrect">>(new Map());
  // Tips overlay state
  const [showTips, setShowTips] = useState(false);
  // Learn More expanded state
  const [showLearnMore, setShowLearnMore] = useState(false);
  // Extra distractors fetched from iNaturalist for hard/hardest quiz modes
  const [extraDistractors, setExtraDistractors] = useState<Species[]>([]);
  const similarFetchedRef = useRef<Set<number>>(new Set());
  const lockedChoicesRef = useRef<{ speciesId: number; choices: Species[] } | null>(null);

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

      // Auto-fallback: if no cards found for the requested type, try alternatives
      // so the user never hits a dead-end empty state
      if (ids.length === 0 && sessionType !== "quiz") {
        // Try all session types in priority order
        const fallbacks: { type: SessionType; getter: () => number[] }[] = [
          { type: "review", getter: () => getDueCards(data, categories) },
          { type: "learn", getter: () => getNewCards(data, categories, LEARN_COUNT) },
          { type: "review-all", getter: () => getAllLearnedCards(data, categories) },
        ];
        for (const fb of fallbacks) {
          if (fb.type === sessionType) continue; // already tried
          ids = fb.getter();
          if (ids.length > 0) {
            setShowFallbackBanner(true);
            setFallbackType(fb.type);
            break;
          }
        }
      }

      setCardIds(ids);
      setSessionStats((s) => ({ ...s, total: ids.length }));

      if (studyMode === "mixed" && ids.length > 0) {
        setCurrentMode(pickRandomMode(data, ids[0]));
      }

      // For hard/hardest quiz modes, prefetch similar species for the first
      // card BEFORE clearing the loading state. This ensures extra distractors
      // are in the pool when choices are first generated. A 3-second timeout
      // prevents the spinner from hanging if the API is slow.
      if (
        ids.length > 0 &&
        (difficulty === "hard" || difficulty === "hardest") &&
        quizMode !== "flashcard"
      ) {
        const firstSpecies = getSpeciesById(data, ids[0]);
        const coords = firstSpecies?.family ? getLastLocation() : null;
        if (firstSpecies && coords) {
          similarFetchedRef.current.add(firstSpecies.id);
          const existingIds = new Set(data.map((s) => s.id));
          const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
          Promise.race([
            fetchSimilarSpeciesForQuiz(firstSpecies, coords, existingIds)
              .then((similar) => {
                if (similar.length > 0) {
                  setExtraDistractors(similar);
                }
              })
              .catch(() => {}),
            timeout,
          ]).then(() => setLoading(false));
          return; // setLoading(false) handled above
        }
      }

      setLoading(false);
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
  const [loadingSounds, setLoadingSounds] = useState(false);

  useEffect(() => {
    if (!currentSpecies) return;
    if (currentSpecies.category !== "bird") return;
    if (currentSpecies.sounds && currentSpecies.sounds.length > 0) return;
    if (soundFetchedRef.current.has(currentSpecies.id)) return;

    soundFetchedRef.current.add(currentSpecies.id);
    setLoadingSounds(true);

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
      })
      .finally(() => {
        setLoadingSounds(false);
      });
  }, [currentSpecies]);

  // Prefetch similar species for a given species, merging results into extraDistractors.
  // Returns a promise so callers can chain (e.g. prefetch card 0 then generate choices).
  const prefetchDistractors = useCallback(
    (species: Species, speciesList: Species[]): Promise<void> => {
      if (!species.family) return Promise.resolve();
      if (similarFetchedRef.current.has(species.id)) return Promise.resolve();
      similarFetchedRef.current.add(species.id);

      const coords = getLastLocation();
      if (!coords) return Promise.resolve();

      const existingIds = new Set(speciesList.map((s) => s.id));
      return fetchSimilarSpeciesForQuiz(species, coords, existingIds)
        .then((similar) => {
          if (similar.length > 0) {
            setExtraDistractors((prev) => {
              const ids = new Set(prev.map((s) => s.id));
              const fresh = similar.filter((s) => !ids.has(s.id));
              return fresh.length > 0 ? [...prev, ...fresh] : prev;
            });
          }
        })
        .catch(() => {
          // Similar species are optional — quiz still works with local pool
        });
    },
    []
  );

  // Fetch similar species for the current card + look-ahead prefetch for the next card
  useEffect(() => {
    if (!currentSpecies) return;
    if (difficulty !== "hard" && difficulty !== "hardest") return;
    if (quizMode === "flashcard") return;

    // Fetch for current card
    prefetchDistractors(currentSpecies, allSpecies);

    // Look-ahead: prefetch for the next card so distractors are ready when user advances
    const nextIndex = currentIndex + 1;
    if (nextIndex < cardIds.length) {
      const nextSpecies = getSpeciesById(allSpecies, cardIds[nextIndex]);
      if (nextSpecies) {
        prefetchDistractors(nextSpecies, allSpecies);
      }
    }
  }, [currentSpecies, difficulty, quizMode, allSpecies, currentIndex, cardIds, prefetchDistractors]);

  // Generate choices for current card with taxonomy-aware difficulty.
  // Lock in choices per species so late-arriving extraDistractors don't
  // cause the visible option-switch bug in hardest mode.
  const choices = useMemo(() => {
    if (!currentSpecies || quizMode === "flashcard") return [];
    if (lockedChoicesRef.current?.speciesId === currentSpecies.id) {
      return lockedChoicesRef.current.choices;
    }
    const newChoices = generateChoices(currentSpecies, allSpecies, difficulty, 4, extraDistractors);
    lockedChoicesRef.current = { speciesId: currentSpecies.id, choices: newChoices };
    return newChoices;
  }, [currentSpecies, allSpecies, quizMode, difficulty, extraDistractors]);

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
      const indigenousMatch = currentSpecies.indigenousNames?.some(
        (n) => n.name.toLowerCase() === input
      );
      if (input === commonName || input === sciName || indigenousMatch) {
        result = "correct";
      } else if (
        hasPartialWordMatch(input, currentSpecies.commonName) ||
        hasPartialWordMatch(input, currentSpecies.scientificName) ||
        (currentSpecies.indigenousNames?.some(
          (n) => hasPartialWordMatch(input, n.name)
        ))
      ) {
        result = "partial";
      }
    }

    setIsCorrect(result);
    setAnswerSubmitted(true);
    setFlipped(true);
    setCardResults((prev) => new Map(prev).set(currentIndex, result));

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
      setShowTips(false);
      setShowLearnMore(false);
      resetQuizState();
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

  const handlePrevious = () => {
    if (currentIndex <= 0) return;
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    setFlipped(false);
    setShowTips(false);
    setShowLearnMore(false);
    resetQuizState();
    if (studyMode === "mixed") {
      setCurrentMode(pickRandomMode(allSpecies, cardIds[prevIndex]));
    }
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
    setTouchDeltaX(delta);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null) return;
    if (touchDeltaX < -SWIPE_THRESHOLD) {
      if (flipped) {
        // Swiped left while viewing answer → advance with "good" rating
        handleNext();
      } else if (!isHardMode || activeMode === "name") {
        // Swiped left while viewing question → reveal answer
        handleFlip();
      }
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
            ? "No cards due for revisit!"
            : "No new cards available"}
        </h2>
        <p className="text-stone-500 text-sm mb-4">
          {sessionType === "review" || sessionType === "review-all"
            ? "Great job! Come back later to revisit more."
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
              Revisit Due
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
              Revisit All
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
    const animationsEnabled = getStorage("animations", true);
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        {animationsEnabled && <FallingLeaves />}
        <p className="text-4xl mb-4">🌿 🎉 🌿</p>
        <h2 className="text-xl font-bold text-stone-800 mb-4">
          Nicely Nurtured!
        </h2>

        {/* Category progress report — highlights groups from this session */}
        {(() => {
          const studiedCategories = new Set(
            cardIds
              .map((id) => getSpeciesById(allSpecies, id))
              .filter(Boolean)
              .map((s) => s!.category)
          );
          return (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 mb-6">
              <h3 className="text-sm font-semibold text-stone-700 mb-3">
                Neighbors You Know
              </h3>
              <div className="grid grid-cols-4 gap-3 mb-3">
                {CATEGORIES.map((cat) => {
                  const total = allSpecies.filter((s) => s.category === cat.value).length;
                  if (total === 0) return null;
                  const learned = getLearnedCount(allSpecies, cat.value);
                  const pct = Math.round((learned / total) * 100);
                  const highlighted = studiedCategories.has(cat.value);
                  return (
                    <button
                      key={cat.value}
                      onClick={() => {
                        const params = new URLSearchParams();
                        params.set("categories", cat.value);
                        if (sessionType === "quiz") {
                          params.set("type", "quiz");
                          params.set("mode", studyMode);
                          if (quizMode !== "flashcard") {
                            params.set("quizMode", quizMode);
                          }
                          if (nameDisplay !== "both") {
                            params.set("nameDisplay", nameDisplay);
                          }
                          if (difficulty !== "medium") {
                            params.set("difficulty", difficulty);
                          }
                        } else {
                          const hasNew = getNewCards(allSpecies, [cat.value], 1).length > 0;
                          params.set("mode", "photo");
                          if (hasNew) {
                            params.set("type", "learn");
                          } else {
                            const hasDue = getDueCards(allSpecies, [cat.value]).length > 0;
                            params.set("type", hasDue ? "review" : "review-all");
                          }
                        }
                        window.location.href = `/study?${params.toString()}`;
                      }}
                      className={`text-center rounded-lg p-1.5 transition-colors cursor-pointer hover:bg-green-100 active:scale-95 ${
                        highlighted
                          ? "ring-2 ring-green-500 bg-green-50"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="text-lg mb-0.5">{cat.icon}</div>
                      <div className="text-[10px] text-stone-500 mb-1">{cat.label}</div>
                      <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-stone-600 mt-0.5">
                        {learned}/{total}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-stone-500 text-center">
                {sessionStats.total} species studied this session
              </div>
            </div>
          );
        })()}

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
                window.location.href = `/study?${params.toString()}`;
              }
            }}
            className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800"
          >
            {getNewCards(allSpecies, categories, 1).length > 0 ? "Meet More" : "Revisit"}
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

  // Fall back to photo mode if sound mode but species has no sounds AND we're done loading
  const rawMode = studyMode === "mixed" ? currentMode : studyMode;
  const activeMode =
    rawMode === "sound" && (!currentSpecies.sounds || currentSpecies.sounds.length === 0) && !loadingSounds
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
        {isHardMode ? (
          <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden flex">
            {cardIds.map((_, i) => {
              const result = cardResults.get(i);
              const widthPct = 100 / cardIds.length;
              return (
                <div
                  key={i}
                  className={`h-full transition-colors duration-300 ${
                    result === "correct"
                      ? "bg-green-500"
                      : result === "partial"
                      ? "bg-yellow-400"
                      : result === "incorrect"
                      ? "bg-red-400"
                      : i <= currentIndex
                      ? "bg-green-600"
                      : "bg-transparent"
                  }`}
                  style={{ width: `${widthPct}%` }}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <span className="text-xs text-stone-500">
          {currentIndex + 1}/{cardIds.length}
        </span>
      </div>

      {/* Fallback review banner */}
      {showFallbackBanner && (
        <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            {fallbackType === "learn"
              ? "No cards due for revisit \u2014 learning new species instead."
              : fallbackType === "review"
              ? "No new species to learn \u2014 revisiting due cards instead."
              : fallbackType === "review-all"
              ? "Revisiting all species you've learned so far."
              : "No new species to learn \u2014 revisiting what you know."}
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
      {isHardMode && activeMode !== "name" && (
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

      {/* Action buttons - above the card, under progress bar */}
      <div className="mb-3">
        {!flipped ? (
          (!isHardMode || activeMode === "name") && (
            <button
              onClick={handleFlip}
              className="w-full py-3 bg-green-700 text-white font-medium hover:bg-green-800 transition-colors rounded-lg"
            >
              <span className="flex items-center justify-center gap-2">
                Reveal
                <svg className="w-4 h-4 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          )
        ) : (
          <div className="text-center">
            {isHardMode && activeMode !== "name" ? (
              <button
                onClick={() => handleRate(isCorrect === "correct" ? "good" : isCorrect === "partial" ? "hard" : "again")}
                className="w-full py-3 rounded-lg text-white font-medium bg-green-700 hover:bg-green-800 transition-colors"
              >
                Next
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleRate("again")}
                  className="py-3 rounded-lg text-white font-medium bg-red-500 hover:bg-red-600 transition-colors text-sm"
                >
                  Again
                </button>
                <button
                  onClick={() => handleRate("hard")}
                  className="py-3 rounded-lg text-white font-medium bg-orange-500 hover:bg-orange-600 transition-colors text-sm"
                >
                  Hard
                </button>
                <button
                  onClick={() => handleRate("good")}
                  className="py-3 rounded-lg text-white font-medium bg-green-600 hover:bg-green-700 transition-colors text-sm"
                >
                  Good
                </button>
                <button
                  onClick={() => handleRate("easy")}
                  className="py-3 rounded-lg text-white font-medium bg-blue-500 hover:bg-blue-600 transition-colors text-sm"
                >
                  Easy
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Flashcard */}
      <div
        className="card-flip"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: touchDeltaX < 0 ? `translateX(${touchDeltaX}px)` : undefined,
          opacity: touchDeltaX < -SWIPE_THRESHOLD ? 0.6 : 1,
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
                    <p
                      className={`text-lg font-semibold text-stone-700${!isHardMode ? " cursor-pointer hover:text-green-700 transition-colors" : ""}`}
                      onClick={!isHardMode ? handleFlip : undefined}
                      role={!isHardMode ? "button" : undefined}
                    >
                      Who is this?
                    </p>
                    {isHardMode && (
                      <p className="text-sm text-stone-400 mt-1">
                        Choose your answer below
                      </p>
                    )}
                    <button
                      onClick={() => setShowTips(!showTips)}
                      className={`mt-3 px-4 py-2 font-medium transition-colors rounded-lg text-sm ${
                        showTips
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      Tips
                    </button>
                  </div>
                </div>
              )}

              {activeMode === "name" && (
                <div className="p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
                  <p className="text-xs uppercase tracking-wide text-stone-400 mb-4">
                    Can you picture this species?
                  </p>
                  <p className="text-2xl font-bold text-stone-800">
                    {formatName(currentSpecies, nameDisplay)}
                  </p>
                  {formatNameSecondary(currentSpecies, nameDisplay) && (
                    <p className="text-stone-400 italic mt-2">
                      {formatNameSecondary(currentSpecies, nameDisplay)}
                    </p>
                  )}
                  <div className="mt-6 text-sm text-stone-400 space-y-1">
                    <p>Picture its appearance, then reveal to check</p>
                  </div>
                  <button
                    onClick={() => setShowTips(!showTips)}
                    className={`mt-4 px-4 py-2 font-medium transition-colors rounded-lg text-sm ${
                      showTips
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    Tips
                  </button>
                </div>
              )}

              {activeMode === "sound" && (
                <div className="p-6 min-h-[300px] flex flex-col items-center justify-center text-center">
                  <p className="text-4xl mb-4">🔊</p>
                  <p
                    className={`text-lg font-semibold text-stone-700 mb-4${!isHardMode ? " cursor-pointer hover:text-green-700 transition-colors" : ""}`}
                    onClick={!isHardMode ? handleFlip : undefined}
                    role={!isHardMode ? "button" : undefined}
                  >
                    Who is this?
                  </p>
                  {loadingSounds ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-stone-400">Loading birdsong...</p>
                    </div>
                  ) : currentSpecies.sounds.length > 0 ? (
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
                  <button
                    onClick={() => setShowTips(!showTips)}
                    className={`mt-4 px-4 py-2 font-medium transition-colors rounded-lg text-sm ${
                      showTips
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    Tips
                  </button>
                </div>
              )}

              {/* Tips panel */}
              {showTips && currentSpecies && (
                <div className="border-t border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    {currentSpecies.category.charAt(0).toUpperCase() + currentSpecies.category.slice(1)} Identification Tips
                  </p>
                  <ul className="text-sm text-stone-600 space-y-1.5">
                    {getCategoryTips(currentSpecies.category).map((tip, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-500 flex-shrink-0">&#8226;</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                  {currentSpecies.identificationTips && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
                        Species-Specific Tip
                      </p>
                      <p className="text-sm text-stone-700">
                        {currentSpecies.identificationTips}
                      </p>
                    </div>
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
                            setCardResults((prev) => new Map(prev).set(currentIndex, result));
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

              {/* Front-of-card chevron navigation */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-stone-100">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex <= 0}
                  className="text-teal-500 hover:text-teal-700 disabled:opacity-20 disabled:cursor-default transition-colors"
                  aria-label="Previous card"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (isHardMode && activeMode !== "name" && !answerSubmitted) {
                      // Reveal answer without submitting — count as incorrect
                      setIsCorrect("incorrect");
                      setAnswerSubmitted(true);
                      setFlipped(true);
                      setCardResults((prev) => new Map(prev).set(currentIndex, "incorrect"));
                      setSessionStats((s) => ({
                        ...s,
                        incorrect: s.incorrect + 1,
                      }));
                    } else {
                      handleFlip();
                    }
                  }}
                  className="text-teal-500 hover:text-teal-700 transition-colors"
                  aria-label="Reveal answer"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

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
                <div className="flex items-center justify-center gap-3">
                  {/* Previous chevron */}
                  <button
                    onClick={handlePrevious}
                    disabled={currentIndex <= 0}
                    className="flex-shrink-0 text-teal-500 hover:text-teal-700 disabled:opacity-20 disabled:cursor-default transition-colors"
                    aria-label="Previous card"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-stone-800">
                      {currentSpecies.commonName}
                    </h3>
                    {currentSpecies.indigenousNames && currentSpecies.indigenousNames.length > 0 && (
                      <p className="text-sm font-medium text-amber-700">
                        {currentSpecies.indigenousNames.map((n, i) => (
                          <span key={i}>
                            {i > 0 && " · "}
                            {n.name}
                            <span className="text-xs font-normal text-amber-500 ml-1">({n.language})</span>
                          </span>
                        ))}
                      </p>
                    )}
                    <p className="text-sm italic text-stone-500">
                      {currentSpecies.scientificName}
                    </p>
                  </div>

                  {/* Next chevron */}
                  <button
                    onClick={
                      isHardMode && activeMode !== "name"
                        ? () => handleRate(isCorrect === "correct" ? "good" : isCorrect === "partial" ? "hard" : "again")
                        : handleNext
                    }
                    disabled={currentIndex >= cardIds.length - 1 && sessionComplete}
                    className="flex-shrink-0 text-teal-500 hover:text-teal-700 disabled:opacity-20 disabled:cursor-default transition-colors"
                    aria-label="Next card"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
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

                {currentSpecies.extendedFacts && currentSpecies.extendedFacts.length > 0 && (
                  <div className="text-left">
                    <button
                      onClick={() => setShowLearnMore(!showLearnMore)}
                      className="flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
                    >
                      <span className={`transition-transform duration-200 ${showLearnMore ? "rotate-90" : ""}`}>&#9654;</span>
                      Learn More
                    </button>
                    {showLearnMore && (
                      <div className="mt-2 space-y-2 animate-in">
                        <ul className="text-sm text-stone-600 space-y-1">
                          {currentSpecies.extendedFacts.map((fact, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-green-600 flex-shrink-0">&#8226;</span>
                              <span>{fact}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-stone-400">
                          Source: <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(currentSpecies.scientificName)}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-500 transition-colors">Wikipedia</a> (CC BY-SA 3.0)
                        </p>
                      </div>
                    )}
                  </div>
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

              {/* Next card button on back of card */}
              <button
                onClick={isHardMode && activeMode !== "name"
                  ? () => handleRate(isCorrect === "correct" ? "good" : isCorrect === "partial" ? "hard" : "again")
                  : handleNext}
                className="w-full py-3 border-t border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium rounded-b-xl"
              >
                Next <span aria-hidden="true">&rarr;</span>
              </button>

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
