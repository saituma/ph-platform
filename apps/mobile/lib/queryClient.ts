import { QueryClient, focusManager, MutationCache } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { AppState, Platform } from "react-native";
import type { AppStateStatus } from "react-native";
import { mmkvAsyncAdapter } from "./mmkv";
import {
  initMutationQueue,
  enqueueMutation,
  isNetworkError,
} from "./api/mutationQueue";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes — garbage collection
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, variables, _context, mutation) => {
      // Auto-queue failed mutations for retry when the failure is network-related.
      // Mutations must opt-in by setting meta.retryQueue with path and method.
      const meta = mutation.options.meta as
        | { retryQueue?: { path: string; method: "POST" | "PUT" | "PATCH" | "DELETE"; headers?: Record<string, string> } }
        | undefined;
      if (meta?.retryQueue && isNetworkError(error)) {
        enqueueMutation(
          meta.retryQueue.path,
          meta.retryQueue.method,
          variables,
          meta.retryQueue.headers,
        ).catch(() => {});
      }
    },
  }),
});

/**
 * Tell TanStack Query about app focus state changes so it can refetch stale
 * queries when the app returns to the foreground (respects refetchOnWindowFocus
 * setting above — currently disabled to avoid unnecessary mobile refetches).
 */
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== "web") {
    focusManager.setFocused(status === "active");
  }
}
AppState.addEventListener("change", onAppStateChange);

/** Persists the React Query cache to MMKV for instant rehydration on cold start. */
export const queryPersister = createAsyncStoragePersister({
  storage: mmkvAsyncAdapter,
  key: "ph-query-cache",
});

/* Boot the mutation retry queue (hydrates persisted entries, listens for foreground). */
initMutationQueue();
