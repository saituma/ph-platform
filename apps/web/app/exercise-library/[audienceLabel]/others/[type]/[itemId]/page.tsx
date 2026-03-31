"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { normalizeAudienceLabelInput } from "../../../../../../components/admin/training-content-v2/api";
import { InseasonSchedulePage } from "../../inseason-schedule-page";
import { getOtherSectionConfig } from "../../shared";

export default function OtherContentItemDetailPage() {
  const params = useParams<{ audienceLabel: string; type: string; itemId: string }>();
  const router = useRouter();
  const audienceLabel = useMemo(
    () => normalizeAudienceLabelInput(decodeURIComponent(String(params.audienceLabel ?? "All"))),
    [params.audienceLabel],
  );
  const type = String(params.type ?? "");
  const itemId = Number(params.itemId);
  const section = getOtherSectionConfig(type);

  if (section?.type === "inseason" && Number.isFinite(itemId)) {
    return <InseasonSchedulePage audienceLabel={audienceLabel} itemId={itemId} />;
  }

  useEffect(() => {
    router.replace(`/exercise-library/${encodeURIComponent(audienceLabel)}?view=others`);
  }, [audienceLabel, router]);

  return null;
}
