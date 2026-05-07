import { getAuthBaseUrl } from "@/lib/authBaseUrl";

describe("getAuthBaseUrl", () => {
  it("returns a string", () => {
    expect(typeof getAuthBaseUrl()).toBe("string");
  });
});
