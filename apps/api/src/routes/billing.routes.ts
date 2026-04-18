import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import {
  approveRequestAdmin,
  confirmCheckout,
  confirmPaymentSheet,
  createCheckout,
  createPaymentSheet,
  createPlanAdmin,
  downgradePlan,
  getBillingStatus,
  listPlans,
  listPlansAdmin,
  listRequestsAdmin,
  rejectRequestAdmin,
  syncRequestPaymentAdmin,
  updatePlanAdmin,
  verifyRevenueCatPurchase,
} from "../controllers/billing.controller";

const router = Router();

router.get("/billing/plans", listPlans);
router.get("/billing/public-plans", listPlans);
router.get("/billing/status", requireAuth, getBillingStatus);
router.post("/billing/checkout", requireAuth, createCheckout);
router.post("/billing/payment-sheet", requireAuth, createPaymentSheet);
router.post("/billing/payment-sheet/confirm", requireAuth, confirmPaymentSheet);
router.post("/billing/revenuecat/verify", requireAuth, verifyRevenueCatPurchase);
router.post("/billing/confirm", requireAuth, confirmCheckout);
router.post("/billing/downgrade", requireAuth, downgradePlan);

router.get(
  "/admin/subscription-plans",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  listPlansAdmin
);
router.post(
  "/admin/subscription-plans",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  createPlanAdmin
);
router.put(
  "/admin/subscription-plans/:planId",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  updatePlanAdmin
);
router.get(
  "/admin/subscription-requests",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  listRequestsAdmin
);
router.post(
  "/admin/subscription-requests/:requestId/approve",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  approveRequestAdmin
);
router.post(
  "/admin/subscription-requests/:requestId/reject",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  rejectRequestAdmin
);
router.post(
  "/admin/subscription-requests/:requestId/sync-payment",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  syncRequestPaymentAdmin
);

export default router;
