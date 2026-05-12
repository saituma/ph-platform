import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { upsertUserStreak, getUserStreak } from "../services/streak.service";

const router = Router();

const syncSchema = z.object({
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  totalDays: z.number().int().min(0),
  totalSessions: z.number().int().min(0),
  totalMinutes: z.number().int().min(0),
  completedDates: z.array(z.string()),
  lastActivityDate: z.string().nullable().optional(),
  freezesAvailable: z.number().int().min(0).optional(),
  freezesUsedDates: z.array(z.string()).optional(),
  timezone: z.string().optional(),
});

router.post("/streaks/sync", requireAuth, async (req, res) => {
  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid streak data" });
  }
  const merged = await upsertUserStreak(req.user!.id, {
    ...parsed.data,
    lastActivityDate: parsed.data.lastActivityDate ?? null,
  });
  return res.status(200).json(merged);
});

router.get("/streaks/me", requireAuth, async (req, res) => {
  const row = await getUserStreak(req.user!.id);
  if (!row) {
    return res.status(200).json({
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      totalSessions: 0,
      totalMinutes: 0,
      completedDates: [],
      freezesAvailable: 0,
      freezesUsedDates: [],
      timezone: null,
      lastActivityDate: null,
    });
  }
  return res.status(200).json(row);
});

export default router;
