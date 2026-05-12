import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import {
  completeMySessionController,
  getActiveProgramAiInsightController,
  getMyProgramFullController,
  getMySessionCompletionController,
  getMySessionExercisesController,
  getMyTeamSessionsController,
  getProgram,
  getProgramAiInsightController,
  getProgramSessionsById,
  listMyAssignedPrograms,
  listProgramExercises,
  listPrograms,
} from "../controllers/program.controller";

const router = Router();

router.get("/programs", requireAuth, listPrograms);
router.get("/programs/exercises", requireAuth, listProgramExercises);
router.get("/programs/active-insight", requireAuth, getActiveProgramAiInsightController);
router.get("/programs/my-assigned", requireAuth, listMyAssignedPrograms);
router.get("/programs/my-assigned/team/:teamId", requireAuth, getMyTeamSessionsController);
router.get("/programs/my-assigned/:programId", requireAuth, getMyProgramFullController);
router.get("/programs/my-sessions/:sessionId/exercises", requireAuth, getMySessionExercisesController);
router.get("/programs/my-sessions/:sessionId/completion", requireAuth, getMySessionCompletionController);
router.post("/programs/my-sessions/:sessionId/complete", requireAuth, completeMySessionController);
router.get("/programs/:programId", requireAuth, getProgram);
router.get("/programs/:programId/sessions", requireAuth, getProgramSessionsById);
router.get("/programs/:programId/ai-insight", requireAuth, getProgramAiInsightController);

export default router;
