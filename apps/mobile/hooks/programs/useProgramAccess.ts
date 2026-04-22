import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { ProgramId } from "@/constants/program-details";

export function useProgramAccess(token: string | null, programId: ProgramId) {
  const {
    apiUserRole,
  } = useAppSelector((state) => state.user);

  const canMessageCoach = true;

  const isAdminViewer = useMemo(() => {
    const r = String(apiUserRole ?? "");
    return ["admin", "superAdmin", "coach", "team_coach", "program_coach"].includes(r);
  }, [apiUserRole]);

  const hasAccess = true;

  const refreshBillingStatus = async () => {};

  return {
    programTier: "PHP",
    canMessageCoach,
    hasAccess,
    isPendingApproval: false,
    isAdminViewer,
    refreshBillingStatus,
  };
}
