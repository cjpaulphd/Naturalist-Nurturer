"use client";

interface WelcomePopupProps {
  onClose: () => void;
}

export default function WelcomePopup({ onClose }: WelcomePopupProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6 space-y-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center">
          <p className="text-4xl mb-1">🌿</p>
          <h2 className="text-xl font-bold text-stone-800">
            Welcome to Naturalist Nurturer!
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Get to know the species around you.
          </p>
          <p className="text-xs text-stone-400 mt-2">
            Powered by{" "}
            <a
              href="https://www.inaturalist.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-700 transition-colors"
            >
              iNaturalist
            </a>
            {" "}community observations, photos, and species data.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3 text-sm text-stone-600">
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">1</span>
            <p><span className="font-medium text-stone-700">Set your location</span> — Share your GPS or search for a place to discover local species.</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">2</span>
            <p><span className="font-medium text-stone-700">Pick a category</span> — Choose trees, birds, wildflowers, mammals, and more.</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">3</span>
            <p><span className="font-medium text-stone-700">Start learning</span> — Tap <span className="font-semibold text-green-700">Learn</span> for flashcards or <span className="font-semibold text-blue-600">Challenge</span> to quiz yourself. Swipe or tap to advance between cards.</p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-green-700 hover:bg-green-800 transition-colors"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
