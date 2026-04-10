import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import { fetchHomeContent, HomeContentPayload } from "@/services/home/homeService";

export type WelcomeHeroState = "loading" | "ready" | "fallback" | "error";

export function useHomeContent(token: string | null, bootstrapReady: boolean) {
  const [homeContent, setHomeContent] = useState<HomeContentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (forceRefresh = false) => {
    if (!token || !bootstrapReady) return;
    setIsLoading(true);
    try {
      const content = await fetchHomeContent(token, forceRefresh);
      if (isMountedRef.current) {
        setHomeContent(content);
        setError(null);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message ?? "Failed to load home content");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        hasLoadedRef.current = true;
      }
    }
  }, [bootstrapReady, token]);

  useEffect(() => {
    isMountedRef.current = true;
    if (bootstrapReady && token && !hasLoadedRef.current) {
      const task = InteractionManager.runAfterInteractions(() => {
        void load();
      });
      return () => {
        task?.cancel?.();
        isMountedRef.current = false;
      };
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [bootstrapReady, load, token]);

  const welcomeHeroState = ((): WelcomeHeroState => {
    if (isLoading && !homeContent && !error) return "loading";
    if (error) return "error";
    if (homeContent?.welcome || homeContent?.headline) return "ready";
    return "fallback";
  })();

  return {
    homeContent,
    error,
    isLoading,
    load,
    welcomeHeroState,
  };
}
