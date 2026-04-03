"use client";

import { useState, useEffect } from "react";
import {
  getUserLocation,
  fetchSpeciesForLocation,
  getLastLocation,
  LocationCoords,
} from "@/lib/inat";
import { Species } from "@/lib/types";

interface LocationPickerProps {
  onSpeciesLoaded: (species: Species[], locationName: string) => void;
  onLoading: (loading: boolean) => void;
}

export default function LocationPicker({
  onSpeciesLoaded,
  onLoading,
}: LocationPickerProps) {
  const [locationName, setLocationName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  // Check for last used location on mount
  useEffect(() => {
    const last = getLastLocation();
    if (last?.name) {
      setLocationName(last.name);
    }
  }, []);

  const handleDetectLocation = async () => {
    setDetecting(true);
    setError(null);
    onLoading(true);

    try {
      const coords = await getUserLocation();
      const result = await fetchSpeciesForLocation(coords);
      setLocationName(result.locationName);
      onSpeciesLoaded(result.species, result.locationName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to get location";
      setError(msg);
    } finally {
      setDetecting(false);
      onLoading(false);
    }
  };

  const handleUseCoordinates = async (coords: LocationCoords) => {
    setDetecting(true);
    setError(null);
    onLoading(true);

    try {
      const result = await fetchSpeciesForLocation(coords);
      setLocationName(result.locationName);
      onSpeciesLoaded(result.species, result.locationName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch species";
      setError(msg);
    } finally {
      setDetecting(false);
      onLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-stone-700">
          Your Location
        </h3>
        {locationName && (
          <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
            {locationName}
          </span>
        )}
      </div>

      {!locationName && !detecting && (
        <p className="text-xs text-stone-500 mb-3">
          Share your location to discover the most common species near you.
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleDetectLocation}
          disabled={detecting}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors disabled:opacity-50"
        >
          {detecting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Finding species...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {locationName ? "Update Location" : "Use My Location"}
            </>
          )}
        </button>

        {/* Quick preset: Green River Preserve */}
        <button
          onClick={() =>
            handleUseCoordinates({ lat: 35.25, lng: -82.61, name: "Green River Preserve, NC" })
          }
          disabled={detecting}
          className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
        >
          Green River Preserve
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded">
          {error}
        </p>
      )}
    </div>
  );
}
