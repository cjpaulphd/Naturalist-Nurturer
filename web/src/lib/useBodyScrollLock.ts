"use client";

import { useEffect } from "react";

/**
 * Lock page scroll while a modal overlay is open, so background content
 * doesn't scroll underneath it. Restores the previous overflow on close.
 */
export function useBodyScrollLock(active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
