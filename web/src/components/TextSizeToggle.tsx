"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  TEXT_SIZE_OPTIONS,
  getServerTextSize,
  getTextSize,
  setTextSize,
  subscribeTextSize,
} from "@/lib/textSize";

/**
 * Header "Aa" button opening a small menu of text-size choices. The chosen
 * size is applied to <html data-text-size> and persisted in localStorage.
 */
export default function TextSizeToggle() {
  const [open, setOpen] = useState(false);
  const size = useSyncExternalStore(
    subscribeTextSize,
    getTextSize,
    getServerTextSize
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
        aria-label="Text size"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Text size"
        className={`px-1.5 sm:px-2 py-1.5 rounded-md text-sm font-semibold transition-colors ${
          open || size !== "default"
            ? "bg-green-700 text-white"
            : "text-green-100 hover:bg-green-700/50"
        }`}
      >
        <span aria-hidden="true">
          A<span className="text-xs">a</span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Text size"
          className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50"
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
        </div>
      )}
    </div>
  );
}
