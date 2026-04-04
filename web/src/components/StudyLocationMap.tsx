"use client";

import { useEffect, useRef, useState } from "react";
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
    });
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
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

    // Fit map to show all markers
    if (markers.length === 1) {
      map.setView([locations[0].lat, locations[0].lng], 12);
    } else {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    return () => {
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
        <h2 className="text-sm font-semibold text-stone-700">
          Places You&apos;ve Explored
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          {locations.length} location{locations.length !== 1 ? "s" : ""} &middot;{" "}
          {locations.reduce((sum, l) => sum + l.speciesIds.length, 0)} species
          studied
        </p>
      </div>
      <div
        ref={mapRef}
        style={{ height: 260 }}
        className="w-full"
      />
    </div>
  );
}
