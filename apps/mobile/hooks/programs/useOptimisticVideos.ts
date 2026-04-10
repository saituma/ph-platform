import { useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OptimisticUpload } from "@/types/video-upload";

export function useOptimisticVideos(userId: string | number | undefined, sectionContentId?: number | null) {
  const [optimisticUploads, setOptimisticUploads] = useState<OptimisticUpload[]>([]);

  const pendingKey = useMemo(() => {
    const base = userId ?? "me";
    return sectionContentId
      ? `video-upload:pending:${base}:section:${sectionContentId}`
      : `video-upload:pending:${base}`;
  }, [userId, sectionContentId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(pendingKey);
        if (!raw || cancelled) return;
        const items = JSON.parse(raw) as OptimisticUpload[];
        if (Array.isArray(items) && items.length) {
          setOptimisticUploads(prev => prev.length ? prev : items.map(u => ({ ...u, progress: u.progress ?? 1 })));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [pendingKey]);

  useEffect(() => {
    const persist = async () => {
      try {
        const toStore = optimisticUploads.filter(u => u.publicUrl).map(u => ({
          ...u,
          uri: u.publicUrl ?? u.uri,
          progress: u.progress ?? 1,
        }));
        await AsyncStorage.setItem(pendingKey, JSON.stringify(toStore));
      } catch {}
    };
    void persist();
  }, [optimisticUploads, pendingKey]);

  return { optimisticUploads, setOptimisticUploads };
}
