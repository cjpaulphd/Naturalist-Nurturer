import { NextRequest } from "next/server";
import { SpeciesSound } from "@/lib/types";

/**
 * Bird sound search endpoint.
 *
 * Primary source: iNaturalist observation sounds (no API key required,
 * CC-licensed with attribution). Xeno-canto is used instead when a
 * XENO_CANTO_API_KEY env var is configured — their v3 API requires a
 * free key (the keyless v2 API this app originally used was retired,
 * which is why sound playback silently broke).
 *
 * Response shape: { sounds: SpeciesSound[] }
 */

const INAT_OBSERVATIONS_API = "https://api.inaturalist.org/v1/observations";
const XENO_CANTO_API = "https://xeno-canto.org/api/3/recordings";
const USER_AGENT =
  "NaturalistNurturer/1.0 (species flashcard app; Green River Preserve)";
const MAX_SOUNDS = 3;

// Any Creative Commons license is acceptable for in-app playback with
// attribution displayed. Excludes all-rights-reserved recordings.
const INAT_SOUND_LICENSES =
  "cc0,cc-by,cc-by-nc,cc-by-sa,cc-by-nc-sa,cc-by-nd,cc-by-nc-nd";

interface INatSound {
  file_url: string | null;
  attribution: string | null;
  license_code: string | null;
  file_content_type: string | null;
}

interface INatObservation {
  sounds?: INatSound[];
  user?: { login?: string };
}

async function fetchFromINaturalist(taxonId: string): Promise<SpeciesSound[]> {
  const params = new URLSearchParams({
    taxon_id: taxonId,
    sounds: "true",
    sound_license: INAT_SOUND_LICENSES,
    quality_grade: "research",
    order_by: "votes",
    order: "desc",
    per_page: "20",
  });

  const res = await fetch(`${INAT_OBSERVATIONS_API}?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`iNaturalist API returned ${res.status}`);
  }

  const data = await res.json();
  const observations: INatObservation[] = data.results || [];

  const sounds: SpeciesSound[] = [];
  const seenUrls = new Set<string>();

  for (const obs of observations) {
    // Take at most one sound per observation for variety across recordists
    const sound = (obs.sounds || []).find(
      (s) =>
        s.file_url &&
        (!s.file_content_type || s.file_content_type.startsWith("audio"))
    );
    if (!sound || !sound.file_url || seenUrls.has(sound.file_url)) continue;
    seenUrls.add(sound.file_url);

    const license = sound.license_code
      ? sound.license_code.toUpperCase()
      : "CC";
    sounds.push({
      // iNaturalist media hosts allow direct playback; no proxy needed
      url: sound.file_url,
      attribution:
        sound.attribution ||
        `(c) ${obs.user?.login || "iNaturalist observer"}, ${license}, via iNaturalist`,
      filename: "",
      duration: null,
    });

    if (sounds.length >= MAX_SOUNDS) break;
  }

  return sounds;
}

interface XenoCantoRecording {
  id: string;
  file: string;
  rec: string;
  lic: string;
  length: string;
  q: string;
}

function parseXenoCantoDuration(length: string): number | null {
  if (!length) return null;
  const parts = length.split(":").map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

async function fetchFromXenoCanto(
  scientificName: string,
  apiKey: string
): Promise<SpeciesSound[]> {
  // v3 query syntax: sp:"Genus species" (quotes required for exact match)
  const safeName = scientificName.replace(/"/g, "");
  const query = `sp:"${safeName}"`;
  const params = new URLSearchParams({ query, key: apiKey });

  const res = await fetch(`${XENO_CANTO_API}?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Xeno-canto API returned ${res.status}`);
  }

  const data = await res.json();
  const recordings: XenoCantoRecording[] = data.recordings || [];

  // Best quality first: A, then B, then everything else
  const qualityRank = (q: string) => {
    const upper = (q || "").toUpperCase();
    if (upper === "A") return 0;
    if (upper === "B") return 1;
    return 2;
  };
  recordings.sort((a, b) => qualityRank(a.q) - qualityRank(b.q));

  return recordings.slice(0, MAX_SOUNDS).map((rec) => {
    const fileUrl =
      rec.file && rec.file.startsWith("//")
        ? "https:" + rec.file
        : rec.file || `https://xeno-canto.org/${rec.id}/download`;
    return {
      // Xeno-canto blocks hotlinking, so route through our audio proxy
      url: `/api/sounds/audio?url=${encodeURIComponent(fileUrl)}`,
      attribution: `${rec.rec || "Unknown"}, XC${rec.id}, xeno-canto.org, ${rec.lic || "CC"}`,
      filename: "",
      duration: parseXenoCantoDuration(rec.length),
    };
  });
}

export async function GET(request: NextRequest) {
  const taxonId = request.nextUrl.searchParams.get("taxonId");
  const query = request.nextUrl.searchParams.get("query");

  if (!taxonId && !query) {
    return Response.json({ sounds: [] });
  }

  const xcKey = process.env.XENO_CANTO_API_KEY;

  // Prefer Xeno-canto when a key is configured (dedicated bird sound
  // archive, generally higher quality recordings)
  if (xcKey && query) {
    try {
      const sounds = await fetchFromXenoCanto(query, xcKey);
      if (sounds.length > 0) {
        return Response.json({ sounds });
      }
    } catch (err) {
      console.error("Xeno-canto fetch failed, falling back to iNaturalist:", err);
    }
  }

  if (taxonId && /^\d+$/.test(taxonId)) {
    try {
      const sounds = await fetchFromINaturalist(taxonId);
      return Response.json({ sounds });
    } catch (err) {
      console.error("iNaturalist sound fetch failed:", err);
    }
  }

  return Response.json({ sounds: [] });
}
