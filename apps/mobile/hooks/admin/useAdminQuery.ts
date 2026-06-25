import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useAdminQuery<T>(
  queryKey: readonly unknown[],
  fetcher: () => Promise<T>,
  initial: T,
  enabled: boolean,
): AdminQueryResult<T> {
  const queryClient = useQueryClient();
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: fetcher,
    enabled,
    staleTime: 2 * 60 * 1000,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    placeholderData: initial as any,
  });

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!enabled) return;
      if (forceRefresh) {
        await queryClient.invalidateQueries({ queryKey });
      }
      await refetch();
    },
    [enabled, queryClient, queryKey, refetch],
  );

  const setData: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (action) => {
      if (typeof action === "function") {
        const updater = action as (prev: T) => T;
        queryClient.setQueryData(queryKey, (prev: T | undefined) => updater(prev ?? initial));
      } else {
        queryClient.setQueryData(queryKey, action);
      }
    },
    [queryClient, queryKey, initial],
  );

  return {
    data: data ?? initial,
    loading: isLoading,
    error: overrideError ?? (error ? parseApiError(error).message : null),
    load,
    setError: setOverrideError,
    setData,
  };
}

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
    [mutator],
  );

  return { run, busy, error, clearError: () => setError(null) };
}
