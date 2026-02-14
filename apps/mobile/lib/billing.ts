export type PlanPricing = {
  badge?: string;
  lines: string[];
  discountNote?: string;
};

function parseAmount(value: string) {
  const match = value.match(/([£$€])?\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const symbol = match[1] ?? "";
  const amount = Number(match[2]);
  if (!Number.isFinite(amount)) return null;
  return { symbol, amount };
}

function formatAmount(symbol: string, amount: number) {
  const fixed = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${symbol}${fixed}`;
}

export function buildPlanPricing(plan: any): PlanPricing {
  const lines: string[] = [];
  const monthlyRaw = plan?.monthlyPrice ? String(plan.monthlyPrice) : "";
  const yearlyRaw = plan?.yearlyPrice ? String(plan.yearlyPrice) : "";
  const discountValue = plan?.discountValue ? Number(plan.discountValue) : 0;
  const discountAppliesTo = String(plan?.discountAppliesTo ?? "both");

  const addLine = (label: string, rawValue: string, applyDiscount: boolean) => {
    if (!rawValue.trim()) return;
    if (!applyDiscount || !discountValue) {
      lines.push(`${label} ${rawValue}`);
      return;
    }
    const parsed = parseAmount(rawValue);
    if (!parsed) {
      lines.push(`${label} ${rawValue} (-${discountValue}%)`);
      return;
    }
    const discounted = parsed.amount * (1 - discountValue / 100);
    lines.push(`${label} ${rawValue} → ${formatAmount(parsed.symbol, discounted)}`);
  };

  addLine(
    "Monthly",
    monthlyRaw,
    discountAppliesTo === "monthly" || discountAppliesTo === "both"
  );
  addLine(
    "Yearly",
    yearlyRaw,
    discountAppliesTo === "yearly" || discountAppliesTo === "both"
  );

  const discountNote =
    discountValue && discountValue > 0
      ? `Discount ${discountValue}% (${discountAppliesTo})`
      : undefined;

  const badge = plan?.displayPrice
    ? String(plan.displayPrice)
    : lines[0];

  return { badge, lines, discountNote };
}
