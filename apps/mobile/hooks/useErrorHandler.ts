import { useCallback } from "react";
import { parseApiError, isAuthError, isNetworkError, type AppError } from "@/lib/errors";
import { clearCredentials } from "@/lib/auth/session";

type ErrorHandlerOptions = {
  /** Called on every error with the parsed AppError. */
  onError?: (error: AppError) => void;
  /** Called when the error is a network/timeout failure — good place to show a retry UI. */
  onNetwork?: (error: AppError) => void;
  /** If false, auth errors do NOT clear credentials (e.g. read-only views). Defaults to true. */
  clearSessionOnAuth?: boolean;
};

/**
 * Single hook for async error handling in screens and hooks.
 *
 * Returns a `handle(error)` function. Pass any caught error to it — it parses
 * the AppError, calls the appropriate callback, and handles auth invalidation.
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const { onError, onNetwork, clearSessionOnAuth = true } = options;

  const handle = useCallback(
    (raw: unknown) => {
      const error = parseApiError(raw);

      if (isAuthError(error) && clearSessionOnAuth) {
        void clearCredentials();
        return;
      }

      if (isNetworkError(error)) {
        onNetwork?.(error);
      }

      onError?.(error);
    },
    [onError, onNetwork, clearSessionOnAuth],
  );

  return { handle };
}
