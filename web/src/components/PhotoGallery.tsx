"use client";

import { useState } from "react";
import Image from "next/image";
import { SpeciesPhoto } from "@/lib/types";
import { getPhotoPath } from "@/lib/species";

interface PhotoGalleryProps {
  speciesId: number;
  photos: SpeciesPhoto[];
  showAttribution?: boolean;
}

export default function PhotoGallery({
  speciesId,
  photos,
  showAttribution = true,
}: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});

  if (photos.length === 0) {
    return (
      <div className="w-full aspect-[4/3] bg-stone-200 rounded-lg flex items-center justify-center text-stone-400">
        No photo available
      </div>
    );
  }

  const photo = photos[currentIndex];
  const src = photo.filename
    ? getPhotoPath(speciesId, photo.filename)
    : photo.url;

  return (
    <div className="relative w-full">
      <div className="relative w-full aspect-[4/3] bg-stone-100 rounded-lg overflow-hidden">
        {imgError[currentIndex] ? (
          <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm">
            Photo unavailable
          </div>
        ) : (
          <Image
            src={src}
            alt="Species photo"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
            onError={() =>
              setImgError((prev) => ({ ...prev, [currentIndex]: true }))
            }
          />
        )}
      </div>

      {photos.length > 1 && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 pointer-events-none">
          <button
            onClick={() =>
              setCurrentIndex(
                (currentIndex - 1 + photos.length) % photos.length
              )
            }
            className="pointer-events-auto w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Previous photo"
          >
            &#8249;
          </button>
          <button
            onClick={() =>
              setCurrentIndex((currentIndex + 1) % photos.length)
            }
            className="pointer-events-auto w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Next photo"
          >
            &#8250;
          </button>
        </div>
      )}

      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? "bg-green-700" : "bg-stone-300"
              }`}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}

      {showAttribution && photo.attribution && (
        <p className="text-[10px] text-stone-400 mt-1 text-center truncate">
          {photo.attribution}
        </p>
      )}
    </div>
  );
}
