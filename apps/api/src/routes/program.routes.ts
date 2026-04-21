import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import {
  getActiveProgramAiInsightController,
  getProgram,
  getProgramAiInsightController,
  getProgramSessionsById,
  listProgramExercises,
  listPrograms,
} from "../controllers/program.controller";

const router = Router();

router.get("/programs", requireAuth, listPrograms);
router.get("/programs/exercises", requireAuth, listProgramExercises);
router.get("/programs/active-insight", requireAuth, getActiveProgramAiInsightController);
router.get("/programs/:programId", requireAuth, getProgram);
router.get("/programs/:programId/sessions", requireAuth, getProgramSessionsById);
router.get("/programs/:programId/ai-insight", requireAuth, getProgramAiInsightController);

export default router;
