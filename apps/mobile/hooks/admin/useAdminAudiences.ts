import { useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAdminQuery, useAdminMutation } from "./useAdminQuery";

export type AudienceSummary = {
  label: string;
  moduleCount: number;
  otherCount: number;
};

export function useAdminAudiences(token: string | null, canLoad: boolean) {
  const fetcher = useCallback(
    () =>
      apiRequest<{ items?: AudienceSummary[] }>(
        "/training-content-v2/admin/audiences",
        { token, forceRefresh: true, suppressStatusCodes: [403] },
      ).then((res) => res?.items ?? []),
    [token],
  );

  const { data: audiences, loading, error, load, setError } = useAdminQuery(
    queryKeys.admin.audiences(),
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
