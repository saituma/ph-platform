import crypto from "crypto";

import { env } from "../config/env";

type ActionType = "approve" | "decline";

const VERSION = "v1";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return crypto.createHmac("sha256", env.bookingActionSecret).update(payload).digest("base64url");
}

export function createBookingActionToken(input: {
  bookingId: number;
  action: ActionType;
  expiresAt?: Date;
}) {
  const exp = (input.expiresAt ?? new Date(Date.now() + DEFAULT_TTL_MS)).getTime();
  const payload = `${VERSION}.${input.bookingId}.${input.action}.${exp}`;
  const signature = signPayload(payload);
  return `${base64UrlEncode(payload)}.${signature}`;
}

export function verifyBookingActionToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const payload = base64UrlDecode(parts[0]);
  const signature = parts[1];
  const expected = signPayload(payload);
  if (signature !== expected) return null;
  const [version, bookingIdRaw, actionRaw, expRaw] = payload.split(".");
  if (version !== VERSION) return null;
  const bookingId = Number(bookingIdRaw);
  if (!Number.isFinite(bookingId) || bookingId <= 0) return null;
  if (actionRaw !== "approve" && actionRaw !== "decline") return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  return { bookingId, action: actionRaw as ActionType, expiresAt: new Date(exp) };
}
