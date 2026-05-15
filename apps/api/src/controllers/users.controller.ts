import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import { auditLogsTable, userTable } from "../db/schema";
import { env } from "../config/env";
import { sendContentReportEmail } from "../lib/mailer/admin.mailer";
import { logger } from "../lib/logger";

const reportUserSchema = z.object({
  reason: z.string().trim().min(1).max(200),
  details: z.string().trim().max(500).optional(),
});

export async function reportUser(req: Request, res: Response) {
  const targetUserId = z.coerce.number().int().min(1).parse(req.params.userId);
  const actingUserId = req.user!.id;

  if (targetUserId === actingUserId) {
    return res.status(400).json({ error: "Cannot report yourself" });
  }

  const parsed = reportUserSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const reasonSlug = parsed.data.reason.slice(0, 450);
  const detailsSuffix = parsed.data.details ? ` | ${parsed.data.details.slice(0, 40)}` : "";
  await db.insert(auditLogsTable).values({
    performedBy: actingUserId,
    action: `user_reported:${reasonSlug}${detailsSuffix}`,
    targetTable: "users",
    targetId: targetUserId,
  });

  // Notify developer — fire-and-forget so the user's response is instant
  const adminEmail = (env.smtpFrom || env.smtpUser).trim();
  if (adminEmail) {
    const [reporter, reported] = await Promise.all([
      db.select({ name: userTable.name, email: userTable.email }).from(userTable).where(eq(userTable.id, actingUserId)).limit(1),
      db.select({ name: userTable.name }).from(userTable).where(eq(userTable.id, targetUserId)).limit(1),
    ]);
    sendContentReportEmail({
      to: adminEmail,
      reporterName: reporter[0]?.name ?? "",
      reporterEmail: reporter[0]?.email ?? "",
      reportedUserId: targetUserId,
      reportedUserName: reported[0]?.name ?? null,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
      adminWebUrl: env.adminWebUrl,
    }).catch((err) => logger.error({ err }, "content report email failed"));
  }

  return res.status(200).json({ ok: true });
}

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
