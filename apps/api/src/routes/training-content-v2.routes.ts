import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import {
  createTrainingModuleHandler,
  createTrainingOtherContentHandler,
  createTrainingSessionHandler,
  createTrainingSessionItemHandler,
  deleteTrainingModuleHandler,
  deleteTrainingOtherContentHandler,
  deleteTrainingSessionHandler,
  deleteTrainingSessionItemHandler,
  finishTrainingSessionHandler,
  getTrainingContentAdminWorkspaceHandler,
  getTrainingContentMobileWorkspaceHandler,
  updateTrainingModuleHandler,
  updateTrainingOtherContentHandler,
  updateTrainingSessionHandler,
  updateTrainingSessionItemHandler,
} from "../controllers/training-content-v2.controller";

const router = Router();

router.get("/training-content-v2/admin", requireAuth, requireRole(["coach", "admin", "superAdmin"]), getTrainingContentAdminWorkspaceHandler);
router.get("/training-content-v2/mobile", requireAuth, getTrainingContentMobileWorkspaceHandler);
router.post("/training-content-v2/mobile/sessions/:sessionId/finish", requireAuth, finishTrainingSessionHandler);

router.post("/training-content-v2/modules", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createTrainingModuleHandler);
router.put("/training-content-v2/modules/:moduleId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), updateTrainingModuleHandler);
router.delete("/training-content-v2/modules/:moduleId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), deleteTrainingModuleHandler);

router.post("/training-content-v2/sessions", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createTrainingSessionHandler);
router.put("/training-content-v2/sessions/:sessionId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), updateTrainingSessionHandler);
router.delete("/training-content-v2/sessions/:sessionId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), deleteTrainingSessionHandler);

router.post("/training-content-v2/items", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createTrainingSessionItemHandler);
router.put("/training-content-v2/items/:itemId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), updateTrainingSessionItemHandler);
router.delete("/training-content-v2/items/:itemId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), deleteTrainingSessionItemHandler);

router.post("/training-content-v2/others", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createTrainingOtherContentHandler);
router.put("/training-content-v2/others/:otherId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), updateTrainingOtherContentHandler);
router.delete("/training-content-v2/others/:otherId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), deleteTrainingOtherContentHandler);

export default router;
