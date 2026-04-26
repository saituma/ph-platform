import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * AsyncStorage for TanStack Query persister (replaces MMKV adapter).
 */
export const mmkvAsyncAdapter = AsyncStorage;

const MAX_WATCH_HISTORY = 10;

export interface WatchEntry {
  videoId: string;
  title: string;
  thumbnail?: string;
  progress: number; // 0–1 percentage
  durationSec: number;
  lastWatched: number; // timestamp
}

interface WatchHistoryState {
  history: WatchEntry[];
  upsertEntry: (entry: WatchEntry) => void;
}

/**
 * Zustand store to synchronously serve watch history while persisting 
 * it to AsyncStorage in the background. 
 */
export const useWatchHistoryStore = create<WatchHistoryState>()(
  persist(
    (set) => ({
      history: [],
      upsertEntry: (entry) =>
        set((state) => {
          const list = state.history.filter((e) => e.videoId !== entry.videoId);
          list.unshift(entry);
          return { history: list.slice(0, MAX_WATCH_HISTORY) };
        }),
    }),
    {
      name: "video_watch_history",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** Upsert a video into the watch history imperatively */
export function upsertWatchEntry(entry: WatchEntry): void {
  useWatchHistoryStore.getState().upsertEntry(entry);
}
