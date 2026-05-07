import { getApiBaseUrl } from "@/lib/apiBaseUrl";

describe("getApiBaseUrl", () => {
  it("returns a string", () => {
    expect(typeof getApiBaseUrl()).toBe("string");
  });
});
