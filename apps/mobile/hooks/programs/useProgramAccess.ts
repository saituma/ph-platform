import { useMemo, useCallback } from "react";
import { Alert } from "react-native";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMessagingAccessTiers, setProgramTier } from "@/store/slices/userSlice";
import { canUseCoachMessaging } from "@/lib/messagingAccess";
import { canAccessTier, programIdToTier } from "@/lib/planAccess";
import { apiRequest } from "@/lib/api";
import { ProgramId } from "@/constants/program-details";

export function useProgramAccess(token: string | null, programId: ProgramId) {
  const dispatch = useAppDispatch();
  const {
    programTier,
    messagingAccessTiers,
    latestSubscriptionRequest,
    apiUserRole,
  } = useAppSelector((state) => state.user);

  const canMessageCoach = useMemo(
    () => canUseCoachMessaging(programTier, messagingAccessTiers),
    [messagingAccessTiers, programTier],
  );

  const requiredTier = programIdToTier(programId);
  const isPendingApproval = latestSubscriptionRequest?.planTier === requiredTier && 
    latestSubscriptionRequest?.status === "pending_approval";

  const isAdminViewer = useMemo(() => 
    ["admin", "superAdmin", "coach"].includes(String(apiUserRole ?? "")),
    [apiUserRole]
  );

  const hasAccess = useMemo(() => 
    isAdminViewer || canAccessTier(programTier, requiredTier) || isPendingApproval,
    [isAdminViewer, programTier, requiredTier, isPendingApproval]
  );

  const refreshBillingStatus = useCallback(async () => {
    if (!token) return;
    try {
      const status = await apiRequest<{
        currentProgramTier?: string | null;
        messagingAccessTiers?: string[] | null;
      }>("/billing/status", {
        token,
        suppressStatusCodes: [401, 403, 404],
        skipCache: true,
      });
      dispatch(setProgramTier(status?.currentProgramTier ?? null));
      dispatch(
        setMessagingAccessTiers(
          Array.isArray(status?.messagingAccessTiers)
            ? status!.messagingAccessTiers!
            : ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"],
        ),
      );
    } catch {
      // silent fail
    }
  }, [dispatch, token]);

  return {
    programTier,
    canMessageCoach,
    hasAccess,
    isPendingApproval,
    isAdminViewer,
    refreshBillingStatus,
  };
}
