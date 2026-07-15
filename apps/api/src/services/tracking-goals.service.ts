import { and, asc, desc, eq, gte, or, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  athleteTable,
  runLogTable,
  teamTable,
  trackingGoalCompletionTable,
  trackingGoalProgressLogTable,
  trackingGoalTable,
  userTable,
} from "../db/schema";

type RunUnit = "km" | "sec" | "min";
const RUN_UNITS: RunUnit[] = ["km", "sec", "min"];
function isRunUnit(unit: string): unit is RunUnit {
  return (RUN_UNITS as string[]).includes(unit);
}

export function calcPercentage(progressValue: number, targetValue: number): number {
  if (!targetValue || targetValue <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((progressValue / targetValue) * 100)));
}

/** Progress window start: the goal's explicit startDate, falling back to createdAt for older goals set before startDate existed. */
function resolveGoalStart(goal: { startDate: string | null; createdAt: Date }): Date {
  return goal.startDate ? new Date(goal.startDate) : goal.createdAt;
}

export type CreateGoalInput = {
  coachId: number;
  title: string;
  description?: string;
  unit: "km" | "sec" | "min" | "reps" | "custom";
  customUnit?: string;
  targetValue: number;
  scope: "all" | "individual" | "team";
  athleteId?: number;
  audience: "adult" | "premium_team" | "all" | "youth";
  teamId?: number;
  startDate?: string;
  endDate?: string;
};

export async function listGoals(filters?: { status?: string; limit?: number }) {
  const effectiveLimit =
    typeof filters?.limit === "number" && Number.isFinite(filters.limit)
      ? Math.max(1, Math.min(200, Math.floor(filters.limit)))
      : 200;

  const goals = await db
    .select({
      id: trackingGoalTable.id,
      title: trackingGoalTable.title,
      description: trackingGoalTable.description,
      unit: trackingGoalTable.unit,
      customUnit: trackingGoalTable.customUnit,
      targetValue: trackingGoalTable.targetValue,
      scope: trackingGoalTable.scope,
      audience: trackingGoalTable.audience,
      startDate: trackingGoalTable.startDate,
      endDate: trackingGoalTable.endDate,
      status: trackingGoalTable.status,
      createdAt: trackingGoalTable.createdAt,
      athleteId: trackingGoalTable.athleteId,
      teamId: trackingGoalTable.teamId,
      coachId: trackingGoalTable.coachId,
      coachName: userTable.name,
    })
    .from(trackingGoalTable)
    .innerJoin(userTable, eq(userTable.id, trackingGoalTable.coachId))
    .where(filters?.status ? eq(trackingGoalTable.status, filters.status as any) : undefined)
    .orderBy(desc(trackingGoalTable.createdAt))
    .limit(effectiveLimit);

  const athleteNames = new Map<number, string>();
  const teamNames = new Map<number, string>();

  const athleteGoals = goals.filter((g) => g.athleteId != null);
  if (athleteGoals.length) {
    const athleteIds = [...new Set(athleteGoals.map((g) => g.athleteId!))];
    const rows = await db
      .select({ id: athleteTable.id, name: athleteTable.name })
      .from(athleteTable)
      .where(inArray(athleteTable.id, athleteIds));
    for (const r of rows) athleteNames.set(r.id, r.name ?? "");
  }

  const teamGoalIds = [...new Set(goals.filter((g) => g.teamId != null).map((g) => g.teamId!))];
  if (teamGoalIds.length) {
    const rows = await db
      .select({ id: teamTable.id, name: teamTable.name })
      .from(teamTable)
      .where(inArray(teamTable.id, teamGoalIds));
    for (const r of rows) teamNames.set(r.id, r.name);
  }

  return goals.map((g) => ({
    ...g,
    athleteName: g.athleteId ? (athleteNames.get(g.athleteId) ?? null) : null,
    teamName: g.teamId ? (teamNames.get(g.teamId) ?? null) : null,
  }));
}

export async function createGoal(input: CreateGoalInput) {
  const [goal] = await db
    .insert(trackingGoalTable)
    .values({
      coachId: input.coachId,
      title: input.title,
      description: input.description ?? null,
      unit: input.unit,
      customUnit: input.customUnit ?? null,
      targetValue: input.targetValue,
      scope: input.scope,
      athleteId: input.scope === "individual" ? (input.athleteId ?? null) : null,
      audience: input.audience,
      teamId: input.scope === "team" ? (input.teamId ?? null) : null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      status: "active",
    })
    .returning();
  return goal;
}

export async function updateGoal(
  id: number,
  data: Partial<
    Pick<CreateGoalInput, "title" | "description" | "targetValue" | "startDate" | "endDate"> & {
      status?: "active" | "archived";
    }
  >,
) {
  const [goal] = await db
    .update(trackingGoalTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(trackingGoalTable.id, id))
    .returning();
  return goal ?? null;
}

export async function deleteGoal(id: number) {
  const [goal] = await db.delete(trackingGoalTable).where(eq(trackingGoalTable.id, id)).returning();
  return goal ?? null;
}

async function sumRunProgress(unit: RunUnit, userIds: number[], since: Date) {
  const map = new Map<number, { progressValue: number; runCount: number; lastRunDate: string | null }>();
  if (!userIds.length) return map;

  const runAggs = await db
    .select({
      userId: runLogTable.userId,
      totalMeters: sql<number>`coalesce(sum(${runLogTable.distanceMeters}), 0)::float`,
      totalSeconds: sql<number>`coalesce(sum(${runLogTable.durationSeconds}), 0)::float`,
      runCount: sql<number>`count(*)::int`,
      lastRunDate: sql<string | null>`max(${runLogTable.date})`,
    })
    .from(runLogTable)
    .where(and(inArray(runLogTable.userId, userIds), gte(runLogTable.date, since)))
    .groupBy(runLogTable.userId);

  for (const r of runAggs) {
    const progressValue = unit === "km" ? r.totalMeters / 1000 : unit === "sec" ? r.totalSeconds : r.totalSeconds / 60;
    map.set(r.userId, { progressValue, runCount: r.runCount, lastRunDate: r.lastRunDate });
  }
  return map;
}

async function sumManualProgress(goalId: number, athleteIds: number[]) {
  const map = new Map<number, number>();
  if (!athleteIds.length) return map;

  const rows = await db
    .select({
      athleteId: trackingGoalProgressLogTable.athleteId,
      total: sql<number>`coalesce(sum(${trackingGoalProgressLogTable.value}), 0)::float`,
    })
    .from(trackingGoalProgressLogTable)
    .where(
      and(
        eq(trackingGoalProgressLogTable.goalId, goalId),
        inArray(trackingGoalProgressLogTable.athleteId, athleteIds),
      ),
    )
    .groupBy(trackingGoalProgressLogTable.athleteId);

  for (const r of rows) map.set(r.athleteId, r.total);
  return map;
}

async function getCompletionsMap(goalId: number, athleteIds: number[]) {
  const map = new Map<number, Date>();
  if (!athleteIds.length) return map;

  const rows = await db
    .select({ athleteId: trackingGoalCompletionTable.athleteId, completedAt: trackingGoalCompletionTable.completedAt })
    .from(trackingGoalCompletionTable)
    .where(
      and(
        eq(trackingGoalCompletionTable.goalId, goalId),
        inArray(trackingGoalCompletionTable.athleteId, athleteIds),
      ),
    );

  for (const r of rows) map.set(r.athleteId, r.completedAt);
  return map;
}

/**
 * Atomic "did this athlete just cross the target" detector. The unique index on
 * (goalId, athleteId) plus onConflictDoNothing means concurrent callers (e.g. two
 * devices syncing runs at once) can never double-insert — only the caller that
 * actually gets a row back should fire a notification.
 */
export async function recordCompletionIfCrossed(params: {
  goalId: number;
  athleteId: number;
  progressValue: number;
  targetValue: number;
}): Promise<{ justCompleted: boolean; completedAt: Date | null }> {
  if (params.progressValue < params.targetValue) return { justCompleted: false, completedAt: null };

  const [row] = await db
    .insert(trackingGoalCompletionTable)
    .values({ goalId: params.goalId, athleteId: params.athleteId, completionValue: params.progressValue })
    .onConflictDoNothing({ target: [trackingGoalCompletionTable.goalId, trackingGoalCompletionTable.athleteId] })
    .returning();

  return { justCompleted: Boolean(row), completedAt: row?.completedAt ?? null };
}

export function buildAthleteGoalMatchConditions(input: {
  athleteId: number;
  athleteType: "youth" | "adult";
  teamId: number | null;
}) {
  const { athleteId, athleteType, teamId } = input;

  const audienceConditions = [eq(trackingGoalTable.audience, "all")];
  if (athleteType === "adult") audienceConditions.push(eq(trackingGoalTable.audience, "adult"));
  if (athleteType === "youth") audienceConditions.push(eq(trackingGoalTable.audience, "youth"));
  if (teamId != null) audienceConditions.push(eq(trackingGoalTable.audience, "premium_team"));
  const audienceMatch = or(...audienceConditions);

  const scopeConditions = [
    eq(trackingGoalTable.scope, "all"),
    and(eq(trackingGoalTable.scope, "individual"), eq(trackingGoalTable.athleteId, athleteId)),
  ];
  if (teamId != null) {
    scopeConditions.push(and(eq(trackingGoalTable.scope, "team"), eq(trackingGoalTable.teamId, teamId)));
  }
  const scopeMatch = or(...scopeConditions);

  return and(audienceMatch, scopeMatch);
}

export async function getGoalProgress(goalId: number) {
  const [goal] = await db
    .select()
    .from(trackingGoalTable)
    .where(eq(trackingGoalTable.id, goalId));

  if (!goal) return null;

  let athletes: { id: number; name: string; userId: number }[] = [];

  if (goal.scope === "individual" && goal.athleteId) {
    athletes = await db
      .select({ id: athleteTable.id, name: athleteTable.name, userId: athleteTable.userId })
      .from(athleteTable)
      .where(eq(athleteTable.id, goal.athleteId));
  } else if (goal.scope === "team" && goal.teamId) {
    athletes = await db
      .select({ id: athleteTable.id, name: athleteTable.name, userId: athleteTable.userId })
      .from(athleteTable)
      .where(eq(athleteTable.teamId, goal.teamId))
      .orderBy(asc(athleteTable.name))
      .limit(200);
  } else if (goal.scope === "all") {
    const audienceFilter =
      goal.audience === "adult"
        ? eq(athleteTable.athleteType, "adult")
        : goal.audience === "youth"
          ? eq(athleteTable.athleteType, "youth")
          : undefined;
    athletes = await db
      .select({ id: athleteTable.id, name: athleteTable.name, userId: athleteTable.userId })
      .from(athleteTable)
      .where(audienceFilter)
      .orderBy(asc(athleteTable.name))
      .limit(500);
  }

  if (!athletes.length) return { goal, progress: [], completedCount: 0, totalCount: 0 };

  const userIds = athletes.map((a) => a.userId);
  const athleteIds = athletes.map((a) => a.id);
  const since = resolveGoalStart(goal);

  const runMap = isRunUnit(goal.unit) ? await sumRunProgress(goal.unit, userIds, since) : null;
  const manualMap = !isRunUnit(goal.unit) ? await sumManualProgress(goal.id, athleteIds) : null;
  const completedMap = await getCompletionsMap(goal.id, athleteIds);

  const progress = athletes.map((a) => {
    const run = runMap?.get(a.userId);
    const progressValue = run ? run.progressValue : (manualMap?.get(a.id) ?? 0);
    const completedAt = completedMap.get(a.id) ?? null;
    return {
      athleteId: a.id,
      athleteName: a.name,
      userId: a.userId,
      progressValue,
      runCount: run?.runCount ?? 0,
      lastRunDate: run?.lastRunDate ?? null,
      percentage: calcPercentage(progressValue, goal.targetValue),
      completed: completedAt != null,
      completedAt,
    };
  });

  return { goal, progress, completedCount: completedMap.size, totalCount: athletes.length };
}

export async function setGoalCompletionManually(
  goalId: number,
  athleteId: number,
  completed: boolean,
  completionValue?: number,
) {
  if (completed) {
    await db
      .insert(trackingGoalCompletionTable)
      .values({ goalId, athleteId, completionValue: completionValue ?? 0, source: "manual" })
      .onConflictDoUpdate({
        target: [trackingGoalCompletionTable.goalId, trackingGoalCompletionTable.athleteId],
        set: { completedAt: new Date(), source: "manual", completionValue: completionValue ?? 0 },
      });
  } else {
    await db
      .delete(trackingGoalCompletionTable)
      .where(and(eq(trackingGoalCompletionTable.goalId, goalId), eq(trackingGoalCompletionTable.athleteId, athleteId)));
  }
}

export async function expireOverdueGoals() {
  const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const expired = await db
    .update(trackingGoalTable)
    .set({ status: "archived", updatedAt: new Date() })
    .where(
      and(
        eq(trackingGoalTable.status, "active"),
        sql`${trackingGoalTable.endDate} IS NOT NULL AND ${trackingGoalTable.endDate} < ${now}::date`,
      ),
    )
    .returning({ id: trackingGoalTable.id });
  return { expiredCount: expired.length };
}

export async function listGoalsForAthlete(input: {
  athleteId: number;
  athleteType: "youth" | "adult";
  teamId: number | null;
}) {
  const { athleteId } = input;
  const matchCondition = buildAthleteGoalMatchConditions(input);

  const goals = await db
    .select({
      id: trackingGoalTable.id,
      title: trackingGoalTable.title,
      description: trackingGoalTable.description,
      unit: trackingGoalTable.unit,
      customUnit: trackingGoalTable.customUnit,
      targetValue: trackingGoalTable.targetValue,
      scope: trackingGoalTable.scope,
      audience: trackingGoalTable.audience,
      startDate: trackingGoalTable.startDate,
      endDate: trackingGoalTable.endDate,
      status: trackingGoalTable.status,
      createdAt: trackingGoalTable.createdAt,
      coachName: userTable.name,
    })
    .from(trackingGoalTable)
    .innerJoin(userTable, eq(userTable.id, trackingGoalTable.coachId))
    .where(and(eq(trackingGoalTable.status, "active"), matchCondition))
    .orderBy(desc(trackingGoalTable.createdAt));

  if (!goals.length) return [];

  const [athleteRow] = await db.select({ userId: athleteTable.userId }).from(athleteTable).where(eq(athleteTable.id, athleteId));
  const userId = athleteRow?.userId;

  const completions = await db
    .select({ goalId: trackingGoalCompletionTable.goalId, completedAt: trackingGoalCompletionTable.completedAt })
    .from(trackingGoalCompletionTable)
    .where(
      and(
        inArray(
          trackingGoalCompletionTable.goalId,
          goals.map((g) => g.id),
        ),
        eq(trackingGoalCompletionTable.athleteId, athleteId),
      ),
    );
  const completedByGoalId = new Map(completions.map((c) => [c.goalId, c.completedAt]));

  const progressByGoalId = new Map<number, number>();
  for (const g of goals) {
    if (isRunUnit(g.unit) && userId != null) {
      const map = await sumRunProgress(g.unit, [userId], resolveGoalStart(g));
      progressByGoalId.set(g.id, map.get(userId)?.progressValue ?? 0);
    } else if (!isRunUnit(g.unit)) {
      const map = await sumManualProgress(g.id, [athleteId]);
      progressByGoalId.set(g.id, map.get(athleteId) ?? 0);
    }
  }

  return goals.map((g) => {
    const progressValue = progressByGoalId.get(g.id) ?? 0;
    const completedAt = completedByGoalId.get(g.id) ?? null;
    return {
      ...g,
      progressValue,
      percentage: calcPercentage(progressValue, g.targetValue),
      completed: completedAt != null,
      completedAt,
    };
  });
}

export async function checkRunGoalCompletionsForAthlete(input: {
  userId: number;
  athleteId: number;
  athleteType: "youth" | "adult";
  teamId: number | null;
}): Promise<Array<{ goalId: number; title: string }>> {
  const matchCondition = buildAthleteGoalMatchConditions(input);

  const goals = await db
    .select({
      id: trackingGoalTable.id,
      title: trackingGoalTable.title,
      unit: trackingGoalTable.unit,
      targetValue: trackingGoalTable.targetValue,
      startDate: trackingGoalTable.startDate,
      createdAt: trackingGoalTable.createdAt,
    })
    .from(trackingGoalTable)
    .where(and(eq(trackingGoalTable.status, "active"), matchCondition, inArray(trackingGoalTable.unit, RUN_UNITS)));

  const justCompleted: Array<{ goalId: number; title: string }> = [];
  for (const g of goals) {
    if (!isRunUnit(g.unit)) continue;
    const map = await sumRunProgress(g.unit, [input.userId], resolveGoalStart(g));
    const progressValue = map.get(input.userId)?.progressValue ?? 0;
    const result = await recordCompletionIfCrossed({
      goalId: g.id,
      athleteId: input.athleteId,
      progressValue,
      targetValue: g.targetValue,
    });
    if (result.justCompleted) justCompleted.push({ goalId: g.id, title: g.title });
  }
  return justCompleted;
}

export async function logManualProgress(input: {
  goalId: number;
  athleteId: number;
  athleteType: "youth" | "adult";
  teamId: number | null;
  value: number;
  note?: string;
}) {
  const [goal] = await db.select().from(trackingGoalTable).where(eq(trackingGoalTable.id, input.goalId));
  if (!goal || goal.status !== "active") return null;
  if (goal.unit !== "reps" && goal.unit !== "custom") return null;

  const matchCondition = buildAthleteGoalMatchConditions({
    athleteId: input.athleteId,
    athleteType: input.athleteType,
    teamId: input.teamId,
  });
  const [authorized] = await db
    .select({ id: trackingGoalTable.id })
    .from(trackingGoalTable)
    .where(and(eq(trackingGoalTable.id, input.goalId), matchCondition));
  if (!authorized) return null;

  await db.insert(trackingGoalProgressLogTable).values({
    goalId: input.goalId,
    athleteId: input.athleteId,
    value: input.value,
    note: input.note ?? null,
  });

  const totals = await sumManualProgress(input.goalId, [input.athleteId]);
  const totalValue = totals.get(input.athleteId) ?? 0;

  const { justCompleted, completedAt } = await recordCompletionIfCrossed({
    goalId: input.goalId,
    athleteId: input.athleteId,
    progressValue: totalValue,
    targetValue: goal.targetValue,
  });

  return {
    goal,
    totalValue,
    percentage: calcPercentage(totalValue, goal.targetValue),
    justCompleted,
    completedAt,
  };
}
