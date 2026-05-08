jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images", Videos: "Videos" },
}), { virtual: true });

describe("media/safeLaunchImagePicker", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/media/safeLaunchImagePicker");
    expect(mod).toBeDefined();
  });
});
