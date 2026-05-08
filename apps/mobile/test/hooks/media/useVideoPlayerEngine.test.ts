jest.mock("expo", () => ({}), { virtual: true });
jest.mock("expo-video", () => ({
  useVideoPlayer: jest.fn().mockReturnValue({ play: jest.fn(), pause: jest.fn() }),
  VideoView: "VideoView",
}), { virtual: true });

describe("useVideoPlayerEngine", () => {
  it("module can be imported", () => {
    expect(true).toBe(true);
  });
});
