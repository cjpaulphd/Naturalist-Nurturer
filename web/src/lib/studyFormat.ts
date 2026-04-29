import { getStorage, setStorage } from "./storage";
import {
  Category,
  NameDisplay,
  QuizDifficulty,
  QuizMode,
  SessionType,
  StudyMode,
} from "./types";

export interface LastStudyFormat {
  sessionType: SessionType;
  studyMode: StudyMode;
  quizMode?: QuizMode;
  difficulty?: QuizDifficulty;
  nameDisplay?: NameDisplay;
}

const STORAGE_KEY = "last_study_format";

export function getLastStudyFormat(): LastStudyFormat | null {
  return getStorage<LastStudyFormat | null>(STORAGE_KEY, null);
}

export function setLastStudyFormat(format: LastStudyFormat): void {
  setStorage(STORAGE_KEY, format);
}

export function buildStudyUrlForCategory(
  format: LastStudyFormat | null,
  category: Category,
): string {
  const params = new URLSearchParams();
  params.set("categories", category);

  if (!format) {
    params.set("type", "review");
    params.set("mode", "photo");
    return `/study?${params.toString()}`;
  }

  params.set("type", format.sessionType);
  params.set("mode", format.studyMode);

  if (format.sessionType === "quiz") {
    if (format.quizMode && format.quizMode !== "flashcard") {
      params.set("quizMode", format.quizMode);
    }
    if (format.nameDisplay && format.nameDisplay !== "both") {
      params.set("nameDisplay", format.nameDisplay);
    }
    if (format.difficulty && format.difficulty !== "medium") {
      params.set("difficulty", format.difficulty);
    }
  }

  return `/study?${params.toString()}`;
}
