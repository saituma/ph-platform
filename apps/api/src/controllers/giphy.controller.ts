import type { Request, Response } from "express";
import { z } from "zod";

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

function getGiphyApiKey(): string {
  return (
    process.env.GIPHY_API_KEY ?? process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? ""
  ).trim();
}

const querySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(48).optional(),
});

export async function searchGiphy(req: Request, res: Response) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", results: [] });
  }

  const query = (parsed.data.q ?? "").trim();
  const limit = parsed.data.limit ?? 24;

  const apiKey = getGiphyApiKey();
  if (!apiKey) {
    return res.status(503).json({
      error: "GIPHY is not configured",
      hint: "Set GIPHY_API_KEY in the API service environment variables",
      results: [],
    });
  }
  const url = new URL(
    query
      ? "https://api.giphy.com/v1/gifs/search"
      : "https://api.giphy.com/v1/gifs/trending",
  );
  url.searchParams.set("api_key", apiKey);
  if (query) url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", "0");
  url.searchParams.set("rating", "pg-13");
  url.searchParams.set("lang", "en");
  url.searchParams.set("bundle", "messaging_non_clips");

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const payload = (await response
      .json()
      .catch(() => null)) as GiphySearchResponse | null;

    if (!response.ok) {
      return res.status(502).json({
        error: "GIPHY search failed",
        upstreamStatus: response.status,
        results: [],
      });
    }

    const items = Array.isArray(payload?.data) ? payload.data : [];
    const results = items
      .map((item) => {
        const previewUrl = item.images?.fixed_width_small?.url;
        const urlValue = item.images?.original?.url;
        if (!previewUrl || !urlValue) return null;
        return { id: item.id, previewUrl, url: urlValue };
      })
      .filter(
        (item): item is { id: string; previewUrl: string; url: string } =>
          Boolean(item),
      );

    return res.status(200).json({ results });
  } catch {
    return res.status(502).json({ error: "Could not reach GIPHY", results: [] });
  }
}
