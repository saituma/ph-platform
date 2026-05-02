import { Router } from "express";

import {
  confirmRegistration,
  login,
  refreshToken,
  register,
  startRegistration,
  updateRole,
  resendConfirmation,
  startPasswordReset,
  confirmPasswordReset,
  getMe,
  updateMe,
  updatePassword,
  deleteAccount,
  getSessionCompat,
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";
import { rateLimiters } from "../lib/rateLimiter";
import { requireTurnstile } from "../lib/turnstile";

const router = Router();
const authLimiter = rateLimiters.auth;
const deleteAccountLimiter = rateLimiters.deleteAccount;

router.post("/auth/register", authLimiter, requireTurnstile, register);
router.post("/auth/register/start", authLimiter, requireTurnstile, startRegistration);
router.post("/auth/onboarding/role", authLimiter, updateRole);
router.post("/auth/confirm", authLimiter, confirmRegistration);
router.post("/auth/resend", authLimiter, resendConfirmation);
router.post("/auth/login", authLimiter, requireTurnstile, login);
router.post("/auth/refresh", authLimiter, refreshToken);
router.post("/auth/forgot", authLimiter, startPasswordReset);
router.post("/auth/forgot/confirm", authLimiter, confirmPasswordReset);
router.get("/auth/get-session", getSessionCompat);
router.get("/auth/session", getSessionCompat);
router.get("/auth/me", requireAuth, getMe);
router.patch("/auth/me", requireAuth, updateMe);
router.post("/auth/change-password", requireAuth, updatePassword);
router.post("/auth/delete-account", deleteAccountLimiter, requireAuth, deleteAccount);

export default router;
