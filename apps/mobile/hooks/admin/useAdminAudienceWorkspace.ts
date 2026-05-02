import { useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { useAdminQuery } from "./useAdminQuery";

export type Metadata = {
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

export type SessionItem = {
  id: number;
  sessionId: number;
  blockType: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  allowVideoUpload?: boolean;
  metadata?: Metadata | null;
  order: number;
};

export type ModuleSession = {
  id: number;
  moduleId: number;
  title: string;
  dayLength: number;
  order: number;
  lockedForTiers: string[];
  items: SessionItem[];
};

export type Module = {
  id: number;
  audienceLabel: string;
  title: string;
  order: number;
  totalDayLength: number;
  lockedForTiers: string[];
  sessions: ModuleSession[];
};

export type ModuleLock = {
  id: number;
  audienceLabel: string;
  programTier: string;
  label: string;
  startModuleId: number;
};

export type OtherItem = {
  id: number;
  audienceLabel: string;
  type: string;
  title: string;
  body: string;
  scheduleNote?: string | null;
  videoUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  order: number;
};

export type OtherGroup = {
  type: string;
  label: string;
  enabled: boolean;
  items: OtherItem[];
};

export type AudienceWorkspace = {
  audienceLabel: string;
  modules: Module[];
  moduleLocks: ModuleLock[];
  others: OtherGroup[];
};

export function useAdminAudienceWorkspace(token: string | null, canLoad: boolean, audienceLabel: string) {
  const fetcher = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !audienceLabel) return null;
      const res = await apiRequest<AudienceWorkspace>(
        `/training-content-v2/admin?audienceLabel=${encodeURIComponent(audienceLabel)}`,
        { token, forceRefresh, skipCache: forceRefresh, suppressStatusCodes: [403] },
      );
      return res ?? null;
    },
    [token, audienceLabel],
  );

  const { data: workspace, loading, error, load } = useAdminQuery<AudienceWorkspace | null>(
    fetcher,
    null,
    Boolean(token && canLoad && audienceLabel),
  );

  return { workspace, loading, error, load };
}
