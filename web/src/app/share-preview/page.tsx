import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Share Preview - Naturalist Nurturer",
  description:
    "See how Naturalist Nurturer looks when shared on social media across mobile and desktop.",
};

/* Miniature replica of the OG card design used inside device mockups */
function OGCardPreview({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${className ?? ""}`}
      style={{
        background:
          "linear-gradient(150deg, #072b1e 0%, #0f4a2e 25%, #14532d 50%, #166534 75%, #1a7a3e 100%)",
        aspectRatio: "1200 / 630",
      }}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 inset-x-0 h-[3px]"
        style={{
          background:
            "linear-gradient(90deg, #22c55e, #86efac 40%, #4ade80 70%, #22c55e)",
        }}
      />

      {/* Decorative circles */}
      <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/[0.035]" />
      <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full bg-white/[0.035]" />
      <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/[0.03]" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
        <span className="text-[clamp(1.2rem,4vw,2.4rem)] leading-none">
          🌿
        </span>
        <span className="text-white font-extrabold text-[clamp(0.7rem,2.2vw,1.6rem)] mt-1 leading-tight">
          Naturalist Nurturer
        </span>
        <span className="text-white/80 text-[clamp(0.35rem,0.9vw,0.55rem)] mt-1 font-medium">
          Know Your Neighbors. Learn the Species Where You Are.
        </span>

        {/* Divider */}
        <div
          className="h-[2px] w-6 rounded-full mt-2 mb-2"
          style={{
            background:
              "linear-gradient(90deg, rgba(134,239,172,0), rgba(134,239,172,0.5), rgba(134,239,172,0))",
          }}
        />

        {/* Category pills */}
        <div className="flex flex-wrap justify-center gap-[3px] max-w-[85%]">
          {[
            "🌳 Trees",
            "🌸 Plants",
            "🐦 Birds",
            "🍄 Fungi",
            "🦋 Insects",
            "🦌 Mammals",
            "🦎 Reptiles",
            "🐸 Amphibians",
          ].map((label) => (
            <span
              key={label}
              className="bg-white/10 text-white/90 border border-white/15 rounded-full text-[clamp(0.25rem,0.6vw,0.4rem)] font-semibold px-[6px] py-[2px]"
            >
              {label}
            </span>
          ))}
        </div>

        <span className="absolute bottom-2 text-white/40 text-[clamp(0.2rem,0.5vw,0.35rem)] tracking-widest">
          natnurturer.org
        </span>
      </div>

      {/* Bottom accent */}
      <div
        className="absolute bottom-0 inset-x-0 h-[3px]"
        style={{
          background:
            "linear-gradient(90deg, #22c55e, #86efac 40%, #4ade80 70%, #22c55e)",
        }}
      />
    </div>
  );
}

/* ---------- Device Frames ---------- */

function MobileFrame() {
  return (
    <div className="flex flex-col items-center">
      <h3 className="text-stone-500 text-sm font-semibold uppercase tracking-wider mb-4">
        Mobile
      </h3>

      {/* Phone shell */}
      <div className="relative w-[260px] rounded-[2.2rem] border-[6px] border-stone-800 bg-stone-900 shadow-2xl shadow-stone-900/40 overflow-hidden">
        {/* Notch / Dynamic Island */}
        <div className="flex justify-center pt-2 pb-1 bg-stone-900">
          <div className="w-20 h-5 rounded-full bg-stone-800" />
        </div>

        {/* Screen area */}
        <div className="bg-white px-3 pb-4 pt-2">
          {/* Fake status bar */}
          <div className="flex items-center justify-between text-[10px] text-stone-400 mb-3 px-1">
            <span>9:41</span>
            <div className="flex gap-1 items-center">
              <div className="w-3 h-2 rounded-sm border border-stone-400" />
            </div>
          </div>

          {/* iMessage-style context */}
          <div className="space-y-2.5">
            {/* Incoming message bubble */}
            <div className="flex justify-start">
              <div className="bg-stone-100 rounded-2xl rounded-bl-md px-3 py-2 max-w-[85%]">
                <p className="text-[11px] text-stone-700 leading-snug">
                  Have you seen this nature app? 🌿
                </p>
              </div>
            </div>

            {/* Share preview card */}
            <div className="flex justify-start">
              <div className="max-w-[92%] rounded-xl overflow-hidden border border-stone-200 shadow-sm">
                <OGCardPreview />
                <div className="bg-white p-2.5">
                  <p className="text-[10px] text-stone-400 uppercase tracking-wide">
                    natnurturer.org
                  </p>
                  <p className="text-[12px] font-bold text-stone-800 mt-0.5 leading-tight">
                    Naturalist Nurturer
                  </p>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                    Know Your Neighbors. Learn the species where you are with
                    flashcards and quizzes.
                  </p>
                </div>
              </div>
            </div>

            {/* Reply bubble */}
            <div className="flex justify-end">
              <div className="bg-green-700 rounded-2xl rounded-br-md px-3 py-2 max-w-[75%]">
                <p className="text-[11px] text-white leading-snug">
                  This is so cool! Downloading now
                </p>
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-7 rounded-full border border-stone-200 bg-stone-50 px-3 flex items-center">
              <span className="text-[10px] text-stone-300">iMessage</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-green-700 flex items-center justify-center">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center py-2 bg-white">
          <div className="w-24 h-1 rounded-full bg-stone-300" />
        </div>
      </div>
    </div>
  );
}

function DesktopFrame() {
  return (
    <div className="flex flex-col items-center">
      <h3 className="text-stone-500 text-sm font-semibold uppercase tracking-wider mb-4">
        Desktop
      </h3>

      {/* Browser window */}
      <div className="w-full max-w-[520px] rounded-xl border border-stone-200 bg-white shadow-2xl shadow-stone-900/10 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 border-b border-stone-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white rounded-md border border-stone-200 px-3 py-1 text-xs text-stone-400 text-center">
              x.com
            </div>
          </div>
        </div>

        {/* Twitter/X-style post */}
        <div className="p-4 bg-white">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🌿</span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Post header */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-stone-900">
                  Nature Enthusiast
                </span>
                <span className="text-sm text-stone-400">@natfan42</span>
                <span className="text-sm text-stone-300">&middot;</span>
                <span className="text-sm text-stone-400">2h</span>
              </div>

              {/* Post text */}
              <p className="text-sm text-stone-800 mt-1 leading-relaxed">
                Just discovered this amazing app for learning local species!
                Perfect for hikes and nature walks. 🌳🐦🍄
              </p>

              {/* Embedded share card */}
              <div className="mt-3 rounded-xl overflow-hidden border border-stone-200">
                <OGCardPreview />
                <div className="p-3 bg-white border-t border-stone-100">
                  <p className="text-xs text-stone-400">natnurturer.org</p>
                  <p className="text-sm font-bold text-stone-800 mt-0.5">
                    Naturalist Nurturer
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                    Know Your Neighbors. Learn the species where you are with
                    flashcards and quizzes powered by iNaturalist.
                  </p>
                </div>
              </div>

              {/* Post action icons */}
              <div className="flex items-center gap-10 mt-3 text-stone-400">
                <div className="flex items-center gap-1.5 text-xs">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                  </svg>
                  <span>24</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M17 1l4 4-4 4" />
                    <path d="M3 11V9a4 4 0 014-4h14" />
                    <path d="M7 23l-4-4 4-4" />
                    <path d="M21 13v2a4 4 0 01-4 4H3" />
                  </svg>
                  <span>89</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="none"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                  <span>312</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Slack-style Desktop Preview ---------- */

function SlackFrame() {
  return (
    <div className="flex flex-col items-center">
      <h3 className="text-stone-500 text-sm font-semibold uppercase tracking-wider mb-4">
        Slack / Discord
      </h3>

      <div className="w-full max-w-[520px] rounded-xl border border-stone-200 bg-white shadow-2xl shadow-stone-900/10 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-stone-50 border-b border-stone-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4">
            <div className="text-sm font-bold text-stone-700 text-center">
              # nature-lovers
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="p-4 space-y-3">
          {/* User message */}
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-base">🏕️</span>
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-stone-900">
                  TrailExplorer
                </span>
                <span className="text-[11px] text-stone-400">2:34 PM</span>
              </div>
              <p className="text-sm text-stone-700 mt-0.5">
                Check out this app for learning local species! Really helpful
                for our field trips
              </p>

              {/* Link unfurl card */}
              <div className="mt-2 rounded-lg overflow-hidden border border-stone-200 flex bg-stone-50">
                <div className="w-1 bg-green-700 flex-shrink-0" />
                <div className="p-3 flex-1">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-stone-400">natnurturer.org</p>
                      <p className="text-sm font-bold text-blue-600 mt-0.5 hover:underline">
                        Naturalist Nurturer
                      </p>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        Know Your Neighbors. Learn the species where you are
                        with flashcards and quizzes powered by iNaturalist.
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <OGCardPreview className="max-w-[360px]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reaction */}
          <div className="pl-[46px]">
            <div className="inline-flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-full px-2 py-0.5 text-xs">
              <span>🌿</span>
              <span className="text-stone-500 font-medium">5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SharePreviewPage() {
  return (
    <div className="min-h-screen pb-16 pt-6 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-800">
            Share Preview
          </h1>
          <p className="text-stone-500 mt-2 max-w-lg mx-auto text-sm sm:text-base">
            Here&apos;s how Naturalist Nurturer looks when shared across
            platforms &mdash; on mobile and desktop.
          </p>
        </div>

        {/* Full-size OG image preview */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-stone-700 mb-3 text-center">
            Open Graph Image (1200 &times; 630)
          </h2>
          <div className="max-w-2xl mx-auto rounded-xl overflow-hidden shadow-lg border border-stone-200">
            <OGCardPreview />
          </div>
        </div>

        {/* Device mockups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start">
          {/* Mobile */}
          <MobileFrame />

          {/* Desktop - Twitter/X */}
          <DesktopFrame />
        </div>

        {/* Slack / Discord preview */}
        <div className="mt-12 flex justify-center">
          <div className="w-full max-w-xl">
            <SlackFrame />
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-800 hover:bg-green-700 text-white rounded-full text-sm font-semibold transition-colors"
          >
            &larr; Back to App
          </Link>
        </div>
      </div>
    </div>
  );
}
