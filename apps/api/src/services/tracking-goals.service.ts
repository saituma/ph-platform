import { and, desc, eq, or, inArray, count } from "drizzle-orm";
import { db } from "../db";
import { athleteTable, teamTable, trackingGoalTable, userTable } from "../db/schema";

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
  // Enforce max 1 active goal per individual athlete
  if (input.scope === "individual" && input.athleteId) {
    const [existing] = await db
      .select({ cnt: count() })
      .from(trackingGoalTable)
      .where(
        and(
          eq(trackingGoalTable.athleteId, input.athleteId),
          eq(trackingGoalTable.status, "active"),
        ),
      );
    if (existing && Number(existing.cnt) > 0) {
      throw new GoalLimitError("This athlete already has an active goal. Archive or delete it first.");
    }
  }

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
      dueDate: input.dueDate ?? null,
      status: "active",
    })
    .returning();
  return goal;
}

export class GoalLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoalLimitError";
  }
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
    .orderBy(desc(trackingGoalTable.createdAt))
    .limit(1);

  return goals;
}
