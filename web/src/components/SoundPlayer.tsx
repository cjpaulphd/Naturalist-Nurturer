"use client";

import { useRef, useState, useEffect } from "react";
import { SpeciesSound } from "@/lib/types";
import { getSoundPath } from "@/lib/species";

interface SoundPlayerProps {
  speciesId: number;
  sounds: SpeciesSound[];
}

export default function SoundPlayer({ speciesId, sounds }: SoundPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  if (sounds.length === 0) return null;

  const sound = sounds[currentIndex];
  const src = sound.filename
    ? getSoundPath(speciesId, sound.filename)
    : sound.url;

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const pct =
      (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const switchTrack = (index: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setCurrentIndex(index);
    setIsPlaying(false);
    setProgress(0);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-stone-100 rounded-lg p-3">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="metadata"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-green-700 text-white flex items-center justify-center hover:bg-green-800 transition-colors flex-shrink-0"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="w-full h-1.5 bg-stone-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          {sound.duration && (
            <span className="text-[10px] text-stone-500 mt-0.5 block">
              {formatDuration(sound.duration)}
            </span>
          )}
        </div>
      </div>

      {sounds.length > 1 && (
        <div className="flex gap-2 mt-2">
          {sounds.map((s, i) => (
            <button
              key={i}
              onClick={() => switchTrack(i)}
              className={`text-xs px-2 py-1 rounded ${
                i === currentIndex
                  ? "bg-green-700 text-white"
                  : "bg-stone-200 text-stone-600 hover:bg-stone-300"
              }`}
            >
              Track {i + 1}
            </button>
          ))}
        </div>
      )}

      {sound.attribution && (
        <p className="text-[10px] text-stone-400 mt-1.5 truncate">
          {sound.attribution}
        </p>
      )}
    </div>
  );
}
