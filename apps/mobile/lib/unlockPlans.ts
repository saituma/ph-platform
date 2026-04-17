/** Human-readable list for upgrade prompts (parent platform, etc.). */
export function getUnlockingPlanNames(requiredTier: string): string[] {
  const key = requiredTier.trim();
  const map: Record<string, string[]> = {
    PHP: ["PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"],
    PHP_Premium: ["PHP_Premium", "PHP_Premium_Plus"],
    PHP_Premium_Plus: ["PHP_Premium_Plus", "PHP_Pro"],
    PHP_Pro: ["PHP_Pro"],
  };
  return map[key] ?? ["PHP_Premium_Plus", "PHP_Pro"];
}

export function formatPlanList(names: string[]): string {
  const filtered = names.map((n) => n.trim()).filter(Boolean);
  if (filtered.length === 0) return "";
  if (filtered.length === 1) return filtered[0]!;
  if (filtered.length === 2) return `${filtered[0]} or ${filtered[1]}`;
  return `${filtered.slice(0, -1).join(", ")}, or ${filtered[filtered.length - 1]}`;
}
