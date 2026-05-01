import { useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { useAdminQuery, useAdminMutation } from "./useAdminQuery";

export type AudienceSummary = {
  label: string;
  moduleCount: number;
  otherCount: number;
};

export function useAdminAudiences(token: string | null, canLoad: boolean) {
  const fetcher = useCallback(
    (forceRefresh: boolean) =>
      apiRequest<{ items?: AudienceSummary[] }>(
        "/training-content-v2/admin/audiences",
        { token, forceRefresh, skipCache: forceRefresh, suppressStatusCodes: [403] },
      ).then((res) => res?.items ?? []),
    [token],
  );

  const { data: audiences, loading, error, load, setError } = useAdminQuery(
    fetcher,
    [] as AudienceSummary[],
    Boolean(token) && canLoad,
  );

  const { run: createAudience } = useAdminMutation(
    useCallback(
      async (label: string) => {
        await apiRequest("/training-content-v2/admin/audiences", {
          method: "POST",
          token,
          body: { label },
        });
        await load(true);
      },
      [token, load],
    ),
  );

  return { audiences, loading, error, setError, load, createAudience };
}
