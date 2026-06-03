import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { listProgressEntries, upsertProgressEntry, deleteProgressEntry } from "../controllers/progress.controller";

const router = Router();

router.get("/progress/entries", requireAuth, listProgressEntries);
router.post("/progress/entries", requireAuth, upsertProgressEntry);
router.delete("/progress/entries/:entryId", requireAuth, deleteProgressEntry);

export default router;
