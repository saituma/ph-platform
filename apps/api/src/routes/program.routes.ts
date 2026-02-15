import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { getProgram, getProgramSessionsById, listPrograms } from "../controllers/program.controller";

const router = Router();

router.get("/programs", requireAuth, listPrograms);
router.get("/programs/:programId", requireAuth, getProgram);
router.get("/programs/:programId/sessions", requireAuth, getProgramSessionsById);

export default router;
