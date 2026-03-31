"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { normalizeAudienceLabelInput } from "../../../../../components/admin/training-content-v2/api";
import { InseasonListPage } from "../inseason-list-page";
import { getOtherSectionConfig } from "../shared";

export default function OtherContentDetailPage() {
  const params = useParams<{ audienceLabel: string; type: string }>();
  const router = useRouter();
  const audienceLabel = useMemo(
    () => normalizeAudienceLabelInput(decodeURIComponent(String(params.audienceLabel ?? "All"))),
    [params.audienceLabel],
  );
  const type = String(params.type ?? "");
  const section = getOtherSectionConfig(type);

  useEffect(() => {
    if (section?.type === "inseason") return;
    router.replace(`/exercise-library/${encodeURIComponent(audienceLabel)}?view=others`);
  }, [audienceLabel, router, section?.type]);

  if (section?.type === "inseason") {
    return <InseasonListPage audienceLabel={audienceLabel} />;
  }

  return null;
}
