import { createBookingActionToken, verifyBookingActionToken } from "../../src/lib/booking-actions";

describe("lib/booking-actions", () => {
  test("TC-BA-001: creates and verifies approve token", () => {
    const token = createBookingActionToken({ bookingId: 123, action: "approve" });
    const verified = verifyBookingActionToken(token);
    expect(verified).toEqual(
      expect.objectContaining({
        bookingId: 123,
        action: "approve",
        expiresAt: expect.any(Date),
      }),
    );
  });

  test("TC-BA-002: creates and verifies decline token", () => {
    const token = createBookingActionToken({ bookingId: 456, action: "decline" });
    const verified = verifyBookingActionToken(token);
    expect(verified?.bookingId).toBe(456);
    expect(verified?.action).toBe("decline");
  });

  test("TC-BA-003: creates and verifies review token", () => {
    const token = createBookingActionToken({ bookingId: 789, action: "review" });
    const verified = verifyBookingActionToken(token);
    expect(verified?.bookingId).toBe(789);
    expect(verified?.action).toBe("review");
  });

  test("TC-BA-004: returns null for expired token", () => {
    const token = createBookingActionToken({
      bookingId: 123,
      action: "review",
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(verifyBookingActionToken(token)).toBeNull();
  });

  test("TC-BA-005: returns null for tampered token", () => {
    const token = createBookingActionToken({ bookingId: 123, action: "review" });
    const parts = token.split(".");
    expect(parts).toHaveLength(2);
    const signature = parts[1];
    const flippedLast = signature.slice(0, -1) + (signature.endsWith("A") ? "B" : "A");
    const tampered = `${parts[0]}.${flippedLast}`;
    expect(verifyBookingActionToken(tampered)).toBeNull();
  });
});
