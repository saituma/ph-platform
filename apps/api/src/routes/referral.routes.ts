import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { getMyReferralCode, getMyReferrals, getAdminReferrals } from "../controllers/referral.controller";
import { requireRole } from "../middlewares/roles";

const router = Router();

router.get("/referral/my-code", requireAuth, getMyReferralCode);
router.get("/referral/my-referrals", requireAuth, getMyReferrals);
router.get("/admin/referrals", requireAuth, requireRole(["admin", "superAdmin", "coach"]), getAdminReferrals);

export default router;
