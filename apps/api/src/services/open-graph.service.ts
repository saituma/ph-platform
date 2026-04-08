import { promises as dns } from "node:dns";

type OpenGraphData = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

type CacheEntry = { value: OpenGraphData; expiresAt: number };
const cache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FETCH_TIMEOUT_MS = 6500;
const MAX_HTML_BYTES = 220_000;

function isPrivateIp(address: string): boolean {
  const ip = address.trim().toLowerCase();
  if (!ip) return true;
  if (ip === "localhost" || ip === "::1" || ip === "0.0.0.0") return true;

  // IPv4
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  }

  // IPv6 (coarse checks)
  if (ip.startsWith("fe80:")) return true; // link-local
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // unique local
  if (ip.startsWith("::ffff:")) {
    // IPv4-mapped
    return isPrivateIp(ip.replace(/^::ffff:/, ""));
  }
  return false;
}

async function assertHostnameIsPublic(hostname: string) {
  const host = hostname.trim().toLowerCase();
  if (!host) throw new Error("Invalid hostname");
  if (host === "localhost" || host.endsWith(".local")) {
    throw new Error("Blocked hostname");
  }

  const records = await dns.lookup(host, { all: true, verbatim: true });
  if (!records.length) throw new Error("DNS lookup failed");
  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new Error("Blocked hostname");
    }
  }
}

async function readTextWithLimit(
  res: Response,
  byteLimit: number,
  signal: AbortSignal,
): Promise<string> {
  const reader = res.body?.getReader?.();
  if (!reader) {
    // Fallback: this can exceed limit if body is huge, but Node fetch should expose streams.
    const text = await res.text();
    return text.slice(0, byteLimit);
  }

  const decoder = new TextDecoder("utf-8");
  let received = 0;
  let text = "";
  while (true) {
    if (signal.aborted) {
      throw new Error("Aborted");
    }
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > byteLimit) {
      try {
        reader.cancel();
      } catch {}
      break;
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

type MetaTag = { property?: string; name?: string; content?: string };

function parseMetaTags(html: string): MetaTag[] {
  const tags: MetaTag[] = [];
  const metaRegex = /<meta\b[^>]*>/gi;
  const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*["']([^"']*)["']/g;
  let match: RegExpExecArray | null;
  while ((match = metaRegex.exec(html)) !== null) {
    const rawTag = match[0];
    const attrs: Record<string, string> = {};
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(rawTag)) !== null) {
      attrs[attrMatch[1].toLowerCase()] = attrMatch[2];
    }
    const property = attrs["property"]?.trim();
    const name = attrs["name"]?.trim();
    const content = attrs["content"]?.trim();
    if (!content) continue;
    tags.push({ property, name, content });
  }
  return tags;
}

function pickMeta(meta: MetaTag[], key: string): string | null {
  const lowerKey = key.toLowerCase();
  for (const tag of meta) {
    if (tag.property && tag.property.toLowerCase() === lowerKey)
      return tag.content ?? null;
    if (tag.name && tag.name.toLowerCase() === lowerKey)
      return tag.content ?? null;
  }
  return null;
}

function parseTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!match) return null;
  const text = match[1]?.replace(/\s+/g, " ").trim();
  return text || null;
}

function normalizeUrl(input: string): URL {
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  return url;
}

function resolveMaybeRelativeUrl(
  candidate: string | null,
  base: string,
): string | null {
  if (!candidate) return null;
  try {
    return new URL(candidate, base).toString();
  } catch {
    return null;
  }
}

export async function fetchOpenGraph(
  urlString: string,
): Promise<OpenGraphData> {
  const normalized = normalizeUrl(urlString).toString();
  const cached = cache.get(normalized);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const url = new URL(normalized);
  await assertHostnameIsPublic(url.hostname);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "PH-App/1.0 (OpenGraphFetcher)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      const value: OpenGraphData = {
        url: normalized,
        title: url.hostname,
        description: null,
        image: null,
        siteName: url.hostname,
      };
      cache.set(normalized, { value, expiresAt: now + CACHE_TTL_MS });
      return value;
    }

    const html = await readTextWithLimit(
      res,
      MAX_HTML_BYTES,
      controller.signal,
    );
    const finalUrl = res.url || normalized;

    const meta = parseMetaTags(html);
    const ogTitle =
      pickMeta(meta, "og:title") ?? pickMeta(meta, "twitter:title");
    const ogDesc =
      pickMeta(meta, "og:description") ??
      pickMeta(meta, "twitter:description") ??
      pickMeta(meta, "description");
    const ogImage =
      pickMeta(meta, "og:image") ?? pickMeta(meta, "twitter:image");
    const ogSite = pickMeta(meta, "og:site_name");
    const title = ogTitle ?? parseTitleTag(html);
    const image = resolveMaybeRelativeUrl(ogImage, finalUrl);

    const value: OpenGraphData = {
      url: pickMeta(meta, "og:url") ?? finalUrl,
      title: title?.slice(0, 180) ?? null,
      description: ogDesc?.slice(0, 320) ?? null,
      image,
      siteName: ogSite?.slice(0, 120) ?? url.hostname,
    };

    cache.set(normalized, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  } finally {
    clearTimeout(timeoutId);
  }
}

export type { OpenGraphData };
