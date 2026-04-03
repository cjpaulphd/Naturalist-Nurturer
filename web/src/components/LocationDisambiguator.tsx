"use client";

export interface GeocodedLocation {
  lat: number;
  lng: number;
  displayName: string;
  type: string;
}

interface LocationDisambiguatorProps {
  locations: GeocodedLocation[];
  query: string;
  onSelect: (location: GeocodedLocation) => void;
  onCancel: () => void;
}

export default function LocationDisambiguator({
  locations,
  query,
  onSelect,
  onCancel,
}: LocationDisambiguatorProps) {
  return (
    <div className="mt-2 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
      <div className="px-3 py-2 bg-stone-50 border-b border-stone-200">
        <p className="text-xs text-stone-600">
          Multiple locations found for <span className="font-semibold">&ldquo;{query}&rdquo;</span>. Which did you mean?
        </p>
      </div>
      <ul className="max-h-60 overflow-y-auto">
        {locations.map((loc, i) => (
          <li key={`${loc.lat}-${loc.lng}-${i}`}>
            <button
              onClick={() => onSelect(loc)}
              className="w-full text-left px-3 py-2.5 hover:bg-green-50 transition-colors border-b border-stone-100 last:border-b-0 focus:outline-none focus:bg-green-50"
            >
              <span className="block text-sm text-stone-800">
                {loc.displayName}
              </span>
              <span className="block text-xs text-stone-400 mt-0.5">
                {loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}
                {loc.type ? ` \u00B7 ${loc.type}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="px-3 py-2 bg-stone-50 border-t border-stone-200">
        <button
          onClick={onCancel}
          className="text-xs text-stone-500 hover:text-stone-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
