import { isAdminRole } from "@/lib/isAdminRole";

describe("isAdminRole", () => {
  it("returns true for admin roles", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("superAdmin")).toBe(true);
    expect(isAdminRole("SUPERADMIN")).toBe(true);
    expect(isAdminRole(" superadmin ")).toBe(true);
  });

  it("returns false for non-admin roles", () => {
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole("")).toBe(false);
    expect(isAdminRole("coach")).toBe(false);
    expect(isAdminRole("athlete")).toBe(false);
  });
});
