import { useState, useCallback, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api";

export type ExerciseMetadata = {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  steps?: string | null;
  cues?: string | null;
  progression?: string | null;
  regression?: string | null;
  category?: string | null;
  equipment?: string | null;
};

export type ContentItem = {
  title: string;
  body: string;
  completed?: boolean | null;
  videoUrl?: string | null;
  allowVideoUpload?: boolean | null;
  metadata?: ExerciseMetadata | null;
};

export function useContentDetail(token: string | null, contentId: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<ContentItem | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Check-in form state
  const [rpe, setRpe] = useState("");
  const [soreness, setSoreness] = useState("");
  const [fatigue, setFatigue] = useState("");
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);
  const [checkinSaved, setCheckinSaved] = useState(false);

  const lastLoadedRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const load = useCallback(async (force = false) => {
    if (!token || !contentId) {
      setIsLoading(false);
      setError("Content not available.");
      return;
    }
    const key = `${token}:${contentId}`;
    if (!force && lastLoadedRef.current === key) return;
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    try {
      setIsLoading(true);
      const data = await apiRequest<{ item?: any }>(`/program-section-content/${contentId}`, {
        token,
        forceRefresh: force,
        skipCache: true,
      });
      if (!data.item) {
        setItem(null);
        setError("Content not found.");
        return;
      }
      setItem({
        title: data.item.title ?? "Program Content",
        body: data.item.body ?? "",
        completed: Boolean(data.item.completed),
        videoUrl: data.item.videoUrl ?? null,
        allowVideoUpload: data.item.allowVideoUpload ?? false,
        metadata: data.item.metadata ?? null,
      });
      setError(null);
      lastLoadedRef.current = key;
    } catch (err: any) {
      setItem(null);
      setError(err?.message ?? "Failed to load content.");
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [contentId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitCheckin = useCallback(async () => {
    if (!token || !contentId || isSubmittingCheckin) return;

    const parseBoundedInt = (value: string, min: number, max: number) => {
      if (!value.trim()) return null;
      const num = Math.round(Number(value));
      if (!Number.isFinite(num) || num < min || num > max) return "invalid";
      return num;
    };

    const parsedRpe = parseBoundedInt(rpe, 1, 10);
    const parsedSoreness = parseBoundedInt(soreness, 0, 10);
    const parsedFatigue = parseBoundedInt(fatigue, 0, 10);

    if (parsedRpe === "invalid" || parsedSoreness === "invalid" || parsedFatigue === "invalid") {
      setCheckinError("Please enter valid numbers (RPE 1–10, soreness/fatigue 0–10).");
      return;
    }

    setIsSubmittingCheckin(true);
    setCheckinError(null);
    try {
      await apiRequest(
        `/program-section-content/${encodeURIComponent(String(contentId))}/complete`,
        {
          method: "POST",
          token,
          body: {
            rpe: parsedRpe,
            soreness: parsedSoreness,
            fatigue: parsedFatigue,
            notes: checkinNotes.trim() || null,
          },
        }
      );
      setCheckinSaved(true);
      setItem((prev) => (prev ? { ...prev, completed: true } : prev));
      setTimeout(() => {
        setShowCompleteModal(false);
        setCheckinSaved(false);
      }, 1200);
      setRpe("");
      setSoreness("");
      setFatigue("");
      setCheckinNotes("");
    } catch (err: any) {
      setCheckinError(err?.message ?? "Failed to save check-in.");
    } finally {
      setIsSubmittingCheckin(false);
    }
  }, [contentId, rpe, soreness, fatigue, checkinNotes, isSubmittingCheckin, token]);

  return {
    item,
    isLoading,
    error,
    load,
    showCompleteModal,
    setShowCompleteModal,
    form: {
      rpe, setRpe,
      soreness, setSoreness,
      fatigue, setFatigue,
      notes: checkinNotes, setNotes: setCheckinNotes,
      error: checkinError,
      isSubmitting: isSubmittingCheckin,
      saved: checkinSaved,
    },
    submitCheckin,
  };
}
