import request from "supertest";

jest.mock("uuid", () => ({ v4: () => "test-uuid" }));

import { createApp } from "../../src/app";
import { env } from "../../src/config/env";
import { pool } from "../../src/db";

const testUsers = new Map<number, { id: number; role: string; email: string; name: string }>();
let defaultUserId = 0;

jest.mock("../../src/middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    const headerId = req.headers["x-test-user-id"];
    const id = headerId ? Number(headerId) : defaultUserId;
    const fallback = { id, role: "guardian", email: "test@example.com", name: "Test" };
    const stored = testUsers.get(id) ?? fallback;
    const roleHeader = req.headers["x-test-role"];
    req.user = {
      id: stored.id,
      role: roleHeader ? String(roleHeader) : stored.role,
      email: stored.email,
      name: stored.name,
      sub: "sub",
    };
    next();
  },
}));

jest.mock("../../src/middlewares/roles", () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

const hasDatabase = Boolean(env.databaseUrl);
const app = createApp();

function testHeaders(userId: number, role?: string) {
  const headers: Record<string, string> = { "x-test-user-id": String(userId) };
  if (role) headers["x-test-role"] = role;
  return headers;
}

function unique(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function insertUser(role: string) {
  const name = unique(`it-${role}`);
  const email = `${name}@example.com`;
  const cognitoSub = `it-${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const result = await pool.query(
    'insert into "users" ("cognitoSub", "name", "email", "role", "emailVerified") values ($1,$2,$3,$4,$5) returning id',
    [cognitoSub, name, email, role, true],
  );
  const id = result.rows[0].id as number;
  testUsers.set(id, { id, role, email, name });
  return id;
}

async function insertAdultAthlete(userId: number) {
  const result = await pool.query(
    'insert into "athletes" ("userId", "athleteType", "name", "age", "team", "trainingPerWeek") values ($1,$2,$3,$4,$5,$6) returning id',
    [userId, "adult", "Test Adult Athlete", 22, "Test Team", 3],
  );
  return result.rows[0].id as number;
}

describe("integration: tracking goals", () => {
  if (!hasDatabase) {
    it.skip("DATABASE_URL missing", () => {});
    return;
  }

  jest.setTimeout(60000);

  const ctx: {
    adminUserId?: number;
    athleteUserId?: number;
    athleteId?: number;
    goalIds: number[];
  } = { goalIds: [] };

  beforeAll(async () => {
    ctx.adminUserId = await insertUser("admin");
    ctx.athleteUserId = await insertUser("adult_athlete");
    ctx.athleteId = await insertAdultAthlete(ctx.athleteUserId);
    defaultUserId = ctx.adminUserId;
  });

  afterAll(async () => {
    if (ctx.goalIds.length) {
      await pool.query('delete from "tracking_goal_completions" where "goalId" = any($1)', [ctx.goalIds]);
      await pool.query('delete from "tracking_goal_progress_logs" where "goalId" = any($1)', [ctx.goalIds]);
      await pool.query('delete from "tracking_goals" where id = any($1)', [ctx.goalIds]);
    }
    if (ctx.athleteUserId) {
      await pool.query('delete from "run_logs" where "userId" = $1', [ctx.athleteUserId]);
    }
    if (ctx.athleteId) {
      await pool.query('delete from "athletes" where id = $1', [ctx.athleteId]);
    }
    const ids = [ctx.adminUserId, ctx.athleteUserId].filter(Boolean);
    if (ids.length) {
      await pool.query('delete from "users" where id = any($1)', [ids]);
    }
    await pool.end();
  });

  async function createGoal(body: Record<string, unknown>) {
    const res = await request(app)
      .post("/api/admin/tracking-goals")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send(body);
    expect(res.status).toBe(201);
    const goalId = res.body.goal.id as number;
    ctx.goalIds.push(goalId);
    return goalId;
  }

  it("allows creating multiple simultaneous individual goals for the same athlete", async () => {
    const first = await createGoal({
      title: unique("Goal A"),
      unit: "km",
      targetValue: 10,
      scope: "individual",
      athleteId: ctx.athleteId,
      audience: "adult",
    });
    const second = await createGoal({
      title: unique("Goal B"),
      unit: "reps",
      targetValue: 20,
      scope: "individual",
      athleteId: ctx.athleteId,
      audience: "adult",
    });
    expect(first).not.toBe(second);
  });

  it("returns every matching active goal to the athlete, not just the most recent", async () => {
    const res = await request(app).get("/api/tracking/goals").set(testHeaders(ctx.athleteUserId!));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.goals)).toBe(true);
    const returnedIds = res.body.goals.map((g: any) => g.id);
    for (const id of ctx.goalIds) {
      expect(returnedIds).toContain(id);
    }
  });

  it("logs manual progress for a reps goal and reports non-zero percentage server-side", async () => {
    const goalId = await createGoal({
      title: unique("Pushup Goal"),
      unit: "reps",
      targetValue: 20,
      scope: "individual",
      athleteId: ctx.athleteId,
      audience: "adult",
    });

    const logRes = await request(app)
      .post(`/api/tracking/goals/${goalId}/log`)
      .set(testHeaders(ctx.athleteUserId!))
      .send({ value: 5 });
    expect(logRes.status).toBe(200);
    expect(logRes.body.justCompleted).toBe(false);

    const progressRes = await request(app)
      .get(`/api/admin/tracking-goals/${goalId}/progress`)
      .set(testHeaders(ctx.adminUserId!, "admin"));
    expect(progressRes.status).toBe(200);
    expect(progressRes.body.progress[0].percentage).toBeGreaterThan(0);
    expect(progressRes.body.progress[0].completed).toBe(false);
  });

  it("marks a reps goal completed exactly once when the target is crossed", async () => {
    const goalId = await createGoal({
      title: unique("Situp Goal"),
      unit: "reps",
      targetValue: 10,
      scope: "individual",
      athleteId: ctx.athleteId,
      audience: "adult",
    });

    const belowTarget = await request(app)
      .post(`/api/tracking/goals/${goalId}/log`)
      .set(testHeaders(ctx.athleteUserId!))
      .send({ value: 4 });
    expect(belowTarget.body.justCompleted).toBe(false);

    const crossesTarget = await request(app)
      .post(`/api/tracking/goals/${goalId}/log`)
      .set(testHeaders(ctx.athleteUserId!))
      .send({ value: 10 });
    expect(crossesTarget.body.justCompleted).toBe(true);

    const alreadyCompleted = await request(app)
      .post(`/api/tracking/goals/${goalId}/log`)
      .set(testHeaders(ctx.athleteUserId!))
      .send({ value: 1 });
    expect(alreadyCompleted.body.justCompleted).toBe(false);

    const rows = await pool.query('select count(*) from "tracking_goal_completions" where "goalId" = $1', [goalId]);
    expect(Number(rows.rows[0].count)).toBe(1);
  });

  it("detects km-goal completion from a real run sync and does not duplicate on re-sync", async () => {
    const goalId = await createGoal({
      title: unique("Run Goal"),
      unit: "km",
      targetValue: 1,
      scope: "individual",
      athleteId: ctx.athleteId,
      audience: "adult",
    });

    const runPayload = {
      clientId: unique("run"),
      date: new Date().toISOString(),
      distanceMeters: 1500,
      durationSeconds: 600,
    };

    const syncRes = await request(app)
      .post("/api/runs/sync")
      .set(testHeaders(ctx.athleteUserId!))
      .send({ runs: [runPayload] });
    expect(syncRes.status).toBe(200);

    // The completion check runs fire-and-forget after the sync response; give it a tick.
    await new Promise((r) => setTimeout(r, 300));

    const rows = await pool.query(
      'select count(*) from "tracking_goal_completions" where "goalId" = $1 and "athleteId" = $2',
      [goalId, ctx.athleteId],
    );
    expect(Number(rows.rows[0].count)).toBe(1);

    const secondSync = await request(app)
      .post("/api/runs/sync")
      .set(testHeaders(ctx.athleteUserId!))
      .send({ runs: [{ ...runPayload, clientId: unique("run") }] });
    expect(secondSync.status).toBe(200);
    await new Promise((r) => setTimeout(r, 300));

    const rowsAfter = await pool.query(
      'select count(*) from "tracking_goal_completions" where "goalId" = $1 and "athleteId" = $2',
      [goalId, ctx.athleteId],
    );
    expect(Number(rowsAfter.rows[0].count)).toBe(1);
  });

  it("lets admin manually override completion and revert it", async () => {
    const goalId = await createGoal({
      title: unique("Manual Override Goal"),
      unit: "custom",
      customUnit: "laps",
      targetValue: 5,
      scope: "individual",
      athleteId: ctx.athleteId,
      audience: "adult",
    });

    const setCompleted = await request(app)
      .patch(`/api/admin/tracking-goals/${goalId}/athletes/${ctx.athleteId}/completion`)
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ completed: true, completionValue: 5 });
    expect(setCompleted.status).toBe(200);

    const afterSet = await pool.query(
      'select count(*) from "tracking_goal_completions" where "goalId" = $1 and "athleteId" = $2',
      [goalId, ctx.athleteId],
    );
    expect(Number(afterSet.rows[0].count)).toBe(1);

    const unset = await request(app)
      .patch(`/api/admin/tracking-goals/${goalId}/athletes/${ctx.athleteId}/completion`)
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ completed: false });
    expect(unset.status).toBe(200);

    const afterUnset = await pool.query(
      'select count(*) from "tracking_goal_completions" where "goalId" = $1 and "athleteId" = $2',
      [goalId, ctx.athleteId],
    );
    expect(Number(afterUnset.rows[0].count)).toBe(0);
  });
});
