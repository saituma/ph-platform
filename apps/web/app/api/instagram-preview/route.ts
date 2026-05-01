import { NextRequest, NextResponse } from "next/server";

const USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
];

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl || !rawUrl.includes("instagram.com")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  let html = "";
  for (const ua of USER_AGENTS) {
    try {
      const res = await fetch(rawUrl, {
        headers: {
          "User-Agent": ua,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        next: { revalidate: 3600 },
      });
      html = await res.text();
      if (html.includes("og:image") || html.includes('"contentUrl"')) break;
    } catch {
      continue;
    }
  }

  const og = (property: string): string | null => {
    const m =
      html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i")) ??
      html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, "i"));
    return m?.[1] ? decode(m[1]) : null;
  };

  let videoUrl: string | null = og("og:video:secure_url") ?? og("og:video");

  if (!videoUrl) {
    const ldMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of ldMatches) {
      try {
        const json = JSON.parse(match[1]) as Record<string, unknown>;
        const direct = json["contentUrl"] as string | undefined;
        const graph = json["@graph"] as Array<Record<string, unknown>> | undefined;
        const fromGraph = graph?.find((n) => n["contentUrl"])?.["contentUrl"] as string | undefined;
        const found = direct ?? fromGraph;
        if (found) {
          videoUrl = found;
          break;
        }
      } catch {
        continue;
      }
    }
  }

  if (!videoUrl) {
    const m = html.match(/"video_url"\s*:\s*"([^"]+cdninstagram[^"]+\.mp4[^"]*)"/);
    if (m) videoUrl = decode(m[1]);
  }

  return NextResponse.json({
    thumbnailUrl: og("og:image"),
    title: og("og:title"),
    description: og("og:description"),
    videoUrl,
  }, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200" },
  });
}

function decode(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\u0026/g, "&")
    .replace(/\\/g, "");
}
