"use client";

import { useState, useRef } from "react";
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
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const isDragging = useRef(false);
  const SWIPE_THRESHOLD = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    // Stop propagation to prevent card-level swipe from tracking photo swipes
    e.stopPropagation();
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (touchStartX.current === null || photos.length <= 1) {
      touchStartX.current = null;
      return;
    }
    const delta = touchDeltaX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0) {
        setCurrentIndex((currentIndex + 1) % photos.length);
      } else {
        setCurrentIndex((currentIndex - 1 + photos.length) % photos.length);
      }
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  // Mouse drag handlers for desktop swipe support
  const handleMouseDown = (e: React.MouseEvent) => {
    if (photos.length <= 1) return;
    isDragging.current = true;
    touchStartX.current = e.clientX;
    touchDeltaX.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    touchDeltaX.current = e.clientX - touchStartX.current;
  };

  const handleMouseUp = () => {
    if (!isDragging.current || touchStartX.current === null) {
      isDragging.current = false;
      return;
    }
    const delta = touchDeltaX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0) {
        setCurrentIndex((currentIndex + 1) % photos.length);
      } else {
        setCurrentIndex((currentIndex - 1 + photos.length) % photos.length);
      }
    }
    isDragging.current = false;
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  const handleMouseLeave = () => {
    if (isDragging.current) {
      isDragging.current = false;
      touchStartX.current = null;
      touchDeltaX.current = 0;
    }
  };

  if (photos.length === 0) {
    return (
      <div className="w-full aspect-[4/3] bg-stone-200 rounded-lg flex items-center justify-center text-stone-400">
        No photo available
      </div>
    );
  }

  const photo = photos[currentIndex];
  // Use local path if filename exists, otherwise use remote URL
  const src = photo.filename
    ? getPhotoPath(speciesId, photo.filename)
    : photo.url;

  return (
    <div
      className="relative w-full select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: photos.length > 1 ? "grab" : undefined }}
    >
      <div className="relative w-full aspect-[4/3] bg-stone-100 rounded-lg overflow-hidden">
        {imgError[currentIndex] ? (
          <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm">
            Photo unavailable
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt="Species photo"
            className="w-full h-full object-cover"
            draggable={false}
            onError={() =>
              setImgError((prev) => ({ ...prev, [currentIndex]: true }))
            }
            loading="lazy"
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
