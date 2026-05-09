import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { upsertUserStreak } from "../services/streak.service";

const router = Router();

const syncSchema = z.object({
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  totalDays: z.number().int().min(0),
  totalSessions: z.number().int().min(0),
  totalMinutes: z.number().int().min(0),
  completedDates: z.array(z.string()),
  lastActivityDate: z.string().nullable().optional(),
});

router.post("/streaks/sync", requireAuth, async (req, res) => {
  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid streak data" });
  }
  await upsertUserStreak(req.user!.id, {
    ...parsed.data,
    lastActivityDate: parsed.data.lastActivityDate ?? null,
  });
  return res.status(200).json({ ok: true });
});

export default router;
