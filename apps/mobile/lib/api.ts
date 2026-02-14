type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
  if (!baseUrl) {
    throw new Error("API base URL not configured");
  }

  const url = `${baseUrl}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new Error(`Cannot reach API at ${url}. ${message}`);
  }

  const text = await res.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!res.ok) {
    let message = payload?.error || payload?.message || text || "Request failed";
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
    console.warn("API error", { url, status: res.status, message });
    throw new Error(`${res.status} ${message}`);
  }
  if (payload === null) {
    console.warn("API invalid response", { url, status: res.status, text });
    throw new Error("Invalid response from server");
  }
  return payload as T;
}
