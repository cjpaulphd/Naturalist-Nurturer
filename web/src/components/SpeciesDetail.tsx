"use client";

import { Species } from "@/lib/types";
import PhotoGallery from "./PhotoGallery";
import SoundPlayer from "./SoundPlayer";
import TaxonomyChart from "./TaxonomyChart";

interface SpeciesDetailProps {
  species: Species;
  allSpecies?: Species[];
  onClose?: () => void;
}

const CATEGORY_LABELS = {
  tree: "Tree",
  plant: "Plant",
  bird: "Bird",
};

export default function SpeciesDetail({ species, allSpecies = [], onClose }: SpeciesDetailProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-lg mx-auto">
      <PhotoGallery speciesId={species.id} photos={species.photos} />

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-800">
              {species.commonName}
            </h2>
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

        <div className="flex gap-2 flex-wrap">
          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
            {CATEGORY_LABELS[species.category]}
          </span>
          <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs">
            {species.family}
          </span>
          {species.nativeStatus !== "unknown" && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs">
              {species.nativeStatus}
            </span>
          )}
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
            #{species.prevalenceRank} in area
          </span>
        </div>

        {/* Taxonomy */}
        {species.order && (
          <TaxonomyChart species={species} allSpecies={allSpecies} />
        )}

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

        <p className="text-[10px] text-stone-400 pt-2">
          {species.observationCount} observations in this area
        </p>
      </div>
    </div>
  );
}
