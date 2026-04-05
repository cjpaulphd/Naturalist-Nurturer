import { NextRequest } from "next/server";

const XENO_CANTO_API = "https://xeno-canto.org/api/2/recordings";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  if (!query) {
    return Response.json({ recordings: [] });
  }

  try {
    const res = await fetch(
      `${XENO_CANTO_API}?query=${encodeURIComponent(query)}&page=1`,
      {
        headers: {
          "User-Agent":
            "NaturalistNurturer/1.0 (species flashcard app; Green River Preserve)",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error(`Xeno-canto API returned ${res.status} for query: ${query}`);
      return Response.json(
        { recordings: [], error: `API returned ${res.status}` },
        { status: 200 } // Return 200 so client can read the error field
      );
    }

    const data = await res.json();
    const rawRecordings = data.recordings || [];

    // Return fields we need, including sono for fallback URL construction
    const recordings = rawRecordings
      .slice(0, 5)
      .map(
        (rec: {
          id: string;
          file: string;
          "file-name": string;
          rec: string;
          lic: string;
          length: string;
          q: string;
          sono: { small: string; med: string; large: string; full: string };
        }) => ({
          id: rec.id,
          file: rec.file || "",
          fileName: rec["file-name"] || "",
          rec: rec.rec,
          lic: rec.lic,
          length: rec.length,
          q: rec.q,
          sonoSmall: rec.sono?.small || "",
        })
      );

    return Response.json({
      recordings,
      numRecordings: data.numRecordings || "0",
    });
  } catch (err) {
    console.error("Xeno-canto fetch failed:", err);
    return Response.json(
      { recordings: [], error: "fetch failed" },
      { status: 200 }
    );
  }
}
