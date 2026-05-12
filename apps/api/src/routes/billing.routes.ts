import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import {
  approveRequestAdmin,
  approveTeamRequestAdmin,
  confirmCheckout,
  confirmCheckoutPublic,
  confirmPaymentSheet,
  createCheckout,
  createTeamCheckout,
  createPaymentSheet,
  createPlanAdmin,
  importPlanAdmin,
  invitePlanUserAdmin,
  getPlanInviteSummaryPublic,
  consumePlanInvitePublic,
  downgradePlan,
  getBillingStatus,
  getTeamPaymentConfigDraft,
  getPaymentReceipt,
  getPublicInvoice,
  listInvoices,
  listTeamRequestsAdmin,
  listPlans,
  listPlansAdmin,
  listStripePricesAdmin,
  listRequestsAdmin,
  rejectRequestAdmin,
  rejectTeamRequestAdmin,
  resendTeamPlayerInviteAdmin,
  sponsorTeamPlayerInviteAdmin,
  syncRequestPaymentAdmin,
  syncTeamRequestPaymentAdmin,
  updatePlanAdmin,
  upsertTeamPaymentConfigDraft,
  verifyRevenueCatPurchase,
  listTeamPlayerInvitesAdmin,
} from "../controllers/billing";

const router = Router();

router.get("/billing/plans", listPlans);
// Public invite endpoints (no auth — token is the credential).
router.get("/public/plan-invites/:token", getPlanInviteSummaryPublic);
router.post("/public/plan-invites/:token/checkout", consumePlanInvitePublic);
router.get("/public/invoice/:receiptId", getPublicInvoice);
router.get("/billing/public-plans", listPlans);
router.get("/billing/status", requireAuth, getBillingStatus);
router.get("/billing/team/payment-config-draft/:teamId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), getTeamPaymentConfigDraft);
router.put("/billing/team/payment-config-draft/:teamId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), upsertTeamPaymentConfigDraft);
router.post("/billing/checkout", requireAuth, createCheckout);
router.post("/billing/team/checkout", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createTeamCheckout);
router.post("/billing/payment-sheet", requireAuth, createPaymentSheet);
router.post("/billing/payment-sheet/confirm", requireAuth, confirmPaymentSheet);
router.post("/billing/revenuecat/verify", requireAuth, verifyRevenueCatPurchase);
router.post("/billing/confirm", requireAuth, confirmCheckout);
// Public variant for unauthenticated invite-flow returns (Stripe session_id is the credential).
router.post("/public/billing/confirm", confirmCheckoutPublic);
router.get("/billing/receipt/:receiptId", requireAuth, getPaymentReceipt);
router.post("/billing/downgrade", requireAuth, downgradePlan);
router.get("/billing/invoices", requireAuth, listInvoices);

router.get("/admin/subscription-plans", requireAuth, requireRole(["coach", "admin", "superAdmin"]), listPlansAdmin);
router.get("/admin/stripe-prices", requireAuth, requireRole(["admin", "superAdmin"]), listStripePricesAdmin);
router.post("/admin/subscription-plans", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createPlanAdmin);
router.post(
  "/admin/subscription-plans/import",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  importPlanAdmin,
);
router.post(
  "/admin/subscription-plans/:planId/invites",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  invitePlanUserAdmin,
);
router.put(
  "/admin/subscription-plans/:planId",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  updatePlanAdmin,
);
router.get(
  "/admin/subscription-requests",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  listRequestsAdmin,
);
router.get(
  "/admin/team-subscription-requests",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  listTeamRequestsAdmin,
);
router.post(
  "/admin/subscription-requests/:requestId/approve",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  approveRequestAdmin,
);
router.post(
  "/admin/team-subscription-requests/:requestId/approve",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  approveTeamRequestAdmin,
);
router.post(
  "/admin/subscription-requests/:requestId/reject",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  rejectRequestAdmin,
);
router.post(
  "/admin/team-subscription-requests/:requestId/reject",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  rejectTeamRequestAdmin,
);
router.post(
  "/admin/subscription-requests/:requestId/sync-payment",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  syncRequestPaymentAdmin,
);
router.post(
  "/admin/team-subscription-requests/:requestId/sync-payment",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  syncTeamRequestPaymentAdmin,
);
router.get(
  "/admin/team-subscription-requests/:requestId/invites",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  listTeamPlayerInvitesAdmin,
);
router.post(
  "/admin/team-subscription-requests/:requestId/invites/:inviteId/resend",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  resendTeamPlayerInviteAdmin,
);
router.post(
  "/admin/team-subscription-requests/:requestId/invites/:inviteId/sponsor",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  sponsorTeamPlayerInviteAdmin,
);

export default router;
