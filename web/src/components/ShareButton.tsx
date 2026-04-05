"use client";

import { useState, useEffect, useRef } from "react";

const SHARE_TITLE = "Naturalist Nurturer";
const SHARE_TEXT =
  "Try Naturalist Nurturer, a fun app to learn the species where you are!";

export default function ShareButton() {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  function getUrl() {
    return window.location.origin;
  }

  function handleShare() {
    // On mobile / browsers with full Web Share API, use native share sheet
    if (navigator.share) {
      navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: getUrl() });
    } else {
      // Desktop fallback: show share menu
      setShowMenu((v) => !v);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(getUrl());
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowMenu(false);
    }, 1500);
  }

  function mailShare() {
    const subject = encodeURIComponent(SHARE_TITLE);
    const body = encodeURIComponent(`${SHARE_TEXT}\n\n${getUrl()}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
    setShowMenu(false);
  }

  function twitterShare() {
    const text = encodeURIComponent(`${SHARE_TEXT} ${getUrl()}`);
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank");
    setShowMenu(false);
  }

  function facebookShare() {
    const url = encodeURIComponent(getUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
    setShowMenu(false);
  }

  function iMessageShare() {
    const body = encodeURIComponent(`${SHARE_TEXT} ${getUrl()}`);
    window.open(`sms:&body=${body}`, "_self");
    setShowMenu(false);
  }

  return (
    <div className="flex justify-center">
      <div className="relative" ref={menuRef}>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-stone-100 hover:bg-stone-200 rounded-full text-sm text-stone-600 transition-colors"
        >
          💚 Share This App ⬆️
        </button>

        {showMenu && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-white rounded-xl shadow-lg border border-stone-200 py-1 z-50 animate-in fade-in slide-in-from-bottom-2">
            <button
              onClick={copyLink}
              className="w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">{copied ? "✅" : "🔗"}</span>
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button
              onClick={mailShare}
              className="w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">✉️</span>
              Email
            </button>
            <button
              onClick={iMessageShare}
              className="w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">💬</span>
              Messages
            </button>
            <hr className="my-1 border-stone-100" />
            <button
              onClick={twitterShare}
              className="w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">𝕏</span>
              X / Twitter
            </button>
            <button
              onClick={facebookShare}
              className="w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">📘</span>
              Facebook
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
