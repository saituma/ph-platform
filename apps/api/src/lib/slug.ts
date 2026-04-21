/** URL/email-safe segment: lowercase letters, digits, hyphens. */
export function slugifySegment(raw: string, maxLen = 48): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const out = s.slice(0, maxLen);
  return out || "team";
}
