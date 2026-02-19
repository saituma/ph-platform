import { Router } from "express";

import {
  createProgramSectionContentHandler,
  deleteProgramSectionContentHandler,
  listProgramSectionContentHandler,
  updateProgramSectionContentHandler,
} from "../controllers/program-section.controller";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";

const router = Router();

router.get("/program-section-content", requireAuth, listProgramSectionContentHandler);
router.post(
  "/program-section-content",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  createProgramSectionContentHandler
);
router.put(
  "/program-section-content/:contentId",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  updateProgramSectionContentHandler
);
router.delete(
  "/program-section-content/:contentId",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  deleteProgramSectionContentHandler
);

export default router;
