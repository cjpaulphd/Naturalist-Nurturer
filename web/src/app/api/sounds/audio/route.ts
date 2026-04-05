import { NextRequest } from "next/server";

/**
 * Server-side proxy for Xeno-canto audio files.
 * Avoids 403 / hotlinking blocks when the browser loads audio directly.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Only allow xeno-canto URLs to prevent open-proxy abuse
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  if (!parsed.hostname.endsWith("xeno-canto.org")) {
    return new Response("Only xeno-canto.org URLs are allowed", { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "NaturalistNurturer/1.0 (species flashcard app; Green River Preserve)",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return new Response("Failed to fetch audio", { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "audio/mpeg";

    return new Response(res.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Accept-Ranges": "bytes",
      },
    });
  } catch {
    return new Response("Failed to fetch audio", { status: 500 });
  }
}
