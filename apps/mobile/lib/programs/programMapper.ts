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
  const normalize = (value: unknown) =>
    normalizeProgramTabLabel(String(value ?? "")).trim();

  const shouldHideTab = (label: string) => {
    const key = label.trim().toLowerCase();
    // Hide legacy/unused tabs in the new Programs experience.
    return (
      key.includes("education") ||
      key.includes("off-season") ||
      key.includes("off season") ||
      key.includes("off session")
    );
  };

  const others = Array.isArray(response?.others)
    ? response.others.map((group) => ({
        ...group,
        label: normalize(group?.label),
        items: Array.isArray(group?.items) ? group.items : [],
      }))
    : [];

  const apiTabs = Array.isArray(response?.tabs)
    ? response.tabs.map(normalize).filter(Boolean)
    : [];

  const uniq: string[] = [];
  const pushUniq = (value: string) => {
    if (!value) return;
    if (uniq.includes(value)) return;
    uniq.push(value);
  };

  const baseTabs = apiTabs.length
    ? apiTabs
    : ["Modules", ...others.map((g) => g.label)];

  for (const tab of baseTabs) {
    const normalized = normalize(tab);
    if (!normalized) continue;
    if (shouldHideTab(normalized)) continue;
    pushUniq(normalized);
  }

  if (!uniq.includes("Modules")) {
    uniq.unshift("Modules");
  }

  // Ensure every visible "others" group has a tab entry (API tabs can lag behind).
  for (const group of others) {
    const label = normalize(group?.label);
    if (!label || shouldHideTab(label) || label === "Modules") continue;
    pushUniq(label);
  }

  // Ensure Recovery is reachable when present in data.
  const hasRecoveryGroup = others.some(
    (group) =>
      String(group?.type ?? "").toLowerCase() === "recovery" ||
      normalize(group?.label).toLowerCase() === "recovery",
  );
  if (hasRecoveryGroup && !uniq.includes("Recovery")) {
    const mobilityIndex = uniq.indexOf("Mobility");
    if (mobilityIndex >= 0) uniq.splice(mobilityIndex + 1, 0, "Recovery");
    else pushUniq("Recovery");
  }

  return { ...response, tabs: uniq, others };
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
