"use client";

import { useState, useEffect, useRef } from "react";
import {
  getUserLocation,
  fetchSpeciesForLocation,
  getLastLocation,
  LocationCoords,
} from "@/lib/inat";
import { Species } from "@/lib/types";
import { getStudyLocations, StudyLocation } from "@/lib/location-tracker";
import LocationDisambiguator, {
  GeocodedLocation,
} from "./LocationDisambiguator";

interface LocationPickerProps {
  onSpeciesLoaded: (species: Species[], locationName: string) => void;
  onLoading: (loading: boolean) => void;
}

// Geocode a place name or zip code to candidate locations using Nominatim
async function geocodeSearch(query: string): Promise<GeocodedLocation[]> {
  const encoded = encodeURIComponent(query.trim());
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&addressdetails=1`,
    { headers: { "User-Agent": "NaturalistNurturer/1.0" } }
  );
  if (!res.ok) throw new Error("Geocoding request failed");
  const results = await res.json();
  if (!results || results.length === 0) {
    throw new Error("Location not found. Try a different city name or zip code.");
  }
  return results.map(
    (r: { lat: string; lon: string; display_name: string; type: string }) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      displayName: r.display_name || query,
      type: r.type || "",
    })
  );
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
  const [candidates, setCandidates] = useState<GeocodedLocation[] | null>(null);
  const [pendingQuery, setPendingQuery] = useState("");
  const [studyLocations, setStudyLocations] = useState<StudyLocation[]>([]);
  const [showPastLocations, setShowPastLocations] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const last = getLastLocation();
    if (last?.name) {
      setLocationName(last.name);
    } else {
      setLocationName("Green River Preserve, NC");
    }
    setStudyLocations(getStudyLocations());
  }, []);

  useEffect(() => {
    if (!showPastLocations) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPastLocations(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPastLocations]);

  const loadSpeciesForLocation = async (loc: GeocodedLocation) => {
    setSearching(true);
    setCandidates(null);
    setError(null);
    onLoading(true);

    try {
      // Build a short display name from the full display_name
      const parts = loc.displayName.split(",");
      const shortName =
        parts.length >= 2
          ? `${parts[0].trim()}, ${parts[1].trim()}`
          : parts[0]?.trim() || pendingQuery;

      const coords: LocationCoords = {
        lat: loc.lat,
        lng: loc.lng,
        name: shortName,
      };
      const result = await fetchSpeciesForLocation(coords);
      setLocationName(result.locationName);
      setSearchQuery("");
      setPendingQuery("");
      onSpeciesLoaded(result.species, result.locationName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      setError(msg);
    } finally {
      setSearching(false);
      onLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    setCandidates(null);
    onLoading(true);

    try {
      const results = await geocodeSearch(searchQuery);
      if (results.length === 1) {
        // Only one match — use it directly
        setPendingQuery(searchQuery);
        await loadSpeciesForLocation(results[0]);
      } else {
        // Multiple matches — show disambiguator
        setPendingQuery(searchQuery);
        setCandidates(results);
        setSearching(false);
        onLoading(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      setError(msg);
      setSearching(false);
      onLoading(false);
    }
  };

  const handleDisambiguationSelect = (loc: GeocodedLocation) => {
    loadSpeciesForLocation(loc);
  };

  const handleDisambiguationCancel = () => {
    setCandidates(null);
    setPendingQuery("");
  };

  const handleDetectLocation = async () => {
    setDetecting(true);
    setError(null);
    setCandidates(null);
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
    setCandidates(null);
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
          placeholder="Search any city worldwide..."
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

      {/* Location disambiguation list */}
      {candidates && candidates.length > 1 && (
        <LocationDisambiguator
          locations={candidates}
          query={pendingQuery}
          onSelect={handleDisambiguationSelect}
          onCancel={handleDisambiguationCancel}
        />
      )}

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

        {studyLocations.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowPastLocations(!showPastLocations)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Past Locations
              <svg className={`w-3 h-3 transition-transform ${showPastLocations ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showPastLocations && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-stone-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {studyLocations
                  .sort((a, b) => b.lastStudied - a.lastStudied)
                  .map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setShowPastLocations(false);
                        handleUseCoordinates({ lat: loc.lat, lng: loc.lng, name: loc.name });
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm text-stone-700 border-b border-stone-100 last:border-b-0 transition-colors"
                    >
                      <div className="font-medium">{loc.name}</div>
                      <div className="text-xs text-stone-400">
                        {loc.speciesIds.length} species studied
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded text-center">
          {error}
        </p>
      )}
    </div>
  );
}
