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
  const cannotMatch = text.match(
    /Cannot\s+(GET|POST|PUT|PATCH|DELETE)\s+([^\s<]+)/i,
  );
  if (cannotMatch) {
    return `${cannotMatch[1].toUpperCase()} ${cannotMatch[2]} not found`;
  }
  return text || "Request failed";
};
