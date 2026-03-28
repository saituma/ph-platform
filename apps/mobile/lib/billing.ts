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

function parseDiscountConfig(plan: any) {
  const rawValue = String(plan?.discountValue ?? "").trim();
  const appliesTo = String(plan?.discountAppliesTo ?? "").trim().toLowerCase();

  const empty = {
    monthly: null as string | null,
    yearly: null as string | null,
  };

  if (!rawValue) return empty;

  if (appliesTo === "custom") {
    try {
      const parsed = JSON.parse(rawValue) as { monthly?: unknown; yearly?: unknown };
      return {
        monthly: parsed.monthly == null ? null : String(parsed.monthly).trim() || null,
        yearly: parsed.yearly == null ? null : String(parsed.yearly).trim() || null,
      };
    } catch {
      return empty;
    }
  }

  if (appliesTo === "monthly") return { monthly: rawValue, yearly: null };
  if (appliesTo === "yearly") return { monthly: null, yearly: rawValue };
  if (appliesTo === "both") return { monthly: rawValue, yearly: rawValue };

  return empty;
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
  const parsedDiscounts = parseDiscountConfig(plan);

  const addLine = (label: string, rawValue: string, intervalDiscountValue?: string | null) => {
    if (!rawValue.trim()) return;
    const entry: { label: string; original: string; discounted?: string; discountLabel?: string } = {
      label,
      original: rawValue,
    };
    const discountValue = intervalDiscountValue ? Number(intervalDiscountValue) : 0;
    if (!intervalDiscountValue || !discountValue) {
      lines.push(`${label} ${rawValue}`);
      entries?.push(entry);
      return;
    }
    const parsed = parseAmount(rawValue);
    if (!parsed) {
      lines.push(`${label} ${rawValue} (-${intervalDiscountValue}%)`);
      entry.discountLabel = `${intervalDiscountValue}% off`;
      entries?.push(entry);
      return;
    }
    const discounted = parsed.amount * (1 - discountValue / 100);
    const discountedLabel = formatAmount(parsed.symbol, discounted);
    lines.push(`${label} ${rawValue} → ${discountedLabel}`);
    entry.discounted = discountedLabel;
    entry.discountLabel = `${intervalDiscountValue}% off`;
    entries?.push(entry);
  };

  addLine("Monthly", monthlyRaw, parsedDiscounts.monthly);
  addLine("Yearly", yearlyRaw, parsedDiscounts.yearly);

  const discountNote =
    parsedDiscounts.monthly || parsedDiscounts.yearly
      ? [
          parsedDiscounts.monthly ? `Monthly ${parsedDiscounts.monthly}% off` : null,
          parsedDiscounts.yearly ? `Yearly ${parsedDiscounts.yearly}% off` : null,
        ]
          .filter(Boolean)
          .join(" • ")
      : undefined;

  const badge = plan?.displayPrice
    ? String(plan.displayPrice)
    : lines[0];

  return { badge, lines, discountNote, entries };
}
