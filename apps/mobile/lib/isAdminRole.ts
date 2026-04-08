export function isAdminRole(role: string | null | undefined): boolean {
  const normalized = (role ?? "").trim().toLowerCase();
  return normalized === "admin" || normalized === "superadmin";
}
