"use client";

import { useState, useEffect, useCallback } from "react";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS() {
  return (
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useBodyScrollLock(showIOSModal);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    // iOS: always show the button (no native prompt available)
    if (isIOS()) {
      setShowButton(true);
      return;
    }

    // Chrome/Edge/Android: capture the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowButton(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleClick = useCallback(async () => {
    if (isIOS()) {
      setShowIOSModal(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setShowButton(false);
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  if (!showButton) return null;

  return (
    <>
      {/* Install button */}
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-100 hover:bg-green-200 rounded-full text-xs text-green-800 transition-colors"
      >
        📲 Add to Home Screen
      </button>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative text-center max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-3 right-3 text-stone-400 hover:text-stone-600 text-xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>

            <h3 className="text-lg font-bold text-stone-800 mb-1">
              Add to Home Screen
            </h3>
            <p className="text-xs text-stone-500 mb-5">
              Install Naturalist Nurturer on your device
            </p>

            {/* Steps */}
            <div className="flex flex-col gap-3 mb-5 text-left">
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-green-700 text-white rounded-full text-xs font-bold">
                  1
                </span>
                <p className="text-sm text-stone-700">
                  Tap the{" "}
                  <strong>Share</strong> button{" "}
                  <svg
                    className="inline-block align-text-bottom text-green-700"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>{" "}
                  in Safari
                </p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-green-700 text-white rounded-full text-xs font-bold">
                  2
                </span>
                <p className="text-sm text-stone-700">
                  Scroll down and tap{" "}
                  <strong>&quot;Add to Home Screen&quot;</strong>
                </p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-green-700 text-white rounded-full text-xs font-bold">
                  3
                </span>
                <p className="text-sm text-stone-700">
                  Tap <strong>&quot;Add&quot;</strong> to confirm
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-400 italic mb-4">
              The app will appear on your home screen for quick access.
            </p>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
