/**
 * localStorage utilities with nn_ prefix to avoid collisions.
 */

const PREFIX = "nn_";

export function getStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const prefixedKey = key.startsWith(PREFIX) ? key : PREFIX + key;
    const item = localStorage.getItem(prefixedKey);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

export function setStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    const prefixedKey = key.startsWith(PREFIX) ? key : PREFIX + key;
    localStorage.setItem(prefixedKey, JSON.stringify(value));
  } catch (err) {
    console.error("localStorage write error:", err);
  }
}

export function removeStorage(key: string): void {
  if (typeof window === "undefined") return;
  const prefixedKey = key.startsWith(PREFIX) ? key : PREFIX + key;
  localStorage.removeItem(prefixedKey);
}
