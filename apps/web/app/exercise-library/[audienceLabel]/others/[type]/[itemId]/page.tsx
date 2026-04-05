"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { isProgramTierAudienceLabel, normalizeAudienceLabelInput } from "../../../../../../components/admin/training-content-v2/api";
import { InseasonSchedulePage } from "../../inseason-schedule-page";
import { getOtherSectionConfig } from "../../shared";

export default function OtherContentItemDetailPage() {
  const params = useParams<{ audienceLabel: string; type: string; itemId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const audienceLabel = useMemo(
    () => normalizeAudienceLabelInput(decodeURIComponent(String(params.audienceLabel ?? "All"))),
    [params.audienceLabel],
  );
  const fromAdultMode = searchParams.get("mode") === "adult" || isProgramTierAudienceLabel(audienceLabel);
  const type = String(params.type ?? "");
  const itemId = Number(params.itemId);
  const section = getOtherSectionConfig(type);

  if (section?.type === "inseason" && Number.isFinite(itemId)) {
    return <InseasonSchedulePage audienceLabel={audienceLabel} itemId={itemId} fromAdultMode={fromAdultMode} />;
  }

  useEffect(() => {
    if (!section) {
      router.replace(`/exercise-library/${encodeURIComponent(audienceLabel)}${fromAdultMode ? "?mode=adult" : ""}`);
      return;
    }
    router.replace(`/exercise-library/${encodeURIComponent(audienceLabel)}/others/${section.type}${fromAdultMode ? "?mode=adult" : ""}`);
  }, [audienceLabel, fromAdultMode, router, section]);

  return null;
}
