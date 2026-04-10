export function isTransportFailure(error: unknown): boolean {
  if (error == null) return false;
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  ) {
    return true;
  }
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const m = error.message;
    return (
      m.includes("Network request failed") ||
      m.includes("Failed to fetch") ||
      m.includes("Cannot reach API") ||
      m.includes("Request timed out")
    );
  }
  return false;
}

export const extractErrorMessage = (text: string, payload: any) => {
  if (payload?.error || payload?.message) {
    return payload?.error || payload?.message;
  }

  const rawText = typeof text === "string" ? text : "";
  const trimmed = rawText.trim();
  const lower = trimmed.slice(0, 2048).toLowerCase();

  // Render / proxy errors may return full HTML. Avoid dumping it into logs/UI.
  const looksLikeHtml =
    lower.startsWith("<!doctype html") ||
    lower.includes("<html") ||
    lower.includes("<head") ||
    lower.includes("<body");
  if (looksLikeHtml) {
    if (lower.includes("bad gateway")) return "Bad Gateway";
    if (lower.includes("service unavailable")) return "Service unavailable";
    if (lower.includes("gateway timeout")) return "Gateway timeout";
    return "Server returned an HTML error response";
  }

  const cannotMatch = text.match(
    /Cannot\s+(GET|POST|PUT|PATCH|DELETE)\s+([^\s<]+)/i,
  );
  if (cannotMatch) {
    return `${cannotMatch[1].toUpperCase()} ${cannotMatch[2]} not found`;
  }

  if (trimmed.length > 400) {
    return `${trimmed.slice(0, 400)}…`;
  }
  return trimmed || "Request failed";
};
