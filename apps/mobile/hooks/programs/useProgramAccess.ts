import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { ProgramId } from "@/constants/program-details";

export function useProgramAccess(token: string | null, programId: ProgramId) {
  const {
    apiUserRole,
  } = useAppSelector((state) => state.user);

  const canMessageCoach = true;

  const isAdminViewer = useMemo(() => 
    ["admin", "superAdmin", "coach"].includes(String(apiUserRole ?? "")),
    [apiUserRole]
  );

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
