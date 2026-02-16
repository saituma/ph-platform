import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { getProgram, getProgramSessionsById, listProgramExercises, listPrograms } from "../controllers/program.controller";

const router = Router();

router.get("/programs", requireAuth, listPrograms);
router.get("/programs/exercises", requireAuth, listProgramExercises);
router.get("/programs/:programId", requireAuth, getProgram);
router.get("/programs/:programId/sessions", requireAuth, getProgramSessionsById);

export default router;
