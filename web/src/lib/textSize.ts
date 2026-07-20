import { getStorage, setStorage } from "@/lib/storage";

/**
 * Global text-size preference. Scaling the root font-size scales the whole
 * rem-based Tailwind design system (type and spacing together), so layouts
 * keep their proportions — the same effect as browser zoom, which the app
 * viewport disables on touch devices.
 */

export type TextSize = "default" | "large" | "xl";

export const TEXT_SIZE_KEY = "text_size";

export const TEXT_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
  { value: "xl", label: "Extra Large" },
];

export function getTextSize(): TextSize {
  const stored = getStorage<TextSize>(TEXT_SIZE_KEY, "default");
  return stored === "large" || stored === "xl" ? stored : "default";
}

/** Persist the preference and apply it to <html> immediately. */
export function setTextSize(size: TextSize): void {
  setStorage(TEXT_SIZE_KEY, size);
  applyTextSize(size);
  window.dispatchEvent(new Event(TEXT_SIZE_EVENT));
}

const TEXT_SIZE_EVENT = "nn-text-size-change";

/** useSyncExternalStore subscription for components showing the setting. */
export function subscribeTextSize(callback: () => void): () => void {
  window.addEventListener(TEXT_SIZE_EVENT, callback);
  return () => window.removeEventListener(TEXT_SIZE_EVENT, callback);
}

export function getServerTextSize(): TextSize {
  return "default";
}

export function applyTextSize(size: TextSize): void {
  if (typeof document === "undefined") return;
  if (size === "default") {
    delete document.documentElement.dataset.textSize;
  } else {
    document.documentElement.dataset.textSize = size;
  }
}

/**
 * Inline <script> source that re-applies the stored preference before first
 * paint, so a reload never flashes at the default size. Must stay in sync
 * with the nn_ prefix in storage.ts and the data attribute in globals.css.
 */
export const TEXT_SIZE_INIT_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("nn_${TEXT_SIZE_KEY}"));if(s==="large"||s==="xl")document.documentElement.setAttribute("data-text-size",s)}catch(e){}`;
