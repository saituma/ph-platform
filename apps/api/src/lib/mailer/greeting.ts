/** Prefer a real name; avoid generic "User" / empty; fall back to email local-part. */
export function displayGreetingName(name: string | null | undefined, email: string): string {
  const n = (name ?? "").trim();
  if (n.length >= 2 && n.toLowerCase() !== "user") {
    return n;
  }
  const local =
    email
      .split("@")[0]
      ?.replace(/[._-]+/g, " ")
      .trim() ?? "";
  if (!local) return "there";
  return local
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}
