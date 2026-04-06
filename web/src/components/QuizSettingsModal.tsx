"use client";

import { useState } from "react";
import { QuizMode, QuizDifficulty, NameDisplay, StudyMode } from "@/lib/types";
import { getStorage, setStorage } from "@/lib/storage";

interface QuizSettingsModalProps {
  hasBirds: boolean;
  onStart: (quizMode: QuizMode, nameDisplay: NameDisplay, studyMode: StudyMode, difficulty: QuizDifficulty) => void;
  onClose: () => void;
}

export default function QuizSettingsModal({
  onStart,
  onClose,
}: QuizSettingsModalProps) {
  const [quizMode, setQuizMode] = useState<QuizMode>(() => getStorage<QuizMode>("quiz_mode", "multiple-choice"));
  const [nameDisplay, setNameDisplay] = useState<NameDisplay>(() => getStorage<NameDisplay>("quiz_name_display", "both"));
  const [difficulty, setDifficulty] = useState<QuizDifficulty>(() => getStorage<QuizDifficulty>("quiz_difficulty", "medium"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-5 space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Quiz Difficulty */}
        <div>
          <h4 className="text-sm font-semibold text-stone-600 mb-2 text-center">Difficulty</h4>
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
                className={`p-2.5 rounded-lg text-center transition-colors border ${
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

        {/* Similar Species Difficulty */}
        {quizMode === "multiple-choice" && (
          <div>
            <h4 className="text-sm font-semibold text-stone-600 mb-2 text-center">Similar Species</h4>
            <div className="flex justify-center">
            <div className="inline-flex gap-1 bg-stone-100 p-1 rounded-lg">
              {([
                ["easy", "Easy", "Random choices"],
                ["medium", "Medium", "Same order"],
                ["hard", "Hard", "Look-alikes"],
                ["hardest", "Hardest", "Look-alikes + scientific names"],
              ] as [QuizDifficulty, string, string][]).map(([level, label, desc]) => (
                <button
                  key={level}
                  onClick={() => {
                    setDifficulty(level);
                    if (level === "hardest") setNameDisplay("scientific");
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    difficulty === level
                      ? "bg-green-700 text-white"
                      : "text-stone-600 hover:bg-stone-200"
                  }`}
                  title={desc}
                >
                  {label}
                </button>
              ))}
            </div>
            </div>
            <p className="text-xs text-stone-400 text-center mt-1">
              {difficulty === "easy" && "Random species from category"}
              {difficulty === "medium" && "Species from same taxonomic order"}
              {difficulty === "hard" && "Closely related species (same family/genus)"}
              {difficulty === "hardest" && "Look-alikes with scientific names only"}
            </p>
          </div>
        )}

        {/* Name Display */}
        <div>
          <h4 className="text-sm font-semibold text-stone-600 mb-2 text-center">Name Display</h4>
          <div className="flex justify-center">
          <div className="inline-flex gap-1 bg-stone-100 p-1 rounded-lg">
            {([
              ["common", "Common"],
              ["both", "Both"],
              ["scientific", "Scientific"],
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
        </div>

        {/* Start Challenge — at the bottom */}
        <button
          onClick={() => {
            setStorage("quiz_mode", quizMode);
            setStorage("quiz_name_display", nameDisplay);
            setStorage("quiz_difficulty", difficulty);
            onStart(quizMode, nameDisplay, "photo", difficulty);
          }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Start Challenge
        </button>
      </div>
    </div>
  );
}
