import {
  ChangePasswordCommand,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ConfirmSignUpCommandOutput,
  ConfirmForgotPasswordCommandOutput,
  ForgotPasswordCommandOutput,
  InitiateAuthCommand,
  InitiateAuthCommandOutput,
  ResendConfirmationCodeCommandOutput,
  ResendConfirmationCodeCommand,
  SignUpCommand,
  SignUpCommandOutput,
  CodeDeliveryDetailsType,
  ForgotPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";

import { cognitoClient } from "../lib/aws";
import { env } from "../config/env";
import { db } from "../db";
import { userTable } from "../db/schema";
import { and, desc, eq } from "drizzle-orm";
import { createLocalToken } from "../lib/jwt";
import { sendOtpEmail } from "../lib/mailer";
import { v4 as uuidv4 } from "uuid";

function mapCognitoError(error: any) {
  const name = error?.name || error?.__type;
  if (name === "InvalidPasswordException") {
    return { status: 400, message: "Password must include an uppercase letter, a lowercase letter, and a number." };
  }
  if (name === "UsernameExistsException") {
    return { status: 409, message: "An account with this email already exists." };
  }
  if (name === "InvalidParameterException") {
    return { status: 400, message: "Invalid request." };
  }
  if (name === "NotAuthorizedException") {
    return { status: 401, message: "Invalid credentials." };
  }
  if (name === "UserNotConfirmedException") {
    return { status: 403, message: "User is not confirmed. Please verify your email." };
  }
  if (name === "ExpiredCodeException" || name === "CodeMismatchException") {
    return { status: 400, message: "Invalid or expired verification code." };
  }
  return null;
}

function rethrowCognitoError(error: any): never {
  const mapped = mapCognitoError(error);
  if (mapped) {
    throw mapped;
  }
  throw error;
}

type SignUpResult = SignUpCommandOutput | { alreadyExists: true; CodeDeliveryDetails?: CodeDeliveryDetailsType };

export async function signUpUser(input: { email: string; password: string; name: string }): Promise<SignUpResult> {
  try {
    const command = new SignUpCommand({
      ClientId: env.cognitoClientId,
      Username: input.email,
      Password: input.password,
      UserAttributes: [
        { Name: "email", Value: input.email },
        { Name: "name", Value: input.name },
      ],
    });

    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    const name = (error as any)?.name || (error as any)?.__type;
    if (name === "UsernameExistsException") {
      const resend = await resendConfirmation(input);
      return { alreadyExists: true, CodeDeliveryDetails: resend.CodeDeliveryDetails };
    }
    rethrowCognitoError(error);
  }
}

export async function confirmSignUp(input: { email: string; code: string }): Promise<ConfirmSignUpCommandOutput> {
  try {
    const command = new ConfirmSignUpCommand({
      ClientId: env.cognitoClientId,
      Username: input.email,
      ConfirmationCode: input.code,
    });

    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    rethrowCognitoError(error);
  }
}

export async function resendConfirmation(input: { email: string }): Promise<ResendConfirmationCodeCommandOutput> {
  try {
    const command = new ResendConfirmationCodeCommand({
      ClientId: env.cognitoClientId,
      Username: input.email,
    });

    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    rethrowCognitoError(error);
  }
}

export async function loginUser(input: { email: string; password: string }): Promise<InitiateAuthCommandOutput> {
  try {
    const command = new InitiateAuthCommand({
      ClientId: env.cognitoClientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: input.email,
        PASSWORD: input.password,
      },
    });

    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    rethrowCognitoError(error);
  }
}

export async function refreshUserSession(input: { refreshToken: string }): Promise<InitiateAuthCommandOutput> {
  try {
    const command = new InitiateAuthCommand({
      ClientId: env.cognitoClientId,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: input.refreshToken,
      },
    });

    return await cognitoClient.send(command);
  } catch (error) {
    rethrowCognitoError(error);
  }
}

export async function startForgotPassword(input: { email: string }): Promise<ForgotPasswordCommandOutput> {
  try {
    const command = new ForgotPasswordCommand({
      ClientId: env.cognitoClientId,
      Username: input.email,
    });

    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    rethrowCognitoError(error);
  }
}

export async function confirmForgotPassword(input: {
  email: string;
  code: string;
  password: string;
}): Promise<ConfirmForgotPasswordCommandOutput> {
  try {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: env.cognitoClientId,
      Username: input.email,
      ConfirmationCode: input.code,
      Password: input.password,
    });

    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    rethrowCognitoError(error);
  }
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

export async function changePassword(input: {
  accessToken: string;
  previousPassword: string;
  proposedPassword: string;
}) {
  try {
    const command = new ChangePasswordCommand({
      AccessToken: input.accessToken,
      PreviousPassword: input.previousPassword,
      ProposedPassword: input.proposedPassword,
    });
    return await cognitoClient.send(command);
  } catch (error) {
    rethrowCognitoError(error);
  }
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

export async function updateUserRole(input: {
	email: string;
	type: "youth" | "adult" | "team";
}) {
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

	await db
		.update(userTable)
		.set({
			role: role as any,
			updatedAt: new Date(),
		})
		.where(eq(userTable.id, user.id));

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

  // Create placeholder user for first-time email registration
  await db.insert(userTable).values({
    cognitoSub: `local:${uuidv4()}`,
    name: "User", // Placeholder, will be updated later in onboarding
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
