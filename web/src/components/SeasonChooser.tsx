"use client";

import { useState } from "react";
import { Season } from "@/lib/types";
import { getCurrentSeason, getRandomSeason } from "@/lib/species";

interface SeasonChooserProps {
  selected: Season | null;
  onChange: (season: Season | null) => void;
}

const SEASONS: { value: Season; label: string; icon: string }[] = [
  { value: "spring", label: "Spring", icon: "🌱" },
  { value: "summer", label: "Summer", icon: "☀️" },
  { value: "fall", label: "Fall", icon: "🍂" },
  { value: "winter", label: "Winter", icon: "❄️" },
];

export default function SeasonChooser({ selected, onChange }: SeasonChooserProps) {
  const [expanded, setExpanded] = useState(false);

  const handleCurrent = () => {
    onChange(getCurrentSeason());
    setExpanded(false);
  };

  const handleRandom = () => {
    onChange(getRandomSeason());
    setExpanded(false);
  };

  const handlePick = (season: Season) => {
    onChange(season);
    setExpanded(false);
  };

  const handleClear = () => {
    onChange(null);
    setExpanded(false);
  };

  const currentSeason = getCurrentSeason();
  const selectedInfo = selected ? SEASONS.find((s) => s.value === selected) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-600">Season</h3>
        {selected && (
          <button
            onClick={handleClear}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Selected season display */}
      {selectedInfo && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-300 rounded-lg text-left"
        >
          <span className="text-lg">{selectedInfo.icon}</span>
          <span className="text-sm font-medium text-green-800">{selectedInfo.label}</span>
          <span className="ml-auto text-xs text-green-600">Change</span>
        </button>
      )}

      {/* Quick actions */}
      {(!selected || expanded) && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleCurrent}
              className="flex-1 px-3 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
            >
              Current ({SEASONS.find((s) => s.value === currentSeason)?.label})
            </button>
            <button
              onClick={handleRandom}
              className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Random
            </button>
          </div>

          {/* Season picker grid */}
          <div className="grid grid-cols-4 gap-2">
            {SEASONS.map((season) => (
              <button
                key={season.value}
                onClick={() => handlePick(season.value)}
                className={`p-2 rounded-lg text-center transition-colors border ${
                  selected === season.value
                    ? "bg-green-100 border-green-400 text-green-800"
                    : "bg-white border-stone-200 text-stone-600 hover:border-green-400"
                }`}
              >
                <div className="text-lg">{season.icon}</div>
                <div className="text-xs mt-0.5">{season.label}</div>
              </button>
            ))}
          </div>

          {/* All seasons option */}
          <button
            onClick={handleClear}
            className={`w-full px-3 py-2 rounded-lg text-sm transition-colors border ${
              selected === null
                ? "bg-green-100 border-green-400 text-green-800 font-medium"
                : "bg-white border-stone-200 text-stone-500 hover:border-green-400"
            }`}
          >
            All Seasons
          </button>
        </div>
      )}
    </div>
  );
}
