type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  suppressLog?: boolean;
  suppressStatusCodes?: number[];
};

const buildFallbackBaseUrl = (baseUrl: string) => {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (!trimmed.endsWith("/api")) {
    return null;
  }
  return trimmed.slice(0, -4);
};

const extractErrorMessage = (text: string, payload: any) => {
  if (payload?.error || payload?.message) {
    return payload?.error || payload?.message;
  }
  const cannotMatch = text.match(/Cannot\s+(GET|POST|PUT|PATCH|DELETE)\s+([^\s<]+)/i);
  if (cannotMatch) {
    return `${cannotMatch[1].toUpperCase()} ${cannotMatch[2]} not found`;
  }
  return text || "Request failed";
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
  if (!baseUrl) {
    throw new Error("API base URL not configured");
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${normalizedBaseUrl}${normalizedPath}`;
  const fallbackBaseUrl = buildFallbackBaseUrl(normalizedBaseUrl);
  const fallbackUrl = fallbackBaseUrl ? `${fallbackBaseUrl}${normalizedPath}` : null;

  const fetchRequest = async (requestUrl: string) =>
    fetch(requestUrl, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token.trim()}` } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

  let res: Response;
  try {
    res = await fetchRequest(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new Error(`Cannot reach API at ${url}. ${message}`);
  }

  let requestUrl = url;
  let text = await res.text();
  if (res.status === 404 && fallbackUrl) {
    try {
      const fallbackRes = await fetchRequest(fallbackUrl);
      // Use the fallback response whenever it is reachable so we surface
      // the real downstream status (401/400/etc.), not the initial route miss.
      res = fallbackRes;
      requestUrl = fallbackUrl;
      text = await fallbackRes.text();
    } catch {
      // keep original response if fallback is unreachable
    }
  }

  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!res.ok) {
    let message = extractErrorMessage(text, payload);
    const details =
      payload?.details?.fieldErrors || payload?.details?.formErrors || payload?.details;
    if (details) {
      try {
        const detailText = typeof details === "string" ? details : JSON.stringify(details);
        message = `${message}: ${detailText}`;
      } catch {
        // ignore detail formatting errors
      }
    }
    const shouldSuppress =
      options.suppressLog ||
      (options.suppressStatusCodes ?? []).includes(res.status);
    if (!shouldSuppress) {
      console.warn("API error", { url: requestUrl, status: res.status, message });
    }
    throw new Error(`${res.status} ${message}`);
  }
  if (payload === null) {
    console.warn("API invalid response", { url: requestUrl, status: res.status, text });
    throw new Error("Invalid response from server");
  }
  return payload as T;
}
