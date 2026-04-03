// Species data types matching the schema from build_data.py

export interface SpeciesPhoto {
  url: string;
  attribution: string;
  filename: string;
}

export interface SpeciesSound {
  url: string;
  attribution: string;
  filename: string;
  duration: number | null;
}

export type Category = "tree" | "plant" | "bird";

export type Season = "spring" | "summer" | "fall" | "winter";

export type QuizMode = "flashcard" | "multiple-choice" | "dropdown" | "free-response";

export type NameDisplay = "common" | "scientific" | "both";

export interface Species {
  id: number;
  category: Category;
  commonName: string;
  scientificName: string;
  order: string;
  family: string;
  genus: string;
  observationCount: number;
  prevalenceRank: number;
  nativeStatus: string;
  seasons: Season[];
  photos: SpeciesPhoto[];
  sounds: SpeciesSound[];
  keyFacts: string[];
  habitat: string;
  identificationTips: string;
}

// SRS (Spaced Repetition System) types

export interface CardState {
  speciesId: number;
  easeFactor: number;
  interval: number; // days
  repetitions: number;
  nextReview: number; // timestamp ms
  lastRating: Rating | null;
}

export type Rating = "again" | "hard" | "good" | "easy";

export type StudyMode = "photo" | "name" | "sound" | "mixed";

export type SessionType = "learn" | "review" | "quiz";

export interface StudySession {
  type: SessionType;
  mode: StudyMode;
  categories: Category[];
  cards: number[]; // species IDs
  currentIndex: number;
}

export interface UserProgress {
  totalReviewed: number;
  streakDays: number;
  lastStudyDate: string | null; // ISO date string
  learned: Record<string, number[]>; // category -> species IDs
}
