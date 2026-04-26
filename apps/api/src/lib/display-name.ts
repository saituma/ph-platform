/**
 * Resolves a friend-facing name for inbox / DMs. Avoids generic DB placeholders
 * and falls back to email local-part when the stored name is useless.
 */
export function publicDisplayName(input: {
  id: number;
  name: string | null | undefined;
  email: string | null | undefined;
}): string {
  const raw = String(input.name ?? "").trim();
  const lower = raw.toLowerCase();
  if (
    raw.length >= 2 &&
    lower !== "user" &&
    lower !== "name" &&
    lower !== "null" &&
    lower !== "undefined" &&
    !/^user[\s_]*\d*$/i.test(raw)
  ) {
    return raw;
  }
  const local = String(input.email ?? "")
    .split("@")[0]
    .replace(/[._]+/g, " ")
    .trim();
  if (local.length > 0) {
    return local
      .split(" ")
      .map((p) => (p.length ? p[0]!.toUpperCase() + p.slice(1).toLowerCase() : p))
      .join(" ");
  }
  return `User ${input.id}`;
}
