import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";

export type AudienceSummary = {
  label: string;
  moduleCount: number;
  otherCount: number;
};

export function useAdminAudiences(token: string | null, canLoad: boolean) {
  const [audiences, setAudiences] = useState<AudienceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!token || !canLoad) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ items?: AudienceSummary[] }>(
          "/training-content-v2/admin/audiences",
          {
            token,
            forceRefresh,
            skipCache: forceRefresh,
            suppressStatusCodes: [403],
          }
        );
        setAudiences(res?.items ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load audiences");
      } finally {
        setLoading(false);
      }
    },
    [token, canLoad]
  );

  const createAudience = useCallback(
    async (label: string) => {
      if (!token || !canLoad) return;
      try {
        await apiRequest("/training-content-v2/admin/audiences", {
          method: "POST",
          token,
          body: { label },
        });
        await load(true);
      } catch (e) {
        throw e;
      }
    },
    [token, canLoad, load]
  );

  return { audiences, loading, error, load, createAudience };
}
