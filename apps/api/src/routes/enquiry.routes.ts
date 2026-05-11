import { Router } from "express";

import {
  deleteEnquiryAdmin,
  getEnquiryAdmin,
  getEnquiryStatsAdmin,
  listEnquiriesAdmin,
  submitEnquiry,
  submitWaitlist,
  updateEnquiryAdmin,
} from "../controllers/enquiry.controller";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import { rateLimiters } from "../lib/rateLimiter";

const router = Router();

// Public — submit an enquiry from the website
router.post("/enquiries", rateLimiters.auth, submitEnquiry);
router.post("/waitlist", rateLimiters.auth, submitWaitlist);

// Admin — manage enquiries
const adminAuth = [requireAuth, requireRole(["coach", "admin", "superAdmin"])] as const;

router.get("/admin/enquiries", ...adminAuth, listEnquiriesAdmin);
router.get("/admin/enquiries/stats", ...adminAuth, getEnquiryStatsAdmin);
router.get("/admin/enquiries/:id", ...adminAuth, getEnquiryAdmin);
router.patch("/admin/enquiries/:id", ...adminAuth, updateEnquiryAdmin);
router.delete("/admin/enquiries/:id", ...adminAuth, deleteEnquiryAdmin);

export default router;
