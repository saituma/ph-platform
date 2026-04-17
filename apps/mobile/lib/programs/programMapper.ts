import { ProgramSectionContent, TrainingContentV2Workspace } from "@/types/programs";
import { normalizeProgramTabLabel } from "@/constants/program-details";

export function mapTeamWorkspace(response: TrainingContentV2Workspace): TrainingContentV2Workspace {
  const tabs =
    Array.isArray(response?.tabs) && response.tabs.length
      ? response.tabs
      : ["Modules"];
  return { ...response, tabs };
}

export function mapPhpPlusTabs(tabs: string[] | undefined): string[] | null {
  if (!Array.isArray(tabs)) return null;
  return tabs.map((tab) => normalizeProgramTabLabel(String(tab)));
}

export function mapMergedSectionContent(responses: { items: ProgramSectionContent[] }[]): ProgramSectionContent[] {
  const merged = responses
    .flatMap((res) => res.items ?? [])
    .filter((item) => item && item.id);

  merged.sort((a, b) => {
    const orderA = Number.isFinite(a.order) ? (a.order as number) : 9999;
    const orderB = Number.isFinite(b.order) ? (b.order as number) : 9999;
    if (orderA !== orderB) return orderA - orderB;
    return String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
  });

  return merged;
}
