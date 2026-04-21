import crypto from "crypto";

import { db } from "../db";
import { userTable } from "../db/schema";
import { and, desc, eq } from "drizzle-orm";
import { createLocalToken } from "../lib/jwt";
import { sendOtpEmail } from "../lib/mailer";
import { v4 as uuidv4 } from "uuid";

export async function changePasswordLocal(input: {
  userId: number;
  previousPassword: string;
  proposedPassword: string;
}) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.id, input.userId), eq(userTable.isDeleted, false)))
    .limit(1);
  const user = users[0];
  if (!user) {
    throw { status: 404, message: "User not found." };
  }
  if (!user.passwordHash || !user.passwordSalt) {
    throw { status: 400, message: "Password sign-in is not enabled for this account." };
  }
  if (!verifyLocalPassword(input.previousPassword, user.passwordHash, user.passwordSalt)) {
    throw { status: 401, message: "Invalid credentials." };
  }
  const { hash, salt } = hashPassword(input.proposedPassword);
  await db
    .update(userTable)
    .set({
      passwordHash: hash,
      passwordSalt: salt,
      tokenVersion: (user.tokenVersion ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, user.id));
  return { ok: true as const };
}

export async function startForgotPasswordLocal(input: { email: string }) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, false)))
    .orderBy(desc(userTable.id))
    .limit(1);
  const user = users[0];
  if (!user) {
    throw { status: 404, message: "User not found." };
  }
  if (!user.emailVerified) {
    throw { status: 403, message: "User is not confirmed. Please verify your email." };
  }
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db
    .update(userTable)
    .set({
      verificationCode: otp,
      verificationExpiresAt: expiresAt,
      verificationAttempts: 0,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, user.id));
  await sendOtpEmail({ to: input.email, code: otp });
  return { ok: true };
}

export async function confirmForgotPasswordLocal(input: { email: string; code: string; password: string }) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, false)))
    .orderBy(desc(userTable.id))
    .limit(1);
  const user = users[0];
  if (!user) {
    throw { status: 404, message: "User not found." };
  }
  if (!user.emailVerified) {
    throw { status: 403, message: "User is not confirmed. Please verify your email." };
  }
  if (!user.verificationCode || !user.verificationExpiresAt) {
    throw { status: 400, message: "Verification code not found." };
  }
  if (new Date(user.verificationExpiresAt) < new Date()) {
    throw { status: 400, message: "Verification code expired." };
  }
  if (user.verificationCode !== input.code) {
    await db
      .update(userTable)
      .set({ verificationAttempts: (user.verificationAttempts ?? 0) + 1, updatedAt: new Date() })
      .where(eq(userTable.id, user.id));
    throw { status: 400, message: "Invalid verification code." };
  }
  const { hash, salt } = hashPassword(input.password);
  await db
    .update(userTable)
    .set({
      passwordHash: hash,
      passwordSalt: salt,
      verificationCode: null,
      verificationExpiresAt: null,
      verificationAttempts: 0,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, user.id));
  return { ok: true };
}

function hashPassword(password: string, salt?: string) {
  const usedSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, usedSalt, 64).toString("hex");
  return { hash, salt: usedSalt };
}

export function verifyLocalPassword(password: string, hash: string | null, salt: string | null) {
  if (!hash || !salt) return false;
  const next = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(next, "hex"));
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function registerLocal(input: { email: string; password: string; name: string }) {
  const active = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, false)))
    .orderBy(desc(userTable.id))
    .limit(1);

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const { hash, salt } = hashPassword(input.password);

  if (active[0]) {
    if (active[0].emailVerified) {
      throw { status: 409, message: "An account with this email already exists." };
    }
    await db
      .update(userTable)
      .set({
        name: input.name,
        passwordHash: hash,
        passwordSalt: salt,
        verificationCode: otp,
        verificationExpiresAt: expiresAt,
        verificationAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, active[0].id));
    await sendOtpEmail({ to: input.email, code: otp });
    return { ok: true };
  }

  const softDeleted = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, true)))
    .orderBy(desc(userTable.id))
    .limit(1);

  if (softDeleted[0]) {
    const row = softDeleted[0];
    const nextSub = row.cognitoSub?.startsWith("local:") ? `local:${uuidv4()}` : row.cognitoSub;
    await db
      .update(userTable)
      .set({
        isDeleted: false,
        isBlocked: false,
        name: input.name,
        passwordHash: hash,
        passwordSalt: salt,
        emailVerified: false,
        verificationCode: otp,
        verificationExpiresAt: expiresAt,
        verificationAttempts: 0,
        tokenVersion: (row.tokenVersion ?? 0) + 1,
        expoPushToken: null,
        cognitoSub: nextSub,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, row.id));
    await sendOtpEmail({ to: input.email, code: otp });
    return { ok: true };
  }

  await db
    .insert(userTable)
    .values({
      cognitoSub: `local:${uuidv4()}`,
      name: input.name,
      email: input.email,
      role: "guardian",
      passwordHash: hash,
      passwordSalt: salt,
      emailVerified: false,
      verificationCode: otp,
      verificationExpiresAt: expiresAt,
      verificationAttempts: 0,
    })
    .returning();

  await sendOtpEmail({ to: input.email, code: otp });
  return { ok: true };
}

export async function confirmLocal(input: { email: string; code: string }) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, false)))
    .orderBy(desc(userTable.id))
    .limit(1);
  const user = users[0];
  if (!user) {
    throw { status: 404, message: "User not found." };
  }
  if (user.emailVerified) {
    const token = await createLocalToken({
      sub: user.cognitoSub,
      email: user.email,
      name: user.name,
      role: user.role,
      userId: user.id,
      tokenVersion: user.tokenVersion ?? 0,
      expiresIn: "30d",
    });
    return { ok: true, accessToken: token, tokenType: "Bearer" };
  }
  if (!user.verificationCode || !user.verificationExpiresAt) {
    throw { status: 400, message: "Verification code not found." };
  }
  if (new Date(user.verificationExpiresAt) < new Date()) {
    throw { status: 400, message: "Verification code expired." };
  }
  if (user.verificationCode !== input.code) {
    await db
      .update(userTable)
      .set({
        verificationAttempts: (user.verificationAttempts ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, user.id));
    throw { status: 400, message: "Invalid verification code." };
  }
  await db
    .update(userTable)
    .set({
      emailVerified: true,
      verificationCode: null,
      verificationExpiresAt: null,
      verificationAttempts: 0,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, user.id));

  const token = await createLocalToken({
    sub: user.cognitoSub,
    email: user.email,
    name: user.name,
    role: user.role,
    userId: user.id,
    tokenVersion: user.tokenVersion ?? 0,
    expiresIn: "30d",
  });

  return { ok: true, accessToken: token, tokenType: "Bearer" };
}

export async function updateUserRole(input: { email: string; type: "youth" | "adult" | "team"; password?: string }) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, false)))
    .orderBy(desc(userTable.id))
    .limit(1);

  const user = users[0];
  if (!user) {
    throw { status: 404, message: "User not found." };
  }

  const roleMap = {
    youth: "guardian",
    adult: "athlete",
    team: "coach",
  } as const;

  const role = roleMap[input.type];
  const updateData: any = {
    role: role as typeof user.role,
    updatedAt: new Date(),
  };

  if (input.password) {
    const { hash, salt } = hashPassword(input.password);
    updateData.passwordHash = hash;
    updateData.passwordSalt = salt;
  }

  await db.update(userTable).set(updateData).where(eq(userTable.id, user.id));

  return { ok: true, role };
}

export async function resendLocal(input: { email: string }) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, false)))
    .orderBy(desc(userTable.id))
    .limit(1);
  const user = users[0];
  if (!user) {
    throw { status: 404, message: "User not found." };
  }
  if (user.emailVerified) {
    return { ok: true };
  }
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db
    .update(userTable)
    .set({
      verificationCode: otp,
      verificationExpiresAt: expiresAt,
      verificationAttempts: 0,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, user.id));
  await sendOtpEmail({ to: input.email, code: otp });
  return { ok: true };
}

export async function startEmailRegistration(input: { email: string }) {
  const active = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, false)))
    .orderBy(desc(userTable.id))
    .limit(1);

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  if (active[0]) {
    if (active[0].emailVerified) {
      throw { status: 409, message: "An account with this email already exists." };
    }
    await db
      .update(userTable)
      .set({
        verificationCode: otp,
        verificationExpiresAt: expiresAt,
        verificationAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, active[0].id));
    await sendOtpEmail({ to: input.email, code: otp });
    return { ok: true };
  }

  await db.insert(userTable).values({
    cognitoSub: `local:${uuidv4()}`,
    name: "User",
    email: input.email,
    role: "guardian",
    emailVerified: false,
    verificationCode: otp,
    verificationExpiresAt: expiresAt,
    verificationAttempts: 0,
  });

  await sendOtpEmail({ to: input.email, code: otp });
  return { ok: true };
}

export async function loginLocal(input: { email: string; password: string }) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, false)))
    .orderBy(desc(userTable.id))
    .limit(1);
  const user = users[0];
  if (!user || !user.passwordHash || !user.passwordSalt) {
    throw { status: 401, message: "Invalid credentials." };
  }
  if (!user.emailVerified) {
    throw { status: 403, message: "User is not confirmed. Please verify your email." };
  }
  const ok = verifyLocalPassword(input.password, user.passwordHash, user.passwordSalt);
  if (!ok) {
    throw { status: 401, message: "Invalid credentials." };
  }
  const nextTokenVersion = user.tokenVersion ?? 0;
  const token = await createLocalToken({
    sub: user.cognitoSub,
    email: user.email,
    name: user.name,
    role: user.role,
    userId: user.id,
    tokenVersion: nextTokenVersion,
    expiresIn: "30d",
  });
  return {
    accessToken: token,
    idToken: token,
    refreshToken: null,
    expiresIn: 60 * 60 * 24 * 30,
    tokenType: "Bearer",
  };
}
