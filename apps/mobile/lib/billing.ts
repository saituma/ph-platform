export type PlanPricing = {
  badge?: string;
  lines: string[];
  discountNote?: string;
  entries?: {
    label: string;
    original: string;
    discounted?: string;
    discountLabel?: string;
  }[];
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
  const apiPricing = plan?.pricing;
  if (apiPricing && (apiPricing.monthly || apiPricing.yearly)) {
    const entries: NonNullable<PlanPricing["entries"]> = [];
    const lines: string[] = [];

    const addStructuredEntry = (entry: any) => {
      if (!entry) return;
      entries.push({
        label: entry.label,
        original: entry.original,
        discounted: entry.hasDiscount ? entry.discounted : undefined,
        discountLabel: entry.discountLabel ?? undefined,
      });
      lines.push(
        entry.hasDiscount
          ? `${entry.label} ${entry.original} -> ${entry.discounted}`
          : `${entry.label} ${entry.original}`,
      );
    };

    addStructuredEntry(apiPricing.monthly);
    addStructuredEntry(apiPricing.yearly);

    return {
      badge: apiPricing.badge ?? plan?.displayPrice ?? lines[0],
      lines,
      entries,
    };
  }

  const lines: string[] = [];
  const entries: PlanPricing["entries"] = [];
  const monthlyRaw = plan?.monthlyPrice ? String(plan.monthlyPrice) : "";
  const yearlyRaw = plan?.yearlyPrice ? String(plan.yearlyPrice) : "";
  const discountValue = plan?.discountValue ? Number(plan.discountValue) : 0;
  const discountAppliesTo = String(plan?.discountAppliesTo ?? "both");

  const addLine = (label: string, rawValue: string, applyDiscount: boolean) => {
    if (!rawValue.trim()) return;
    const entry: { label: string; original: string; discounted?: string; discountLabel?: string } = {
      label,
      original: rawValue,
    };
    if (!applyDiscount || !discountValue) {
      lines.push(`${label} ${rawValue}`);
      entries?.push(entry);
      return;
    }
    const parsed = parseAmount(rawValue);
    if (!parsed) {
      lines.push(`${label} ${rawValue} (-${discountValue}%)`);
      entry.discountLabel = `${discountValue}% off`;
      entries?.push(entry);
      return;
    }
    const discounted = parsed.amount * (1 - discountValue / 100);
    const discountedLabel = formatAmount(parsed.symbol, discounted);
    lines.push(`${label} ${rawValue} → ${discountedLabel}`);
    entry.discounted = discountedLabel;
    entry.discountLabel = `${discountValue}% off`;
    entries?.push(entry);
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

  return { badge, lines, discountNote, entries };
}
