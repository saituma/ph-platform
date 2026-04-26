import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { getMyReferralCode, getMyReferrals } from "../controllers/referral.controller";

const router = Router();

router.get("/referral/my-code", requireAuth, getMyReferralCode);
router.get("/referral/my-referrals", requireAuth, getMyReferrals);

export default router;
