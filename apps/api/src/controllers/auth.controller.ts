import type { Request, Response } from "express";
import { z } from "zod";

import {
  confirmForgotPassword,
  confirmSignUp,
  changePassword,
  confirmLocal,
  loginUser,
  loginLocal,
  resendConfirmation as resendConfirmationCode,
  resendLocal,
  signUpUser,
  registerLocal,
  startForgotPassword,
} from "../services/auth.service";
import { env } from "../config/env";

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

const forgotSchema = z.object({
  email: z.string().email(),
});

const forgotConfirmSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
  password: z.string().min(8),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(8),
  newPassword: z.string().min(8),
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

export async function startPasswordReset(req: Request, res: Response) {
  const input = forgotSchema.parse(req.body);
  const response = await startForgotPassword(input);
  return res.status(200).json({ ok: true, codeDelivery: response.CodeDeliveryDetails });
}

export async function confirmPasswordReset(req: Request, res: Response) {
  const input = forgotConfirmSchema.parse(req.body);
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
