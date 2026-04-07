"use client";

import { useState } from "react";
import { Species } from "@/lib/types";
import PhotoGallery from "./PhotoGallery";
import SoundPlayer from "./SoundPlayer";
import TaxonomyChart from "./TaxonomyChart";

interface SpeciesDetailProps {
  species: Species;
  allSpecies?: Species[];
  onClose?: () => void;
}

export default function SpeciesDetail({ species, allSpecies = [], onClose }: SpeciesDetailProps) {
  const [showLearnMore, setShowLearnMore] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-lg mx-auto">
      <PhotoGallery speciesId={species.id} photos={species.photos} />

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-800">
              {species.commonName}
            </h2>
            {species.indigenousNames && species.indigenousNames.length > 0 && (
              <div className="flex flex-wrap gap-x-2">
                {species.indigenousNames.map((n, i) => (
                  <span key={i} className="text-sm font-medium text-amber-700" title={n.language}>
                    {n.name}
                    <span className="text-xs font-normal text-amber-500 ml-1">({n.language})</span>
                  </span>
                ))}
              </div>
            )}
            <p className="text-sm italic text-stone-500">
              {species.scientificName}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 text-xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
            {species.category.charAt(0).toUpperCase() + species.category.slice(1)}
          </span>
          {species.family && species.family !== "Unknown" && (
            <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs">
              {species.family}
            </span>
          )}
          {species.nativeStatus && species.nativeStatus !== "unknown" && (
            <span className={`px-2 py-0.5 rounded text-xs ${
              species.nativeStatus === "native" || species.nativeStatus === "likely native"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-orange-50 text-orange-700"
            }`}>
              {species.nativeStatus}
            </span>
          )}
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
            #{species.prevalenceRank} iNaturalist Reported {species.category.charAt(0).toUpperCase() + species.category.slice(1)}
          </span>
          <span className="px-2 py-0.5 bg-stone-50 text-stone-500 rounded text-xs">
            {species.observationCount.toLocaleString()} observations
          </span>
        </div>

        {/* Taxonomy */}
        <TaxonomyChart species={species} allSpecies={allSpecies} />

        {/* Seasons */}
        {species.seasons && species.seasons.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <span className="text-xs text-stone-500">Active:</span>
            {species.seasons.map((season) => (
              <span
                key={season}
                className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs capitalize"
              >
                {season}
              </span>
            ))}
          </div>
        )}

        {species.keyFacts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-1">
              Key Facts
            </h3>
            <ul className="text-sm text-stone-600 space-y-1">
              {species.keyFacts.map((fact, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-green-600 flex-shrink-0">&#8226;</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {species.extendedFacts && species.extendedFacts.length > 0 && (
          <div>
            <button
              onClick={() => setShowLearnMore(!showLearnMore)}
              className="flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
            >
              <span className={`transition-transform duration-200 ${showLearnMore ? "rotate-90" : ""}`}>&#9654;</span>
              Learn More
            </button>
            {showLearnMore && (
              <ul className="mt-2 text-sm text-stone-600 space-y-1">
                {species.extendedFacts.map((fact, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-green-600 flex-shrink-0">&#8226;</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {species.identificationTips && (
          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-1">
              Identification Tips
            </h3>
            <p className="text-sm text-stone-600">
              {species.identificationTips}
            </p>
          </div>
        )}

        {species.habitat && (
          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-1">
              Habitat
            </h3>
            <p className="text-sm text-stone-600">{species.habitat}</p>
          </div>
        )}

        {species.sounds.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-1">
              Sounds
            </h3>
            <SoundPlayer speciesId={species.id} sounds={species.sounds} />
          </div>
        )}

      </div>
    </div>
  );
}
