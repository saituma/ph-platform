import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import * as SuperAdminController from "../controllers/super-admin.controller";

const router = Router();

// All super-admin routes require superAdmin role
router.use("/super-admin", requireAuth, requireRole(["superAdmin"]));

router.get("/super-admin/stats", SuperAdminController.getSystemStats);
router.get("/super-admin/admins", SuperAdminController.listAdmins);
router.post("/super-admin/users/:userId/role", SuperAdminController.updateUserRole);
router.get("/super-admin/audit-logs", SuperAdminController.getAuditLogs);
router.post("/super-admin/events", SuperAdminController.trackSuperAdminEvent);

export default router;
