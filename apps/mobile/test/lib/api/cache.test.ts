import {
  clearApiCache,
  getCachedData,
  hashString,
  invalidateCachedPath,
  setCachedData,
} from "@/lib/api/cache";

describe("api/cache", () => {
  describe("hashString", () => {
    it("returns consistent hash for same input", () => {
      expect(hashString("test")).toBe(hashString("test"));
    });

    it("returns different hashes for different inputs", () => {
      expect(hashString("a")).not.toBe(hashString("b"));
    });

    it("returns hex string", () => {
      expect(hashString("hello")).toMatch(/^[0-9a-f]+$/);
    });
  });
});

describe("invalidateCachedPath", () => {
  const TTL = 60_000;

  beforeEach(() => clearApiCache());

  it("drops cached reads of the resource that was written to", () => {
    // Cache key shape mirrors apiRequest: `${tokenKey}:${method}:${url}`
    setCachedData("tok:GET:http://api/progress/entries", { entries: [] });
    setCachedData("tok:GET:http://api/programs/my-assigned", { programs: [] });

    // A write to /progress must not leave the pre-write list behind: logging a progress entry
    // and refetching used to replay the empty list, so the athlete saw nothing.
    invalidateCachedPath("/progress");

    expect(getCachedData("tok:GET:http://api/progress/entries", TTL)).toBeNull();
    // Unrelated resources stay warm.
    expect(getCachedData("tok:GET:http://api/programs/my-assigned", TTL)).not.toBeNull();
  });

  it("clears every cached read under the resource root", () => {
    setCachedData("tok:GET:http://api/programs/my-assigned", { programs: [] });
    setCachedData("tok:GET:http://api/programs/my-assigned/4", { program: null });

    invalidateCachedPath("/programs");

    expect(getCachedData("tok:GET:http://api/programs/my-assigned", TTL)).toBeNull();
    expect(getCachedData("tok:GET:http://api/programs/my-assigned/4", TTL)).toBeNull();
  });

  it("ignores an empty prefix rather than nuking the cache", () => {
    setCachedData("tok:GET:http://api/runs", { runs: [] });
    invalidateCachedPath("");
    expect(getCachedData("tok:GET:http://api/runs", TTL)).not.toBeNull();
  });
});
