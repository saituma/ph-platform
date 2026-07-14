import fs from "fs";
import path from "path";

/** Exercises the process-local fallback: no Redis, so presence must still be correct on one dyno. */
jest.mock("../../src/jobs/connection", () => ({ getRedisConnection: () => null }));

import { getOnlineSubset, markOffline, markOnline, onlineCount } from "../../src/lib/presence";

const socketSrc = fs.readFileSync(path.resolve(__dirname, "../../src/socket.ts"), "utf8");

/** socket.ts's comments describe the removed broadcast by name, so assertions must ignore them. */
const socketCode = socketSrc
  .split("\n")
  .filter((line) => {
    const trimmed = line.trimStart();
    return !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
  })
  .join("\n");

/**
 * Presence used to be a global broadcast:
 *
 *   socket.emit("presence:snapshot", getOnlineUserIds())  // full online roster -> every client
 *   io.emit("presence:online",  { userId })               // -> EVERY connected socket
 *   io.emit("presence:offline", { userId })               // -> EVERY connected socket
 *
 * One connect cost O(N) frames on a single-threaded event loop, so a rush of N users cost O(N²).
 * Mobile networks flap constantly, so disconnects doubled it. And no client listened for those
 * event names — mobile listened for "presence:update" — so it burned the event loop for nobody.
 *
 * Presence now goes only to a user's DM partners.
 */
describe("presence fan-out", () => {
  afterEach(async () => {
    for (let id = 1; id <= 50; id++) await markOffline(id);
  });

  describe("the global broadcast cannot come back", () => {
    test("socket.ts contains no io.emit — every emit must be addressed to a room", () => {
      expect(socketCode).not.toMatch(/\bio\.emit\(/);
    });

    test("the full-roster snapshot is gone", () => {
      expect(socketCode).not.toMatch(/getOnlineUserIds/);
      expect(socketCode).not.toMatch(/presence:snapshot/);
    });
  });

  describe("getOnlineSubset", () => {
    test("returns only the candidates that are online — never the whole roster", async () => {
      await markOnline(1);
      await markOnline(2);
      await markOnline(3);

      // A user whose only DM partner is 2 must learn about 2 and nobody else.
      await expect(getOnlineSubset([2])).resolves.toEqual([2]);
    });

    test("never leaks users the caller did not ask about", async () => {
      for (let id = 1; id <= 40; id++) await markOnline(id);
      expect(onlineCount()).toBe(40);

      // 40 users online, but a caller with two peers sees at most two.
      const visible = await getOnlineSubset([7, 9]);
      expect(visible).toEqual([7, 9]);
      expect(visible.length).toBeLessThan(onlineCount());
    });

    test("omits peers who are offline", async () => {
      await markOnline(5);
      await expect(getOnlineSubset([5, 6])).resolves.toEqual([5]);
    });

    test("an isolated user with no peers gets an empty list, not the roster", async () => {
      for (let id = 1; id <= 30; id++) await markOnline(id);
      await expect(getOnlineSubset([])).resolves.toEqual([]);
    });
  });
});
