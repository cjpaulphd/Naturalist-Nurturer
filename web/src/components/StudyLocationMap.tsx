"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  StudyLocation,
  getStudyLocations,
  formatCategorySummary,
} from "@/lib/location-tracker";

/**
 * Build popup HTML for a study location marker.
 */
function buildPopupContent(loc: StudyLocation): string {
  const totalSpecies = loc.speciesIds.length;
  const categories = formatCategorySummary(loc);
  const lastDate = new Date(loc.lastStudied).toLocaleDateString();

  const catRows = categories
    .map(
      (c) =>
        `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:13px;">
          <span>${c.icon} ${c.label}</span>
          <span style="font-weight:600;margin-left:12px;">${c.count}</span>
        </div>`
    )
    .join("");

  return `
    <div style="min-width:160px;font-family:system-ui,sans-serif;">
      <div style="font-weight:700;font-size:15px;margin-bottom:4px;color:#292524;">
        ${loc.name}
      </div>
      <div style="font-size:12px;color:#78716c;margin-bottom:8px;">
        ${totalSpecies} species studied &middot; Last: ${lastDate}
      </div>
      <div style="border-top:1px solid #e7e5e4;padding-top:6px;">
        ${catRows}
      </div>
    </div>
  `;
}

export default function StudyLocationMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [locations] = useState<StudyLocation[]>(() => getStudyLocations());
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const flyToLocation = useCallback((loc: StudyLocation) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([loc.lat, loc.lng], 12, { duration: 0.8 });
    setShowDropdown(false);
  }, []);

  const fitAllLocations = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || locations.length === 0) return;
    if (locations.length === 1) {
      map.flyTo([locations[0].lat, locations[0].lng], 12, { duration: 0.8 });
    } else {
      const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
      map.flyToBounds(bounds.pad(0.2), { duration: 0.8 });
    }
    setShowDropdown(false);
  }, [locations]);

  useEffect(() => {
    if (!mapRef.current || locations.length === 0) return;

    // Avoid re-initializing if already created
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
      worldCopyJump: false,
      maxBoundsViscosity: 1.0,
    });
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
      noWrap: true,
    }).addTo(map);

    // Custom marker icon using a nature-themed circle
    const createIcon = (count: number) => {
      const size = Math.min(40, 24 + Math.log2(count + 1) * 6);
      return L.divIcon({
        className: "",
        html: `<div style="
          width:${size}px;height:${size}px;
          background:#16a34a;border:3px solid #fff;
          border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3);
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-weight:700;font-size:${size > 30 ? 13 : 11}px;
          font-family:system-ui,sans-serif;
        ">${count}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    };

    const markers: L.Marker[] = [];

    for (const loc of locations) {
      const marker = L.marker([loc.lat, loc.lng], {
        icon: createIcon(loc.speciesIds.length),
      })
        .addTo(map)
        .bindPopup(buildPopupContent(loc), {
          maxWidth: 250,
          className: "study-location-popup",
        });
      markers.push(marker);
    }

    // Fit map to show all markers, capturing the initial bounds so we can
    // lock zoom-out and pan range to a meaningful region.
    let initialBounds: L.LatLngBounds;
    if (markers.length === 1) {
      const center = L.latLng(locations[0].lat, locations[0].lng);
      initialBounds = center.toBounds(80000);
      map.setView([locations[0].lat, locations[0].lng], 12);
    } else {
      initialBounds = L.featureGroup(markers).getBounds().pad(0.2);
      map.fitBounds(initialBounds);
    }

    // Prevent zooming out past the default view (no empty-world panning) and
    // keep panning constrained to a region around the user's actual markers.
    const minZoom = map.getZoom();
    map.setMinZoom(minZoom);
    map.setMaxBounds(initialBounds.pad(0.5));

    // At the default fully-fit view there is nothing meaningful to pan to,
    // so disable dragging — this lets touch events pass through to native
    // page scroll on mobile. Re-enable dragging when the user explicitly
    // zooms in.
    const updateDragForZoom = () => {
      if (map.getZoom() <= minZoom) {
        map.dragging.disable();
      } else {
        map.dragging.enable();
      }
    };
    updateDragForZoom();
    map.on("zoomend", updateDragForZoom);

    return () => {
      map.off("zoomend", updateDragForZoom);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [locations]);

  if (locations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
        <h2 className="text-sm font-semibold text-stone-700 mb-2">
          Places You&apos;ve Explored
        </h2>
        <p className="text-xs text-stone-400 text-center py-4">
          Study species from different locations to see them on the map.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-stone-700">
              Places You&apos;ve Explored
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              {locations.length} location{locations.length !== 1 ? "s" : ""} &middot;{" "}
              {locations.reduce((sum, l) => sum + l.speciesIds.length, 0)} species
              studied
            </p>
          </div>
          {locations.length > 1 && (
            <div className="relative z-[1001]" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium hover:bg-stone-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Jump to
                <svg className={`w-3 h-3 transition-transform ${showDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showDropdown && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-stone-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  <button
                    onClick={fitAllLocations}
                    className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm text-green-700 font-medium border-b border-stone-200 transition-colors"
                  >
                    Show all locations
                  </button>
                  {[...locations]
                    .sort((a, b) => b.lastStudied - a.lastStudied)
                    .map((loc, i) => (
                      <button
                        key={i}
                        onClick={() => flyToLocation(loc)}
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
      </div>
      <div
        ref={mapRef}
        style={{ height: 260 }}
        className="w-full"
      />
    </div>
  );
}
