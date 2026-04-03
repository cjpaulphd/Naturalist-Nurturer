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

// Geocode a place name or zip code to coordinates using Nominatim
async function geocodeSearch(query: string): Promise<LocationCoords & { displayName: string }> {
  const encoded = encodeURIComponent(query.trim());
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=us`,
    { headers: { "User-Agent": "NaturalistNurturer/1.0" } }
  );
  if (!res.ok) throw new Error("Geocoding request failed");
  const results = await res.json();
  if (!results || results.length === 0) {
    throw new Error("Location not found. Try a city name or zip code.");
  }
  const result = results[0];
  // Extract a short display name (city, state)
  const parts = (result.display_name || "").split(",");
  const displayName = parts.length >= 2
    ? `${parts[0].trim()}, ${parts[1].trim()}`
    : parts[0]?.trim() || query;

  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    name: displayName,
    displayName,
  };
}

export default function LocationPicker({
  onSpeciesLoaded,
  onLoading,
}: LocationPickerProps) {
  const [locationName, setLocationName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    onLoading(true);

    try {
      const geo = await geocodeSearch(searchQuery);
      const coords: LocationCoords = { lat: geo.lat, lng: geo.lng, name: geo.displayName };
      const result = await fetchSpeciesForLocation(coords);
      setLocationName(result.locationName);
      setSearchQuery("");
      onSpeciesLoaded(result.species, result.locationName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      setError(msg);
    } finally {
      setSearching(false);
      onLoading(false);
    }
  };

  const isLoading = detecting || searching;

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

      {/* Search by name or zip */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchQuery.trim()) handleSearch();
          }}
          placeholder="City, state or zip code..."
          className="flex-1 px-3 py-2 rounded-lg border border-stone-300 bg-white text-stone-700 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          onClick={handleSearch}
          disabled={isLoading || !searchQuery.trim()}
          className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors disabled:opacity-50"
        >
          {searching ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
          ) : (
            "Search"
          )}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleDetectLocation}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
        >
          {detecting ? (
            <>
              <span className="w-4 h-4 border-2 border-stone-500 border-t-transparent rounded-full animate-spin" />
              Finding...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Use My Location
            </>
          )}
        </button>

        <button
          onClick={() =>
            handleUseCoordinates({ lat: 35.25, lng: -82.61, name: "Green River Preserve, NC" })
          }
          disabled={isLoading}
          className="px-3 py-2 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
        >
          Green River Preserve
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded text-center">
          {error}
        </p>
      )}
    </div>
  );
}
