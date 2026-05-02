import { and, desc, eq, or } from "drizzle-orm";
import { db } from "../db";
import { athleteTable, teamTable, trackingGoalTable, userTable } from "../db/schema";

export type CreateGoalInput = {
  coachId: number;
  title: string;
  description?: string;
  unit: "km" | "sec" | "min" | "reps" | "custom";
  customUnit?: string;
  targetValue: number;
  scope: "all" | "individual";
  athleteId?: number;
  audience: "adult" | "premium_team" | "all";
  teamId?: number;
  dueDate?: string;
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
      dueDate: trackingGoalTable.dueDate,
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

  const goalIds = goals.map((g) => g.id);
  if (!goalIds.length) return goals.map((g) => ({ ...g, athleteName: null, teamName: null }));

  const athleteNames = new Map<number, string>();
  const teamNames = new Map<number, string>();

  const athleteGoals = goals.filter((g) => g.athleteId != null);
  if (athleteGoals.length) {
    const athleteIds = [...new Set(athleteGoals.map((g) => g.athleteId!))];
    const rows = await db
      .select({ id: athleteTable.id, name: athleteTable.name })
      .from(athleteTable)
      .where(eq(athleteTable.id, athleteIds[0]));
    for (const r of rows) athleteNames.set(r.id, r.name ?? "");
    if (athleteIds.length > 1) {
      for (const id of athleteIds.slice(1)) {
        const [row] = await db
          .select({ id: athleteTable.id, name: athleteTable.name })
          .from(athleteTable)
          .where(eq(athleteTable.id, id))
          .limit(1);
        if (row) athleteNames.set(row.id, row.name ?? "");
      }
    }
  }

  const teamGoals = goals.filter((g) => g.teamId != null);
  if (teamGoals.length) {
    const teamIds = [...new Set(teamGoals.map((g) => g.teamId!))];
    for (const id of teamIds) {
      const [row] = await db
        .select({ id: teamTable.id, name: teamTable.name })
        .from(teamTable)
        .where(eq(teamTable.id, id))
        .limit(1);
      if (row) teamNames.set(row.id, row.name);
    }
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
      athleteId: input.athleteId ?? null,
      audience: input.audience,
      teamId: input.teamId ?? null,
      dueDate: input.dueDate ?? null,
      status: "active",
    })
    .returning();
  return goal;
}

export async function updateGoal(
  id: number,
  data: Partial<
    Pick<CreateGoalInput, "title" | "description" | "targetValue" | "dueDate"> & { status?: "active" | "archived" }
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

export async function listGoalsForAthlete(input: {
  athleteId: number;
  athleteType: "youth" | "adult";
  teamId: number | null;
}) {
  const { athleteId, athleteType, teamId } = input;

  // audience matching: "all", or type-specific match
  const audienceMatch = or(
    eq(trackingGoalTable.audience, "all"),
    athleteType === "adult" ? eq(trackingGoalTable.audience, "adult") : undefined,
    teamId != null ? eq(trackingGoalTable.audience, "premium_team") : undefined,
  );

  // scope matching: "all" (broadcast) or targeted at this specific athlete
  const scopeMatch = or(
    eq(trackingGoalTable.scope, "all"),
    and(eq(trackingGoalTable.scope, "individual"), eq(trackingGoalTable.athleteId, athleteId)),
  );

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
      dueDate: trackingGoalTable.dueDate,
      status: trackingGoalTable.status,
      createdAt: trackingGoalTable.createdAt,
      coachName: userTable.name,
    })
    .from(trackingGoalTable)
    .innerJoin(userTable, eq(userTable.id, trackingGoalTable.coachId))
    .where(and(eq(trackingGoalTable.status, "active"), audienceMatch, scopeMatch))
    .orderBy(desc(trackingGoalTable.createdAt));

  return goals;
}
