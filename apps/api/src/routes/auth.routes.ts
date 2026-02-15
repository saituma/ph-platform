import { Router } from "express";

import {
  confirmRegistration,
  login,
  register,
  resendConfirmation,
  startPasswordReset,
  confirmPasswordReset,
  getMe,
  updatePassword,
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/auth/register", register);
router.post("/auth/confirm", confirmRegistration);
router.post("/auth/resend", resendConfirmation);
router.post("/auth/login", login);
router.post("/auth/forgot", startPasswordReset);
router.post("/auth/forgot/confirm", confirmPasswordReset);
router.get("/auth/me", requireAuth, getMe);
router.post("/auth/change-password", requireAuth, updatePassword);

export default router;
