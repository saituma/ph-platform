import type { Request, Response } from "express";
import { z } from "zod";

import { db } from "../db";
import { auditLogsTable } from "../db/schema";

export async function blockUser(req: Request, res: Response) {
  const targetUserId = z.coerce.number().int().min(1).parse(req.params.userId);
  const actingUserId = req.user!.id;

  if (targetUserId === actingUserId) {
    return res.status(400).json({ error: "Cannot block yourself" });
  }

  await db.insert(auditLogsTable).values({
    performedBy: actingUserId,
    action: "user_blocked",
    targetTable: "users",
    targetId: targetUserId,
  });

  return res.status(200).json({ ok: true });
}
