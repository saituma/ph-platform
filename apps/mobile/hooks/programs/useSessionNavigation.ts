import { useMemo } from "react";
import { TrainingContentV2Workspace, Module, ModuleSession } from "./useSessionData";
import { ProgramId } from "@/constants/program-details";

export function useSessionNavigation(
  workspace: TrainingContentV2Workspace | null,
  module: Module | null,
  session: ModuleSession | null,
  programId: ProgramId
) {
  return useMemo(() => {
    if (!workspace?.modules || !module || !session) return null;

    const sortedModules = [...workspace.modules].sort((a, b) => a.order - b.order);
    const mIdx = sortedModules.findIndex(m => m.id === module.id);
    if (mIdx < 0) return null;

    const sortedSessions = [...module.sessions].sort((a, b) => a.order - b.order);
    const sIdx = sortedSessions.findIndex(s => s.id === session.id);

    // Next session in same module
    if (sIdx >= 0 && sIdx < sortedSessions.length - 1) {
      const next = sortedSessions[sIdx + 1];
      if (next && !next.locked) {
        return {
          label: "Open Next Session",
          path: `/programs/session/${next.id}?programId=${programId}&moduleId=${module.id}`,
        };
      }
    }

    // Next module
    for (let i = mIdx + 1; i < sortedModules.length; i++) {
      const nextM = sortedModules[i];
      if (!nextM || nextM.locked) continue;
      return {
        label: "Open Next Module",
        path: `/programs/module/${nextM.id}?programId=${programId}`,
      };
    }

    return null;
  }, [workspace, module, session, programId]);
}
