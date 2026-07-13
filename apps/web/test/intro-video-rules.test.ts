import { deriveIntroVideos, normalizeIntroRules } from "../lib/home/introVideoRules";
describe("intro video authoring rules", () => {
  it("normalizes metadata and keeps the last role assignment", () => expect(normalizeIntroRules([{ url: "old", roles: ["team"] }, { url: " new ", roles: ["team", "adult"], title: " Welcome ", description: " Meet us. ", posterUrl: " poster " }])).toEqual([{ url: "new", roles: ["team", "adult"], title: "Welcome", description: "Meet us.", posterUrl: "poster" }]));
  it("derives the legacy fallback", () => expect(deriveIntroVideos({ introVideoUrl: " legacy " })).toEqual([{ url: "legacy", roles: ["adult", "team", "youth"] }]));
});
