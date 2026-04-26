import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { mmkvAsyncAdapter } from "./mmkv";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes — garbage collection
    },
  },
});

/** Persists the React Query cache to MMKV for instant rehydration on cold start. */
export const queryPersister = createAsyncStoragePersister({
  storage: mmkvAsyncAdapter,
  key: "ph-query-cache",
});
