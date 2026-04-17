import { ProgramSectionContent, TrainingContentV2Workspace } from "@/types/programs";
import { normalizeProgramTabLabel } from "@/constants/program-details";
import { buildPlanPricing } from "@/lib/billing";

export function mapPublicPlans(plans: Array<{ id: number; tier: string; monthlyPrice?: string }>): {
  plansByTier: Record<string, number>;
  planDetailsByTier: Record<string, { id: number; tier: string; monthlyPrice?: string }>;
  pricingByTier: Record<string, ReturnType<typeof buildPlanPricing>>;
} {
  const plansByTier: Record<string, number> = {};
  const planDetailsByTier: Record<string, { id: number; tier: string; monthlyPrice?: string }> = {};
  const pricingByTier: Record<string, ReturnType<typeof buildPlanPricing>> = {};
  for (const p of plans) {
    plansByTier[p.tier] = p.id;
    planDetailsByTier[p.tier] = p;
    pricingByTier[p.tier] = buildPlanPricing(p);
  }
  return { plansByTier, planDetailsByTier, pricingByTier };
}

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
