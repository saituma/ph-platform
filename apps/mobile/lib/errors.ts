/**
 * Shared error vocabulary for the mobile app.
 *
 * API errors arrive as "STATUS message" strings from api.ts. Parse them here
 * once, at the boundary, so the rest of the app works with structured types
 * instead of string-matching on "401 ".
 */

export type AppErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "server_error"
  | "network"
  | "timeout"
  | "unknown";

export type AppError = {
  code: AppErrorCode;
  message: string;
  status?: number;
};

/** Parse an Error thrown by apiRequest into a structured AppError. */
export function parseApiError(error: unknown): AppError {
  const raw = error instanceof Error ? error.message : String(error ?? "");

  const statusMatch = raw.match(/^(\d{3})\s+(.*)$/s);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    const message = statusMatch[2].trim();
    return { code: statusToCode(status), message, status };
  }

  if (
    raw.includes("Cannot reach API") ||
    raw.includes("Network request failed") ||
    raw.includes("Failed to fetch")
  ) {
    return { code: "network", message: "No connection. Check your network and try again." };
  }

  if (raw.includes("timed out")) {
    return { code: "timeout", message: "Request timed out. Try again." };
  }

  return { code: "unknown", message: raw || "An unexpected error occurred." };
}

function statusToCode(status: number): AppErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status >= 500) return "server_error";
  return "unknown";
}

export function isNetworkError(error: AppError): boolean {
  return error.code === "network" || error.code === "timeout";
}

export function isAuthError(error: AppError): boolean {
  return error.code === "unauthorized" || error.code === "forbidden";
}
