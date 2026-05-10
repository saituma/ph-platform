import { Router } from "express";

import {
  confirmRegistration,
  issueSocketToken,
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
router.post("/auth/onboarding/role", authLimiter, requireAuth, updateRole);
router.post("/auth/confirm", authLimiter, confirmRegistration);
router.post("/auth/resend", authLimiter, resendConfirmation);
router.post("/auth/login", authLimiter, requireTurnstile, login);
router.post("/auth/refresh", authLimiter, refreshToken);
router.post("/auth/forgot", authLimiter, startPasswordReset);
router.post("/auth/forgot/confirm", authLimiter, confirmPasswordReset);
// get-session and session are soft endpoints: they return null session without auth rather than 401.
// getSessionCompat reads the Authorization header directly and handles missing tokens gracefully.
router.get("/auth/get-session", authLimiter, getSessionCompat);
router.get("/auth/session", authLimiter, getSessionCompat);
router.get("/auth/me", requireAuth, getMe);
router.get("/auth/socket-token", requireAuth, issueSocketToken);
router.patch("/auth/me", requireAuth, updateMe);
router.post("/auth/change-password", requireAuth, updatePassword);
router.post("/auth/delete-account", deleteAccountLimiter, requireAuth, deleteAccount);

export default router;
