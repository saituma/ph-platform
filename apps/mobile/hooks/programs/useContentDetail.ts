import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

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
  posterUrl?: string | null;
  durationSec?: number | null;
  allowVideoUpload?: boolean | null;
  metadata?: ExerciseMetadata | null;
};

function mapContentItem(raw: any): ContentItem | null {
  if (!raw) return null;
  return {
    title: raw.title ?? "Program Content",
    body: raw.body ?? "",
    completed: Boolean(raw.completed),
    videoUrl: raw.videoUrl ?? null,
    posterUrl: (raw as { posterUrl?: string | null }).posterUrl ?? null,
    durationSec: (raw as { durationSec?: number | null }).durationSec ?? null,
    allowVideoUpload: raw.allowVideoUpload ?? false,
    metadata: raw.metadata ?? null,
  };
}

export function useContentDetail(token: string | null, contentId: string) {
  const queryClient = useQueryClient();
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const [rpe, setRpe] = useState("");
  const [soreness, setSoreness] = useState("");
  const [fatigue, setFatigue] = useState("");
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);
  const [checkinSaved, setCheckinSaved] = useState(false);

  const { data: item = null, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.programs.contentDetail(contentId),
    queryFn: async () => {
      const data = await apiRequest<{ item?: any }>(`/program-section-content/${contentId}`, {
        token: token!,
      });
      return mapContentItem(data.item);
    },
    enabled: Boolean(token) && Boolean(contentId),
    staleTime: 2 * 60 * 1000,
  });

  const error = queryError
    ? (queryError instanceof Error ? queryError.message : "Failed to load content.")
    : (!isLoading && !item && Boolean(token) && Boolean(contentId))
      ? "Content not found."
      : null;

  const load = useCallback(async (_force = false) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.programs.contentDetail(contentId) });
  }, [queryClient, contentId]);

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
      queryClient.setQueryData<ContentItem | null>(
        queryKeys.programs.contentDetail(contentId),
        (prev) => prev ? { ...prev, completed: true } : prev,
      );
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
  }, [contentId, rpe, soreness, fatigue, checkinNotes, isSubmittingCheckin, token, queryClient]);

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
