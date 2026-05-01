/**
 * Reusable lifecycle for admin data-fetch operations.
 *
 * Replaces the repeated useState(loading) + useState(error) + useCallback
 * pattern found across all 18 admin hooks. Each admin hook becomes 5-10 lines
 * of domain logic instead of 40-60 lines of identical lifecycle plumbing.
 */
import { useCallback, useState } from "react";
import { parseApiError } from "@/lib/errors";

export type AdminQueryState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

export type AdminQueryResult<T> = AdminQueryState<T> & {
  load: (forceRefresh?: boolean) => Promise<void>;
  setError: (msg: string | null) => void;
  setData: React.Dispatch<React.SetStateAction<T>>;
};

/**
 * @param fetcher  — async function that fetches and returns data
 * @param initial  — initial value for data (e.g. [] or null)
 * @param enabled  — when false, load() is a no-op (e.g. token not ready)
 */
export function useAdminQuery<T>(
  fetcher: (forceRefresh: boolean) => Promise<T>,
  initial: T,
  enabled: boolean,
): AdminQueryResult<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!enabled) return;
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher(forceRefresh);
        setData(result);
      } catch (e) {
        const parsed = parseApiError(e);
        setError(parsed.message);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, fetcher],
  );

  return { data, loading, error, load, setError, setData };
}

/**
 * useAdminMutation — for write operations (create/update/delete).
 * Returns a stable `run` function that sets busy/error state.
 */
export function useAdminMutation<TArgs, TResult = void>(
  mutator: (args: TArgs) => Promise<TResult>,
): {
  run: (args: TArgs) => Promise<TResult>;
  busy: boolean;
  error: string | null;
  clearError: () => void;
} {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (args: TArgs): Promise<TResult> => {
      setBusy(true);
      setError(null);
      try {
        return await mutator(args);
      } catch (e) {
        const parsed = parseApiError(e);
        setError(parsed.message);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutator],
  );

  return { run, busy, error, clearError: () => setError(null) };
}
