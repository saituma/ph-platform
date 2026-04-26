import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../db";
import {
  notificationTable,
  nutritionLogsTable,
  runLogTable,
  subscriptionPlanTable,
  subscriptionRequestTable,
} from "../db/schema";

export type ActivityItem = {
  id: string;
  type: "nutrition" | "run" | "billing" | "notification";
  title: string;
  description: string;
  date: string;
  icon: string;
};

export async function getActivityFeed(
  userId: number,
  limit = 20,
  offset = 0,
): Promise<{ items: ActivityItem[]; total: number }> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days

  const [nutritionLogs, runLogs, subscriptionRequests, notifications] = await Promise.all([
    db
      .select({
        id: nutritionLogsTable.id,
        dateKey: nutritionLogsTable.dateKey,
        breakfast: nutritionLogsTable.breakfast,
        lunch: nutritionLogsTable.lunch,
        dinner: nutritionLogsTable.dinner,
        waterIntake: nutritionLogsTable.waterIntake,
        loggedAt: nutritionLogsTable.loggedAt,
      })
      .from(nutritionLogsTable)
      .where(and(eq(nutritionLogsTable.userId, userId), gte(nutritionLogsTable.loggedAt, since)))
      .orderBy(desc(nutritionLogsTable.loggedAt))
      .limit(30),

    db
      .select({
        id: runLogTable.id,
        distanceMeters: runLogTable.distanceMeters,
        durationSeconds: runLogTable.durationSeconds,
        date: runLogTable.date,
      })
      .from(runLogTable)
      .where(and(eq(runLogTable.userId, userId), gte(runLogTable.date, since)))
      .orderBy(desc(runLogTable.date))
      .limit(20),

    db
      .select({
        id: subscriptionRequestTable.id,
        planId: subscriptionRequestTable.planId,
        status: subscriptionRequestTable.status,
        planBillingCycle: subscriptionRequestTable.planBillingCycle,
        createdAt: subscriptionRequestTable.createdAt,
        planName: subscriptionPlanTable.name,
        planTier: subscriptionPlanTable.tier,
      })
      .from(subscriptionRequestTable)
      .leftJoin(subscriptionPlanTable, eq(subscriptionRequestTable.planId, subscriptionPlanTable.id))
      .where(and(eq(subscriptionRequestTable.userId, userId), gte(subscriptionRequestTable.createdAt, since)))
      .orderBy(desc(subscriptionRequestTable.createdAt))
      .limit(10),

    db
      .select({
        id: notificationTable.id,
        type: notificationTable.type,
        content: notificationTable.content,
        read: notificationTable.read,
        link: notificationTable.link,
        createdAt: notificationTable.createdAt,
      })
      .from(notificationTable)
      .where(and(eq(notificationTable.userId, userId), gte(notificationTable.createdAt, since)))
      .orderBy(desc(notificationTable.createdAt))
      .limit(20),
  ]);

  const items: ActivityItem[] = [];

  // Map nutrition logs — deduplicate by dateKey (one entry per day)
  const seenNutritionDates = new Set<string>();
  for (const log of nutritionLogs) {
    if (seenNutritionDates.has(log.dateKey)) continue;
    seenNutritionDates.add(log.dateKey);
    const meals = [log.breakfast && "Breakfast", log.lunch && "Lunch", log.dinner && "Dinner"]
      .filter(Boolean)
      .join(", ");
    items.push({
      id: `nutrition-${log.id}`,
      type: "nutrition",
      title: "Nutrition logged",
      description: meals || (log.waterIntake ? `${log.waterIntake} glasses of water` : "Daily log saved"),
      date: log.loggedAt.toISOString(),
      icon: "utensils",
    });
  }

  // Map run logs
  for (const run of runLogs) {
    const km = (run.distanceMeters / 1000).toFixed(1);
    const mins = Math.round(run.durationSeconds / 60);
    items.push({
      id: `run-${run.id}`,
      type: "run",
      title: "Run logged",
      description: `${km} km in ${mins} minutes`,
      date: run.date.toISOString(),
      icon: "activity",
    });
  }

  // Map billing events
  for (const req of subscriptionRequests) {
    const planLabel = req.planName ?? req.planTier ?? "plan";
    const statusLabel =
      req.status === "approved" ? "activated" : req.status === "pending_payment" ? "checkout started" : req.status;
    items.push({
      id: `billing-${req.id}`,
      type: "billing",
      title: "Billing event",
      description: `${planLabel} — ${statusLabel}`,
      date: req.createdAt.toISOString(),
      icon: "credit-card",
    });
  }

  // Map notifications
  for (const notif of notifications) {
    items.push({
      id: `notification-${notif.id}`,
      type: "notification",
      title: notif.type ?? "Notification",
      description: notif.content ?? "",
      date: notif.createdAt.toISOString(),
      icon: "bell",
    });
  }

  // Sort all items by date descending
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = items.length;
  const paginated = items.slice(offset, offset + limit);

  return { items: paginated, total };
}
