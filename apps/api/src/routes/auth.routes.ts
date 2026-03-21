import { Router } from "express";

import {
  confirmRegistration,
  login,
  refreshToken,
  register,
  resendConfirmation,
  startPasswordReset,
  confirmPasswordReset,
  getMe,
  updateMe,
  updatePassword,
  deleteAccount,
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";
import rateLimit from "express-rate-limit";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const deleteAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/auth/register", authLimiter, register);
router.post("/auth/confirm", authLimiter, confirmRegistration);
router.post("/auth/resend", authLimiter, resendConfirmation);
router.post("/auth/login", authLimiter, login);
router.post("/auth/refresh", authLimiter, refreshToken);
router.post("/auth/forgot", authLimiter, startPasswordReset);
router.post("/auth/forgot/confirm", authLimiter, confirmPasswordReset);
router.get("/auth/me", requireAuth, getMe);
router.patch("/auth/me", requireAuth, updateMe);
router.post("/auth/change-password", requireAuth, updatePassword);
router.post("/auth/delete-account", deleteAccountLimiter, requireAuth, deleteAccount);

export default router;
