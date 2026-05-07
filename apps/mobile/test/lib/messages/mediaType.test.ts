import { resolveMediaType } from "@/lib/messages/mediaType";

describe("resolveMediaType", () => {
  it("detects image from contentType", () => {
    expect(resolveMediaType({ contentType: "image" })).toBe("image");
    expect(resolveMediaType({ contentType: "image/jpeg" })).toBe("image");
    expect(resolveMediaType({ contentType: "IMAGE/PNG" })).toBe("image");
  });

  it("detects video from contentType", () => {
    expect(resolveMediaType({ contentType: "video" })).toBe("video");
    expect(resolveMediaType({ contentType: "video/mp4" })).toBe("video");
  });

  it("infers image from URL", () => {
    expect(resolveMediaType({ mediaUrl: "https://cdn.example.com/photo.jpg" })).toBe("image");
    expect(resolveMediaType({ mediaUrl: "https://cdn.example.com/photo.png" })).toBe("image");
    expect(resolveMediaType({ mediaUrl: "https://cdn.example.com/photo.webp" })).toBe("image");
  });

  it("infers video from URL", () => {
    expect(resolveMediaType({ mediaUrl: "https://cdn.example.com/clip.mp4" })).toBe("video");
    expect(resolveMediaType({ mediaUrl: "https://cdn.example.com/clip.mov" })).toBe("video");
  });

  it("infers from path segments", () => {
    expect(resolveMediaType({ mediaUrl: "https://cdn.example.com/messages/images/abc" })).toBe("image");
    expect(resolveMediaType({ mediaUrl: "https://cdn.example.com/messages/videos/abc" })).toBe("video");
  });

  it("returns text when no media info", () => {
    expect(resolveMediaType({})).toBe("text");
    expect(resolveMediaType({ contentType: null, mediaUrl: null })).toBe("text");
  });
});
