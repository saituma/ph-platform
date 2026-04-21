import { Router } from "express";

import {
  createProgramSectionContentHandler,
  completeProgramSectionContentHandler,
  completeTrainingSessionHandler,
  deleteProgramSectionContentHandler,
  getProgramSectionContentHandler,
  getTrainingProgressHandler,
  listProgramSectionContentHandler,
  updateProgramSectionContentHandler,
} from "../controllers/program-section.controller";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";

const router = Router();

router.get("/program-section-content", requireAuth, listProgramSectionContentHandler);
router.get("/training-progress", requireAuth, getTrainingProgressHandler);
router.get("/program-section-content/:contentId", requireAuth, getProgramSectionContentHandler);
router.post("/program-section-content/:contentId/complete", requireAuth, completeProgramSectionContentHandler);
router.post("/program-section-content/complete-session", requireAuth, completeTrainingSessionHandler);
router.post(
  "/program-section-content",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  createProgramSectionContentHandler,
);
router.put(
  "/program-section-content/:contentId",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  updateProgramSectionContentHandler,
);
router.delete(
  "/program-section-content/:contentId",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  deleteProgramSectionContentHandler,
);

export default router;
