import { NextRequest } from "next/server";

// Domains that Xeno-canto audio files may be hosted on
const ALLOWED_HOSTS = [
  "xeno-canto.org",
  "xc-ant.org",
  "amazonaws.com",
  "cloudfront.net",
];

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTS.some(
    (h) => hostname === h || hostname.endsWith("." + h)
  );
}

/**
 * Server-side proxy for Xeno-canto audio files.
 * Avoids 403 / hotlinking blocks when the browser loads audio directly.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  if (!isAllowedHost(parsed.hostname)) {
    return new Response(`Host not allowed: ${parsed.hostname}`, { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "NaturalistNurturer/1.0 (species flashcard app; Green River Preserve)",
        Accept: "audio/mpeg, audio/*, */*",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!res.ok) {
      return new Response(`Audio fetch failed: ${res.status}`, {
        status: res.status,
      });
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
