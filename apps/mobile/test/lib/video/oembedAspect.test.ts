import { fetchOembedAspectRatio } from "@/lib/video/oembedAspect";

describe("fetchOembedAspectRatio", () => {
  it("returns null for empty URL", async () => {
    expect(await fetchOembedAspectRatio("", "youtube")).toBeNull();
  });

  it("returns 9/16 for YouTube Shorts URLs", async () => {
    const result = await fetchOembedAspectRatio(
      "https://www.youtube.com/shorts/abc123def",
      "youtube"
    );
    expect(result).toBeCloseTo(9 / 16);
  });

  it("returns null on fetch failure", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error("fail"));
    const result = await fetchOembedAspectRatio("https://youtube.com/watch?v=abc", "youtube");
    expect(result).toBeNull();
    global.fetch = originalFetch;
  });
});
