"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getStorage, setStorage } from "@/lib/storage";
import {
  TEXT_SIZE_OPTIONS,
  getServerTextSize,
  getTextSize,
  setTextSize,
  subscribeTextSize,
} from "@/lib/textSize";

/**
 * Header gear button opening a small settings menu: text size (applied to
 * <html data-text-size> for large-text accessibility) and celebration
 * animations. Both persist in localStorage.
 */
export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const size = useSyncExternalStore(
    subscribeTextSize,
    getTextSize,
    getServerTextSize
  );
  // Only read on the client after a click, so lazy init never mismatches SSR.
  const [animations, setAnimations] = useState(() =>
    getStorage("animations", true)
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Settings"
        className={`p-1.5 rounded-md transition-colors ${
          open
            ? "bg-green-700 text-white"
            : "text-green-100 hover:bg-green-700/50"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Settings"
          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50"
        >
          <p className="px-3 pt-1 pb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Text Size
          </p>
          {TEXT_SIZE_OPTIONS.map((option, i) => (
            <button
              key={option.value}
              role="menuitemradio"
              aria-checked={size === option.value}
              onClick={() => {
                setTextSize(option.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                size === option.value
                  ? "bg-green-50 text-green-800 font-semibold"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              <span className="text-sm">{option.label}</span>
              <span
                aria-hidden="true"
                className={`font-semibold leading-none ${
                  ["text-sm", "text-base", "text-lg"][i]
                }`}
              >
                Aa
              </span>
            </button>
          ))}

          <div className="my-1.5 border-t border-stone-200" />

          <p className="px-3 pt-1 pb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Animations
          </p>
          <button
            role="menuitemcheckbox"
            aria-checked={animations}
            onClick={() => {
              const next = !animations;
              setAnimations(next);
              setStorage("animations", next);
            }}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <span className="text-sm">🍂 Celebrations</span>
            <span
              aria-hidden="true"
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                animations
                  ? "bg-green-700 text-white"
                  : "bg-stone-200 text-stone-500"
              }`}
            >
              {animations ? "On" : "Off"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
