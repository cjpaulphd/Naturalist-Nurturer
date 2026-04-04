"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Species, Category } from "@/lib/types";
import { CATEGORY_ICONS } from "@/lib/categories";
import {
  loadSpeciesData,
  searchSpecies,
  filterByCategory,
  sortByPrevalence,
  sortAlphabetical,
  sortByFamily,
  getPhotoPath,
} from "@/lib/species";
import { getCachedLocationSpecies, getLastLocation } from "@/lib/inat";
import CategorySelector from "@/components/CategorySelector";
import SpeciesDetail from "@/components/SpeciesDetail";

type SortMode = "prevalence" | "alphabetical" | "family";

function ScrollToTop() {
  const didScroll = useRef(false);
  useEffect(() => {
    if (!didScroll.current) {
      window.scrollTo(0, 0);
      didScroll.current = true;
    }
  }, []);
  return null;
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const [allSpecies, setAllSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("prevalence");
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);

  // Reset selected species when nav header is clicked (searchParams change)
  useEffect(() => {
    setSelectedSpecies(null);
  }, [searchParams]);

  useEffect(() => {
    const last = getLastLocation();
    if (last?.name) setLocationName(last.name);
  }, []);

  useEffect(() => {
    // Prefer location-based species if available, else fall back to static
    const cached = getCachedLocationSpecies();
    if (cached && cached.length > 0) {
      setAllSpecies(cached);
      setLoading(false);
    } else {
      loadSpeciesData().then((data) => {
        setAllSpecies(data);
        setLoading(false);
      });
    }
  }, []);

  const filteredSpecies = useMemo(() => {
    let result = filterByCategory(allSpecies, categories);
    result = searchSpecies(result, searchQuery);

    switch (sortMode) {
      case "alphabetical":
        return sortAlphabetical(result);
      case "family":
        return sortByFamily(result);
      default:
        return sortByPrevalence(result);
    }
  }, [allSpecies, categories, searchQuery, sortMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Species detail view
  if (selectedSpecies) {
    return (
      <div className="max-w-lg mx-auto px-4 py-4">
        <ScrollToTop />
        <SpeciesDetail
          species={selectedSpecies}
          allSpecies={allSpecies}
          onClose={() => setSelectedSpecies(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-stone-800">
          Species Field Guide
        </h2>
        {locationName && (
          <p className="text-sm text-green-700 mt-0.5">{locationName}</p>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name, scientific name, or family..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <CategorySelector selected={categories} onChange={setCategories} />
      </div>

      {/* Sort */}
      <div className="flex gap-2">
        {([
          ["prevalence", "By iNat Popularity"],
          ["alphabetical", "A\u2013Z"],
          ["family", "By Family"],
        ] as [SortMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              sortMode === mode
                ? "bg-green-700 text-white"
                : "bg-stone-200 text-stone-600 hover:bg-stone-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-stone-500">
        {filteredSpecies.length} species
      </p>

      {/* Species list */}
      <div className="space-y-2">
        {filteredSpecies.map((species) => (
          <SpeciesListItem
            key={species.id}
            species={species}
            onClick={() => setSelectedSpecies(species)}
          />
        ))}
      </div>

      {filteredSpecies.length === 0 && (
        <div className="text-center py-8">
          <p className="text-stone-400">No species match your search.</p>
        </div>
      )}
    </div>
  );
}

function SpeciesListItem({
  species,
  onClick,
}: {
  species: Species;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const photo = species.photos[0];
  const src = photo
    ? photo.filename
      ? getPhotoPath(species.id, photo.filename)
      : photo.url
    : null;

  const categoryIcon = CATEGORY_ICONS[species.category] || "🌿";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 bg-white rounded-lg border border-stone-200 hover:border-green-400 transition-colors text-left"
    >
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0 relative">
        {src && !imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={species.commonName}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-2xl">
            {categoryIcon}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-stone-800 text-sm truncate">
          {species.commonName}
        </div>
        <div className="text-xs text-stone-500 italic truncate">
          {species.scientificName}
        </div>
        <div className="flex gap-2 mt-0.5">
          <span className="text-[10px] text-stone-400">{species.family}</span>
          <span className="text-[10px] text-stone-400">
            #{species.prevalenceRank} &middot; {species.observationCount.toLocaleString()} obs
          </span>
        </div>
      </div>

      <span className="text-stone-300">&rsaquo;</span>
    </button>
  );
}
