import {
  elapsedForSession,
  isRecoverableLifecycle,
  lifecycleAfterRestore,
  type ActivitySession,
} from "@/lib/tracking/activitySession";

const session: ActivitySession = {
  version: 1,
  id: "activity-1",
  lifecycle: "recording",
  sport: "run",
  startedAt: 1_000,
  pausedAt: null,
  totalPausedMs: 2_000,
  distanceMeters: 0,
  elapsedSeconds: 0,
  coordinates: [],
  privacy: "private",
  shareCurrentLocation: false,
  shareRouteTrail: false,
  syncStatus: "pending",
  updatedAt: 1_000,
};

describe("activity session lifecycle", () => {
  it("requires acknowledgement after an interrupted recording", () => {
    expect(lifecycleAfterRestore(session)).toBe("recovery");
    expect(isRecoverableLifecycle("saved")).toBe(false);
  });

  it("keeps pause accounting out of elapsed activity time", () => {
    expect(elapsedForSession(session, 8_000)).toBe(5);
    expect(elapsedForSession({ ...session, pausedAt: 6_000 }, 20_000)).toBe(3);
  });
});
