jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn() }));

import { apiRequest } from "@/lib/api";
import { fetchPrivacySettings, updatePrivacySettings } from "@/services/tracking/socialService";

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("services/socialService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("module exports exist", () => {
    const mod = require("@/services/tracking/socialService");
    expect(mod).toBeDefined();
  });

  describe("fetchPrivacySettings", () => {
    it("bypasses the apiRequest GET cache", async () => {
      mockedApiRequest.mockResolvedValue({ settings: { socialEnabled: true } } as never);

      await fetchPrivacySettings("t0ken");

      // apiRequest caches GETs for 5 minutes. If this read is cacheable, the refetch that
      // follows the opt-in PATCH replays the pre-opt-in body and the "Enable team features"
      // prompt reappears on pull-to-refresh.
      expect(mockedApiRequest).toHaveBeenCalledWith(
        "/social/privacy",
        expect.objectContaining({ skipCache: true, forceRefresh: true }),
      );
    });

    it("falls back to defaults when the endpoint is missing (404)", async () => {
      mockedApiRequest.mockRejectedValue(new Error("404 Not Found"));

      const res = await fetchPrivacySettings("t0ken");

      expect(res.settings.socialEnabled).toBe(false);
    });

    it("rethrows non-404 failures instead of masking them as opted-out", async () => {
      mockedApiRequest.mockRejectedValue(new Error("500 Internal Server Error"));

      await expect(fetchPrivacySettings("t0ken")).rejects.toThrow("500");
    });
  });

  describe("updatePrivacySettings", () => {
    it("PATCHes the opt-in to the server", async () => {
      mockedApiRequest.mockResolvedValue({ settings: { socialEnabled: true } } as never);

      await updatePrivacySettings("t0ken", { socialEnabled: true, privacyVersionAccepted: "1.0" });

      expect(mockedApiRequest).toHaveBeenCalledWith(
        "/social/privacy",
        expect.objectContaining({
          method: "PATCH",
          body: { socialEnabled: true, privacyVersionAccepted: "1.0" },
        }),
      );
    });
  });
});
