import type { Request, Response, NextFunction } from "express";
import { sql, eq, and, ne } from "drizzle-orm";
import { db } from "../db";
import { userTable, Role, auditLogsTable, athleteTable, teamTable, subscriptionRequestTable } from "../db/schema";

/**
 * GET /api/super-admin/stats
 * Returns system-wide statistics.
 */
export async function getSystemStats(req: Request, res: Response, next: NextFunction) {
  try {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(userTable);
    const [athleteCount] = await db.select({ count: sql<number>`count(*)` }).from(athleteTable);
    const [teamCount] = await db.select({ count: sql<number>`count(*)` }).from(teamTable);
    const [activeSubs] = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptionRequestTable)
      .where(eq(subscriptionRequestTable.status, "approved"));

    res.json({
      users: Number(userCount?.count ?? 0),
      athletes: Number(athleteCount?.count ?? 0),
      teams: Number(teamCount?.count ?? 0),
      activeSubscriptions: Number(activeSubs?.count ?? 0),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/super-admin/admins
 * Lists all users with admin-level roles.
 */
export async function listAdmins(req: Request, res: Response, next: NextFunction) {
  try {
    const admins = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
        createdAt: userTable.createdAt,
      })
      .from(userTable)
      .where(sql`${userTable.role} IN ('admin', 'superAdmin', 'coach', 'team_coach', 'program_coach')`)
      .orderBy(userTable.createdAt);

    res.json(admins);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/super-admin/users/:userId/role
 * Updates a user's role.
 */
export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !Role.enumValues.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const updated = await db
      .update(userTable)
      .set({ role, updatedAt: new Date() })
      .where(eq(userTable.id, Number(userId)))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    // Log the action
    await db.insert(auditLogsTable).values({
      performedBy: (req as any).user.id,
      action: `Updated user ${userId} role to ${role}`,
      targetTable: "users",
      targetId: Number(userId),
    });

    res.json(updated[0]);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/super-admin/audit-logs
 * Returns recent audit logs.
 */
export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const logs = await db
      .select({
        id: auditLogsTable.id,
        action: auditLogsTable.action,
        targetTable: auditLogsTable.targetTable,
        targetId: auditLogsTable.targetId,
        createdAt: auditLogsTable.createdAt,
        performerName: userTable.name,
        performerEmail: userTable.email,
      })
      .from(auditLogsTable)
      .leftJoin(userTable, eq(auditLogsTable.performedBy, userTable.id))
      .orderBy(sql`${auditLogsTable.createdAt} DESC`)
      .limit(100);

    res.json(logs);
  } catch (error) {
    next(error);
  }
}
