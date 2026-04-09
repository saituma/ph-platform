import React, { createContext, useCallback, useContext, useMemo, useRef } from "react";

type PauseFn = () => void;

type VideoPlaybackController = {
  register: (key: string, pause: PauseFn) => () => void;
  pauseOthers: (activeKey: string) => void;
};

const VideoPlaybackControllerContext = createContext<VideoPlaybackController | null>(null);

export function VideoPlaybackControllerProvider({ children }: { children: React.ReactNode }) {
  const registryRef = useRef(new Map<string, PauseFn>());

  const register = useCallback((key: string, pause: PauseFn) => {
    registryRef.current.set(key, pause);
    return () => {
      const current = registryRef.current.get(key);
      if (current === pause) registryRef.current.delete(key);
    };
  }, []);

  const pauseOthers = useCallback((activeKey: string) => {
    for (const [key, pause] of registryRef.current.entries()) {
      if (key === activeKey) continue;
      try {
        pause();
      } catch {
        // Best-effort: ignore stale/unmounted player instances.
      }
    }
  }, []);

  const value = useMemo<VideoPlaybackController>(() => ({ register, pauseOthers }), [pauseOthers, register]);

  return <VideoPlaybackControllerContext.Provider value={value}>{children}</VideoPlaybackControllerContext.Provider>;
}

export function useVideoPlaybackController() {
  return useContext(VideoPlaybackControllerContext);
}

