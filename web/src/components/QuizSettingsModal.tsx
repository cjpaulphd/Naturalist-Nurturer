"use client";

import { useState } from "react";
import { QuizMode, NameDisplay, StudyMode } from "@/lib/types";

interface QuizSettingsModalProps {
  hasBirds: boolean;
  onStart: (quizMode: QuizMode, nameDisplay: NameDisplay, studyMode: StudyMode) => void;
  onClose: () => void;
}

export default function QuizSettingsModal({
  hasBirds,
  onStart,
  onClose,
}: QuizSettingsModalProps) {
  const [quizMode, setQuizMode] = useState<QuizMode>("multiple-choice");
  const [nameDisplay, setNameDisplay] = useState<NameDisplay>("both");
  const [studyMode, setStudyMode] = useState<StudyMode>("photo");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-5 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Start Quiz — at the top */}
        <button
          onClick={() => onStart(quizMode, nameDisplay, studyMode)}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Start Quiz
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

        {/* Name Display */}
        <div>
          <h4 className="text-sm font-semibold text-stone-600 mb-2 text-center">Name Display</h4>
          <div className="flex justify-center">
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
        </div>

        {/* Study Mode */}
        <div>
          <h4 className="text-sm font-semibold text-stone-600 mb-2 text-center">Study Mode</h4>
          <div className={`grid gap-2 ${hasBirds ? "grid-cols-3" : "grid-cols-2"}`}>
            <button
              onClick={() => setStudyMode("photo")}
              className={`p-2.5 rounded-lg text-center transition-colors border ${
                studyMode === "photo"
                  ? "bg-green-50 border-green-400"
                  : "bg-white border-stone-200 hover:border-green-300"
              }`}
            >
              <div className="text-xl mb-0.5">📷</div>
              <div className={`text-xs ${studyMode === "photo" ? "text-green-800 font-medium" : "text-stone-600"}`}>Photo ID</div>
            </button>
            <button
              onClick={() => setStudyMode("name")}
              className={`p-2.5 rounded-lg text-center transition-colors border ${
                studyMode === "name"
                  ? "bg-green-50 border-green-400"
                  : "bg-white border-stone-200 hover:border-green-300"
              }`}
            >
              <div className="text-xl mb-0.5">📝</div>
              <div className={`text-xs ${studyMode === "name" ? "text-green-800 font-medium" : "text-stone-600"}`}>Name Recall</div>
            </button>
            {hasBirds && (
              <button
                onClick={() => setStudyMode("sound")}
                className={`p-2.5 rounded-lg text-center transition-colors border ${
                  studyMode === "sound"
                    ? "bg-green-50 border-green-400"
                    : "bg-white border-stone-200 hover:border-green-300"
                }`}
              >
                <div className="text-xl mb-0.5">🔊</div>
                <div className={`text-xs ${studyMode === "sound" ? "text-green-800 font-medium" : "text-stone-600"}`}>Sound ID</div>
              </button>
            )}
          </div>
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
