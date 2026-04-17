/** Plan pricing lines for program/marketing UI and tests. */
export function buildPlanPricing(plan: { id: number | string; tier?: string }) {
  return {
    badge: `Price for ${plan.id}`,
    lines: [] as { label: string; value: string }[],
  };
}
