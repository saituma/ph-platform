import {
  deriveIntroVideos,
  isSupportedIntroVideoUrl,
  isValidIntroPosterUrl,
  normalizeIntroRules,
} from "../lib/home/introVideoRules";
describe("intro video authoring rules", () => {
  it("normalizes metadata and keeps the last role assignment", () => expect(normalizeIntroRules([{ url: "old", roles: ["team"] }, { url: " new ", roles: ["team", "adult"], title: " Welcome ", description: " Meet us. ", posterUrl: " poster " }])).toEqual([{ url: "new", roles: ["team", "adult"], title: "Welcome", description: "Meet us.", posterUrl: "poster" }]));
  it("derives the legacy fallback", () => expect(deriveIntroVideos({ introVideoUrl: " legacy " })).toEqual([{ url: "legacy", roles: ["adult", "team", "youth"] }]));
  it.each([
    "https://cdn.example.com/welcome.mp4",
    "https://youtu.be/abc123DEF_4",
    "https://www.youtube.com/watch?v=abc123DEF_4",
    "https://www.youtube-nocookie.com/embed/abc123DEF_4",
    "https://www.loom.com/share/abc123",
  ])("accepts supported video URL %s", (url) => expect(isSupportedIntroVideoUrl(url)).toBe(true));
  it.each(["not a url", "https://vimeo.com/123", "https://example.com/watch", "https://youtube.com/foo", "https://youtu.be/abc123", "javascript:alert(1)"])(
    "rejects unsupported video URL %s",
    (url) => expect(isSupportedIntroVideoUrl(url)).toBe(false),
  );
  it("validates optional poster URLs", () => {
    expect(isValidIntroPosterUrl("")).toBe(true);
    expect(isValidIntroPosterUrl("https://cdn.example.com/poster.jpg")).toBe(true);
    expect(isValidIntroPosterUrl("poster.jpg")).toBe(false);
  });
});
