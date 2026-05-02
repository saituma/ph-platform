import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { ProgramId } from "@/constants/program-details";
import { canAccessTier, programIdToTier } from "@/lib/planAccess";

export function useProgramAccess(token: string | null, programId: ProgramId) {
  const { apiUserRole, programTier } = useAppSelector((state) => state.user);

  const isAdminViewer = useMemo(() => {
    const r = String(apiUserRole ?? "");
    return ["admin", "superAdmin", "coach", "team_coach", "program_coach"].includes(r);
  }, [apiUserRole]);

  const requiredTier = programIdToTier(programId);

  const hasAccess = isAdminViewer || canAccessTier(programTier, requiredTier);

  return {
    programTier: programTier ?? "PHP",
    canMessageCoach: hasAccess,
    hasAccess,
    isPendingApproval: false,
    isAdminViewer,
    refreshBillingStatus: async () => {},
  };
}
