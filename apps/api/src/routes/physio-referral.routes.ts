import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import {
  createPhysioReferralAdmin,
  deletePhysioReferralAdmin,
  getPhysioReferral,
  listPhysioReferralsAdmin,
  updatePhysioReferralAdmin,
} from "../controllers/physio-referral.controller";

const router = Router();

router.get("/physio-referral", requireAuth, getPhysioReferral);
router.get("/admin/physio-referrals", requireAuth, requireRole(["coach", "admin", "superAdmin"]), listPhysioReferralsAdmin);
router.post("/admin/physio-referrals", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createPhysioReferralAdmin);
router.patch(
  "/admin/physio-referrals/:id",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  updatePhysioReferralAdmin
);
router.delete(
  "/admin/physio-referrals/:id",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  deletePhysioReferralAdmin
);

export default router;
