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
import { and, eq } from "drizzle-orm";
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

function verifyPassword(password: string, hash: string, salt: string) {
  const next = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(next, "hex"));
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function registerLocal(input: { email: string; password: string; name: string }) {
  const existing = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, false)))
    .limit(1);
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const { hash, salt } = hashPassword(input.password);

  if (existing[0]) {
    if (existing[0].emailVerified) {
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
      .where(eq(userTable.id, existing[0].id));
  } else {
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
  }

  await sendOtpEmail({ to: input.email, code: otp });
  return { ok: true };
}

export async function confirmLocal(input: { email: string; code: string }) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, false)))
    .limit(1);
  const user = users[0];
  if (!user) {
    throw { status: 404, message: "User not found." };
  }
  if (user.emailVerified) {
    return { ok: true };
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
  return { ok: true };
}

export async function resendLocal(input: { email: string }) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, false)))
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

export async function loginLocal(input: { email: string; password: string }) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, false)))
    .limit(1);
  const user = users[0];
  if (!user || !user.passwordHash || !user.passwordSalt) {
    throw { status: 401, message: "Invalid credentials." };
  }
  if (!user.emailVerified) {
    throw { status: 403, message: "User is not confirmed. Please verify your email." };
  }
  const ok = verifyPassword(input.password, user.passwordHash, user.passwordSalt);
  if (!ok) {
    throw { status: 401, message: "Invalid credentials." };
  }
  const token = await createLocalToken({
    sub: user.cognitoSub,
    email: user.email,
    name: user.name,
    role: user.role,
    userId: user.id,
  });
  return { accessToken: token, idToken: token, refreshToken: null, expiresIn: 3600, tokenType: "Bearer" };
}
