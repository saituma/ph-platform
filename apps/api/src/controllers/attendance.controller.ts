import type { Request, Response } from "express";
import { z } from "zod";
import { getMyAttendanceStatus, listAttendanceForAdmin } from "../services/attendance.service";

export async function getMyAttendanceToday(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const item = await getMyAttendanceStatus(req.user.id);
  if (!item) return res.status(404).json({ error: "Athlete profile not found" });
  return res.status(200).json({ item });
}

const listSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function listAttendanceAdmin(req: Request, res: Response) {
  const parsed = listSchema.safeParse(req.query ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten().fieldErrors });
  }

  const fromDate = parsed.data.from ? new Date(`${parsed.data.from}T00:00:00.000Z`) : new Date();
  let toDate = parsed.data.to ? new Date(`${parsed.data.to}T00:00:00.000Z`) : new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return res.status(400).json({ error: "from/to must be valid dates" });
  }

  if (toDate.getTime() <= fromDate.getTime()) {
    toDate = new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
  }

  const items = await listAttendanceForAdmin({ from: fromDate, to: toDate });
  return res.status(200).json({ items });
}
