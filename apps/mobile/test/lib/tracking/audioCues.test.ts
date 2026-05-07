jest.mock("expo-speech", () => ({
  speak: jest.fn(),
}), { virtual: true });

import { announceKilometerSplit, announceAutoPause, announceRunComplete } from "@/lib/tracking/audioCues";

describe("announceKilometerSplit", () => {
  it("does not throw", () => {
    expect(() =>
      announceKilometerSplit({ km: 1, totalDistanceMeters: 1000, elapsedSeconds: 300 })
    ).not.toThrow();
  });
});

describe("announceAutoPause", () => {
  it("does not throw for pause/resume", () => {
    expect(() => announceAutoPause(true)).not.toThrow();
    expect(() => announceAutoPause(false)).not.toThrow();
  });
});

describe("announceRunComplete", () => {
  it("does not throw", () => {
    expect(() => announceRunComplete(5000, 1500)).not.toThrow();
  });
});
