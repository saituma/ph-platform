describe("media/videoPickerNativeResolution", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/media/videoPickerNativeResolution");
    expect(mod).toBeDefined();
    expect(mod.VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION).toBeDefined();
  });
});
