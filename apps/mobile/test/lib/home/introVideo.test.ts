import { classifyIntroVideoSource, getIntroStageSize, normalizeIntroVideoRules, pickIntroVideoForAudience, resolveIntroPoster, youtubePosterUrl } from "@/lib/home/introVideo";

describe("home intro video policy", () => {
  it("normalizes metadata and preserves a complete audience rule", () => {
    const rules = normalizeIntroVideoRules([{ url: " team.mp4 ", roles: ["team", "team", "invalid"], title: " Welcome ", description: " Meet us. ", posterUrl: " poster.jpg " }]);
    expect(rules).toEqual([{ url: "team.mp4", roles: ["team"], title: "Welcome", description: "Meet us.", posterUrl: "poster.jpg" }]);
    expect(pickIntroVideoForAudience(rules, "team", null)).toEqual(rules[0]);
  });
  it("supports legacy URLs and poster fallbacks", () => {
    expect(pickIntroVideoForAudience([], "adult", " legacy.mp4 ")).toEqual({ url: "legacy.mp4", roles: ["adult", "team", "youth"] });
    expect(resolveIntroPoster({ posterUrl: "rule.jpg" }, "provider.jpg", "hero.jpg")).toBe("rule.jpg");
    expect(resolveIntroPoster({}, "provider.jpg", "hero.jpg")).toBe("provider.jpg");
    expect(resolveIntroPoster({}, null, "hero.jpg")).toBe("hero.jpg");
  });
  it("caps portrait stages and classifies providers", () => {
    expect(getIntroStageSize(360, 800, 16 / 9)).toEqual({ width: 360, height: 203 });
    expect(getIntroStageSize(360, 800, 9 / 16)).toEqual({ width: 360, height: 496 });
    expect(classifyIntroVideoSource("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe("youtube");
    expect(classifyIntroVideoSource("https://loom.com/share/abc")).toBe("loom");
    expect(youtubePosterUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });
});
