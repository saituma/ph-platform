"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  AudienceWorkspace,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../../../components/admin/training-content-v2/api";
import { isInseasonAgeGroup } from "./inseason-shared";

export function InseasonListPage({ audienceLabel }: { audienceLabel: string }) {
  const router = useRouter();
  const normalizedAudienceLabel = useMemo(() => normalizeAudienceLabelInput(audienceLabel), [audienceLabel]);
  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(normalizedAudienceLabel)}`);
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load in-season ages.");
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [normalizedAudienceLabel]);

  const inseasonGroup = workspace?.others.find((item) => item.type === "inseason") ?? null;
  const ageGroups = (inseasonGroup?.items ?? []).filter((item) => isInseasonAgeGroup(item.metadata));
  const currentAgeEntry = ageGroups.find(
    (item) => item.title.trim().toLowerCase() === normalizedAudienceLabel.trim().toLowerCase(),
  );

  useEffect(() => {
    if (!workspace || isRedirecting) return;
    const openCurrentAgeSchedule = async () => {
      setIsRedirecting(true);
      setError(null);
      try {
        if (currentAgeEntry) {
          router.replace(`/exercise-library/${encodeURIComponent(normalizedAudienceLabel)}/others/inseason/${currentAgeEntry.id}`);
          return;
        }

        const created = await trainingContentRequest<{ item: { id: number } }>("/others", {
          method: "POST",
          body: JSON.stringify({
            audienceLabel: normalizedAudienceLabel,
            type: "inseason",
            title: normalizedAudienceLabel,
            body: "Weekly in-season schedule.",
            scheduleNote: null,
            videoUrl: null,
            order: null,
            metadata: {
              kind: "inseason_age_group",
            },
          }),
        });
        const createdId = created?.item?.id;
        if (createdId) {
          router.replace(`/exercise-library/${encodeURIComponent(normalizedAudienceLabel)}/others/inseason/${createdId}`);
          return;
        }
        setError("Could not open in-season schedule for this age.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to open weekly schedule.");
      } finally {
        setIsRedirecting(false);
      }
    };
    void openCurrentAgeSchedule();
  }, [workspace, isRedirecting, currentAgeEntry, router, normalizedAudienceLabel]);

  if (!error) {
    return null;
  }

  return <p className="text-sm text-red-600">{error}</p>;
}
