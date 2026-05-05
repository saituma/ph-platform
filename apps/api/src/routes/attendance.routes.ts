import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import { getMyAttendanceToday, listAttendanceAdmin } from "../controllers/attendance.controller";

const router = Router();

router.get("/attendance/today", requireAuth, getMyAttendanceToday);
router.get("/admin/attendance", requireAuth, requireRole(["coach", "admin", "superAdmin"]), listAttendanceAdmin);

export default router;
