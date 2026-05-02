import { Router } from "express";

import {
  deleteEnquiryAdmin,
  getEnquiryAdmin,
  getEnquiryStatsAdmin,
  listEnquiriesAdmin,
  submitEnquiry,
  updateEnquiryAdmin,
} from "../controllers/enquiry.controller";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";

const router = Router();

// Public — submit an enquiry from the website
router.post("/enquiries", submitEnquiry);

// Admin — manage enquiries
const adminAuth = [requireAuth, requireRole(["coach", "admin", "superAdmin"])] as const;

router.get("/admin/enquiries", ...adminAuth, listEnquiriesAdmin);
router.get("/admin/enquiries/stats", ...adminAuth, getEnquiryStatsAdmin);
router.get("/admin/enquiries/:id", ...adminAuth, getEnquiryAdmin);
router.patch("/admin/enquiries/:id", ...adminAuth, updateEnquiryAdmin);
router.delete("/admin/enquiries/:id", ...adminAuth, deleteEnquiryAdmin);

export default router;
