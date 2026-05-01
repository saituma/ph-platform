import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type GiphyFixedWidthSmall = {
  url?: string;
};

type GiphyOriginal = {
  url?: string;
};

type GiphyResult = {
  id: string;
  images?: {
    fixed_width_small?: GiphyFixedWidthSmall;
    original?: GiphyOriginal;
  };
};

type GiphySearchResponse = {
  data?: GiphyResult[];
};

const DEFAULT_GIPHY_BETA_KEY = "dc6zaTOxFJmzC";

function getGiphyApiKey(): string {
  return process.env.GIPHY_API_KEY ?? process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? DEFAULT_GIPHY_BETA_KEY;
}

export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();

  const apiKey = getGiphyApiKey();
  const url = new URL(query ? "https://api.giphy.com/v1/gifs/search" : "https://api.giphy.com/v1/gifs/trending");
  url.searchParams.set("api_key", apiKey);
  if (query) {
    url.searchParams.set("q", query);
  }
  url.searchParams.set("limit", "24");
  url.searchParams.set("offset", "0");
  url.searchParams.set("rating", "pg-13");
  url.searchParams.set("lang", "en");
  url.searchParams.set("bundle", "messaging_non_clips");

  try {
    const response = await fetch(url.toString(), { next: { revalidate: 300 } });
    const payload = (await response.json().catch(() => null)) as GiphySearchResponse | null;
    if (!response.ok) {
      return NextResponse.json(
        {
          error: "GIPHY search failed",
          status: response.status,
          results: [],
        },
        { status: 502 },
      );
    }

    const items = Array.isArray(payload?.data) ? payload.data : [];
    const results = items
      .map((item) => {
        const previewUrl = item.images?.fixed_width_small?.url;
        const urlValue = item.images?.original?.url;
        if (!previewUrl || !urlValue) return null;
        return {
          id: item.id,
          previewUrl,
          url: urlValue,
        };
      })
      .filter((item): item is { id: string; previewUrl: string; url: string } => Boolean(item));

    return NextResponse.json({ results }, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Could not reach GIPHY",
        results: [],
      },
      { status: 502 },
    );
  }
}
