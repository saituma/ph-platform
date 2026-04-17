import type { Request, Response } from "express";
import { z } from "zod";

import {
  confirmForgotPassword,
  confirmForgotPasswordLocal,
  confirmSignUp,
  changePassword,
  confirmLocal,
  loginUser,
  loginLocal,
  refreshUserSession,
  resendConfirmation as resendConfirmationCode,
  resendLocal,
  signUpUser,
  registerLocal,
  startEmailRegistration,
  startForgotPassword,
  startForgotPasswordLocal,
} from "../services/auth.service";
import { updateUserProfile } from "../services/user.service";
import { deleteOwnAccount } from "../services/account-deletion.service";
import { env } from "../config/env";
import { normalizeStoredMediaUrl } from "../services/s3.service";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const confirmSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
});

const resendSchema = z.object({
  email: z.string().email(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const forgotConfirmSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
  password: z.string().min(8),
});

const startRegisterSchema = z.object({
  email: z.string().email(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

const deleteAccountSchema = z.object({
  password: z.string().min(8),
});

const updateMeSchema = z
  .object({
    name: z.string().min(1).optional(),
    profilePicture: z.string().url().nullable().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "No fields to update",
  });

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  if (env.authMode === "local") {
    await registerLocal(input);
    return res.status(200).json({ ok: true });
  }
  const response = await signUpUser(input);
  if ("alreadyExists" in response) {
    return res.status(200).json({ userSub: null, codeDelivery: response.CodeDeliveryDetails, alreadyExists: true });
  }
  return res.status(201).json({ userSub: response.UserSub, codeDelivery: response.CodeDeliveryDetails });
}

export async function startRegistration(req: Request, res: Response) {
  const input = startRegisterSchema.parse(req.body);
  if (env.authMode === "local") {
    await startEmailRegistration(input);
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ error: "Email-only registration is only supported in local auth mode." });
}

export async function confirmRegistration(req: Request, res: Response) {
  const input = confirmSchema.parse(req.body);
  if (env.authMode === "local") {
    await confirmLocal(input);
    return res.status(200).json({ ok: true });
  }
  await confirmSignUp(input);
  return res.status(200).json({ ok: true });
}

export async function resendConfirmation(req: Request, res: Response) {
  const input = resendSchema.parse(req.body);
  if (env.authMode === "local") {
    await resendLocal(input);
    return res.status(200).json({ ok: true });
  }
  const response = await resendConfirmationCode(input);
  return res.status(200).json({ ok: true, codeDelivery: response.CodeDeliveryDetails });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  if (env.authMode === "local") {
    const response = await loginLocal(input);
    return res.status(200).json(response);
  }
  const response = await loginUser(input);
  return res.status(200).json({
    accessToken: response.AuthenticationResult?.AccessToken,
    idToken: response.AuthenticationResult?.IdToken,
    refreshToken: response.AuthenticationResult?.RefreshToken,
    expiresIn: response.AuthenticationResult?.ExpiresIn,
    tokenType: response.AuthenticationResult?.TokenType,
  });
}

export async function refreshToken(req: Request, res: Response) {
  const input = refreshSchema.parse(req.body);
  if (env.authMode === "local") {
    return res.status(400).json({ error: "Refresh token is not available in local auth mode." });
  }
  const response = await refreshUserSession(input);
  return res.status(200).json({
    accessToken: response.AuthenticationResult?.AccessToken,
    idToken: response.AuthenticationResult?.IdToken,
    expiresIn: response.AuthenticationResult?.ExpiresIn,
    tokenType: response.AuthenticationResult?.TokenType,
  });
}

export async function startPasswordReset(req: Request, res: Response) {
  const input = forgotSchema.parse(req.body);
  if (env.authMode === "local") {
    await startForgotPasswordLocal(input);
    return res.status(200).json({ ok: true });
  }
  const response = await startForgotPassword(input);
  return res.status(200).json({ ok: true, codeDelivery: response.CodeDeliveryDetails });
}

export async function confirmPasswordReset(req: Request, res: Response) {
  const input = forgotConfirmSchema.parse(req.body);
  if (env.authMode === "local") {
    await confirmForgotPasswordLocal(input);
    return res.status(200).json({ ok: true });
  }
  await confirmForgotPassword(input);
  return res.status(200).json({ ok: true });
}

export async function updatePassword(req: Request, res: Response) {
  const input = changePasswordSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Invalid request", details: input.error.flatten().fieldErrors });
  }
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.replace("Bearer ", "") : "";
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  await changePassword({
    accessToken: token,
    previousPassword: input.data.oldPassword,
    proposedPassword: input.data.newPassword,
  });
  return res.status(200).json({ ok: true });
}

export async function getMe(req: Request, res: Response) {
  return res.status(200).json({ user: req.user });
}

export async function deleteAccount(req: Request, res: Response) {
  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter your current password (at least 8 characters)." });
  }
  try {
    await deleteOwnAccount(req.user!.id, parsed.data.password);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    const message = typeof err?.message === "string" ? err.message : "Could not delete account.";
    return res.status(status).json({ error: message });
  }
}

export async function updateMe(req: Request, res: Response) {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const updated = await updateUserProfile(req.user!.id, parsed.data);
  if (!updated) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.status(200).json({
    user: {
      id: updated.id,
      role: updated.role,
      email: updated.email,
      name: updated.name,
      sub: updated.cognitoSub,
      profilePicture: normalizeStoredMediaUrl(updated.profilePicture ?? null),
    },
  });
}
