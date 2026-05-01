import { useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { useAdminMutation } from "./useAdminQuery";
import { OtherItem } from "./useAdminAudienceWorkspace";

export function useAdminOtherContent(token: string | null, canLoad: boolean) {
  const { run: createOther, busy: createBusy, error: createError } = useAdminMutation(
    useCallback(
      async (data: Partial<OtherItem>) => {
        if (!token || !canLoad) return;
        return apiRequest<{ id: number }>("/training-content-v2/others", {
          method: "POST",
          token,
          body: data,
        });
      },
      [token, canLoad],
    ),
  );

  const { run: updateOther, busy: updateBusy, error: updateError } = useAdminMutation(
    useCallback(
      async (params: { otherId: number; data: Partial<OtherItem> }) => {
        if (!token || !canLoad) return;
        await apiRequest(`/training-content-v2/others/${params.otherId}`, {
          method: "PUT",
          token,
          body: params.data,
        });
      },
      [token, canLoad],
    ),
  );

  const { run: deleteOther, busy: deleteBusy, error: deleteError } = useAdminMutation(
    useCallback(
      async (otherId: number) => {
        if (!token || !canLoad) return;
        await apiRequest(`/training-content-v2/others/${otherId}`, {
          method: "DELETE",
          token,
        });
      },
      [token, canLoad],
    ),
  );

  return {
    isBusy: createBusy || updateBusy || deleteBusy,
    error: createError ?? updateError ?? deleteError,
    createOther,
    updateOther: (otherId: number, data: Partial<OtherItem>) => updateOther({ otherId, data }),
    deleteOther,
  };
}
