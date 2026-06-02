import request from "supertest";

// ── Module-level compatibility mocks (must precede app import) ────────────────
jest.mock("uuid", () => ({ v4: () => "test-uuid-v4", v1: () => "test-uuid-v1" }));

// Header-driven auth: x-test-user-id / x-test-role select the acting user + role.
// requireRole is intentionally NOT mocked so role gating (403s) runs for real.
const testUsers = new Map<number, { id: number; role: string; email: string; name: string }>();
jest.mock("../../src/middlewares/auth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const headerId = req.headers["x-test-user-id"];
    const id = headerId ? Number(headerId) : 0;
    const stored = testUsers.get(id);
    if (!id || !stored) return res.status(401).json({ error: "no test user" });
    const roleHeader = req.headers["x-test-role"];
    req.user = { id: stored.id, role: roleHeader ? String(roleHeader) : stored.role, email: stored.email, name: stored.name, sub: "sub" };
    next();
  },
}));

jest.mock("../../src/middlewares/feature", () => ({
  requireFeature: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../../src/services/billing/stripe.service", () => ({
  getStripeClient: jest.fn(() => ({
    prices: { list: jest.fn(async () => ({ data: [{ id: "price_mock", unit_amount: 5000 }] })), retrieve: jest.fn(async () => ({ id: "price_mock", unit_amount: 5000 })) },
    checkout: { sessions: { create: jest.fn(async () => ({ id: "cs_mock", url: "https://stripe.test/team" })), retrieve: jest.fn(async () => ({ id: "cs_mock", payment_status: "paid", metadata: {} })) } },
    customers: { list: jest.fn(async () => ({ data: [] })) },
    billingPortal: { sessions: { create: jest.fn(async () => ({ url: "https://stripe.test/portal" })) } },
  })),
  createTeamCheckoutSession: jest.fn(async () => ({ id: "cs_team_mock", url: "https://stripe.test/team" })),
  resolveTierFallbackPrice: jest.fn(() => "price_mock"),
  ensureStripePriceId: jest.fn((plan: any) => plan?.stripePriceId ?? "price_mock"),
  getSuccessUrl: jest.fn(() => "http://localhost:3000/stripe/success"),
  getCancelUrl: jest.fn(() => "http://localhost:3000/stripe/cancel"),
  checkoutModeForBillingCycle: jest.fn(() => "subscription"),
}));

jest.mock("../../src/lib/mailer/billing.mailer", () => ({
  sendPlanInviteEmail: jest.fn(async () => ({ ok: true })),
  sendTeamPlayerPaymentInviteEmail: jest.fn(async () => ({ ok: true })),
}));
jest.mock("../../src/lib/mailer/auth.mailer", () => ({
  sendAdminWelcomeCredentialsEmail: jest.fn(async () => ({ ok: true })),
}));

jest.mock("../../src/lib/cache", () => ({
  cache: { getOrSet: jest.fn(async (_k: any, _t: any, fn: () => any) => fn()), del: jest.fn(), get: jest.fn(async () => null), set: jest.fn() },
  cacheKeys: new Proxy({}, { get: () => () => "k" }),
}));

import { eq, inArray } from "drizzle-orm";
import { createApp } from "../../src/app";
import { env } from "../../src/config/env";
import { db, pool } from "../../src/db";
import {
  athleteTable,
  chatGroupMemberTable,
  chatGroupTable,
  legalAcceptanceTable,
  subscriptionPlanTable,
  teamManagersTable,
  teamTable,
  userTable,
} from "../../src/db/schema";

const hasDatabase = Boolean(env.databaseUrl);
const app = createApp();

const planIds: number[] = [];
const teamIds: number[] = [];
const teamNames: string[] = [];
const userIds = new Set<number>();

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
function headers(userId: number, role?: string) {
  const h: Record<string, string> = { "x-test-user-id": String(userId) };
  if (role) h["x-test-role"] = role;
  return h;
}
async function insertUser(role: string) {
  const name = uniq(`it-${role}`);
  const email = `${name}@example.com`;
  const [row] = await db
    .insert(userTable)
    .values({ cognitoSub: uniq("sub"), name, email, role: role as any, emailVerified: true })
    .returning({ id: userTable.id });
  testUsers.set(row.id, { id: row.id, role, email, name });
  userIds.add(row.id);
  return row.id;
}
/** Register a user created via the API (e.g. a co-manager) so the auth mock can act as them. */
async function registerExistingUser(userId: number, role: string) {
  const [u] = await db.select({ email: userTable.email, name: userTable.name }).from(userTable).where(eq(userTable.id, userId)).limit(1);
  testUsers.set(userId, { id: userId, role, email: u?.email ?? "x@x.com", name: u?.name ?? "x" });
  userIds.add(userId);
}
async function createActivePlan() {
  const [row] = await db
    .insert(subscriptionPlanTable)
    .values({ name: uniq("plan-PHP"), tier: "PHP", stripePriceId: "price_mock", displayPrice: "£50", billingInterval: "monthly", monthlyPrice: "£50", yearlyPrice: "£500", isActive: true })
    .returning({ id: subscriptionPlanTable.id });
  planIds.push(row.id);
  return row.id;
}

describe("integration: team co-managers (real DB, mocked Stripe)", () => {
  if (!hasDatabase) {
    it.skip("DATABASE_URL missing — skipping co-manager integration suite", () => {});
    return;
  }
  jest.setTimeout(60000);

  let adminId: number;
  let primaryId: number;
  let teamId: number;
  let teamName: string;

  beforeAll(async () => {
    adminId = await insertUser("admin");
    await createActivePlan();
    // Primary team coach owns the team (becomes adminId).
    primaryId = await insertUser("team_coach");
    teamName = uniq("CoMgrTeam");
    const res = await request(app)
      .post("/api/admin/teams")
      .set(headers(primaryId, "team_coach"))
      .send({ teamName, tier: "PHP", maxAthletes: 10, athleteType: "youth", minAge: 8, maxAge: 16, paymentMode: "coach_pays_all" });
    expect(res.status).toBe(201);
    teamId = res.body.teamId;
    teamName = res.body.team;
    teamIds.push(teamId);
    teamNames.push(teamName);
  });

  afterAll(async () => {
    for (const tId of teamIds) {
      const ath = await db
        .select({ id: athleteTable.id, userId: athleteTable.userId })
        .from(athleteTable)
        .where(eq(athleteTable.teamId, tId))
        .catch(() => [] as { id: number; userId: number }[]);
      const aIds = ath.map((a) => a.id);
      const aUserIds = ath.map((a) => a.userId);
      if (aIds.length) await db.delete(legalAcceptanceTable).where(inArray(legalAcceptanceTable.athleteId, aIds)).catch(() => {});
      await db.delete(athleteTable).where(eq(athleteTable.teamId, tId)).catch(() => {});
      if (aUserIds.length) await db.delete(userTable).where(inArray(userTable.id, aUserIds)).catch(() => {});
      await db.delete(teamManagersTable).where(eq(teamManagersTable.teamId, tId)).catch(() => {});
    }
    if (teamNames.length) {
      const groups = await db.select({ id: chatGroupTable.id }).from(chatGroupTable).where(inArray(chatGroupTable.name, teamNames)).catch(() => []);
      const gIds = groups.map((g: { id: number }) => g.id);
      if (gIds.length) {
        await db.delete(chatGroupMemberTable).where(inArray(chatGroupMemberTable.groupId, gIds)).catch(() => {});
        await db.delete(chatGroupTable).where(inArray(chatGroupTable.id, gIds)).catch(() => {});
      }
    }
    if (teamIds.length) await db.delete(teamTable).where(inArray(teamTable.id, teamIds)).catch(() => {});
    if (planIds.length) await db.delete(subscriptionPlanTable).where(inArray(subscriptionPlanTable.id, planIds)).catch(() => {});
    if (userIds.size) await db.delete(userTable).where(inArray(userTable.id, [...userIds])).catch(() => {});
    await pool.end();
  });

  let coManagerId: number;
  const coManagerEmail = `${uniq("comgr")}@example.com`;

  it("primary adds a co-manager → creates a team_coach user + temp password + team_managers row", async () => {
    const res = await request(app)
      .post("/api/team/managers")
      .query({ teamId })
      .set(headers(primaryId, "team_coach"))
      .send({ email: coManagerEmail, name: "Co Manager" });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
    expect(typeof res.body.temporaryPassword).toBe("string");
    expect(res.body.userId).toBeTruthy();
    coManagerId = res.body.userId;
    await registerExistingUser(coManagerId, "team_coach");

    const [u] = await db.select({ role: userTable.role }).from(userTable).where(eq(userTable.id, coManagerId)).limit(1);
    expect(u?.role).toBe("team_coach");
    const rows = await db.select().from(teamManagersTable).where(eq(teamManagersTable.teamId, teamId));
    expect(rows.some((r) => r.userId === coManagerId)).toBe(true);
  });

  it("adding the same email again is idempotent (created=false, no duplicate row)", async () => {
    const res = await request(app).post("/api/team/managers").query({ teamId }).set(headers(primaryId, "team_coach")).send({ email: coManagerEmail });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(false);
    const rows = await db.select().from(teamManagersTable).where(eq(teamManagersTable.teamId, teamId));
    expect(rows.filter((r) => r.userId === coManagerId)).toHaveLength(1);
  });

  it("rejects adding the primary owner as a co-manager", async () => {
    const [primary] = await db.select({ email: userTable.email }).from(userTable).where(eq(userTable.id, primaryId)).limit(1);
    const res = await request(app).post("/api/team/managers").query({ teamId }).set(headers(primaryId, "team_coach")).send({ email: primary.email });
    expect(res.status).toBe(409);
  });

  it("co-manager is added to the team group chat", async () => {
    const [group] = await db.select({ id: chatGroupTable.id }).from(chatGroupTable).where(eq(chatGroupTable.name, teamName)).limit(1);
    expect(group?.id).toBeTruthy();
    const members = await db.select().from(chatGroupMemberTable).where(eq(chatGroupMemberTable.groupId, group.id));
    expect(members.some((m) => m.userId === coManagerId)).toBe(true);
  });

  it("GET /team/managers lists primary + co-manager and flags isPrimary", async () => {
    const asPrimary = await request(app).get("/api/team/managers").query({ teamId }).set(headers(primaryId, "team_coach"));
    expect(asPrimary.status).toBe(200);
    expect(asPrimary.body.isPrimary).toBe(true);
    expect(asPrimary.body.primary?.userId).toBe(primaryId);
    expect(asPrimary.body.coManagers.some((m: any) => m.userId === coManagerId)).toBe(true);

    const asCo = await request(app).get("/api/team/managers").query({ teamId }).set(headers(coManagerId, "team_coach"));
    expect(asCo.status).toBe(200);
    expect(asCo.body.isPrimary).toBe(false);
  });

  it("co-manager can read the team roster", async () => {
    const res = await request(app).get("/api/team/roster").query({ teamId }).set(headers(coManagerId, "team_coach"));
    expect(res.status).toBe(200);
    expect(res.body.team?.id).toBe(teamId);
  });

  it("co-manager CANNOT add another co-manager (primary-only)", async () => {
    const res = await request(app).post("/api/team/managers").query({ teamId }).set(headers(coManagerId, "team_coach")).send({ email: `${uniq("x")}@example.com` });
    expect(res.status).toBe(403);
  });

  it("co-manager CANNOT delete the team (billing/destructive stays primary-only)", async () => {
    const res = await request(app)
      .delete(`/api/admin/teams/${teamId}`)
      .set(headers(coManagerId, "team_coach"))
      .set("Content-Type", "application/json");
    expect(res.status).toBe(403);
    const [team] = await db.select({ id: teamTable.id }).from(teamTable).where(eq(teamTable.id, teamId)).limit(1);
    expect(team?.id).toBe(teamId); // still exists
  });

  it("a team athlete sees BOTH managers as DM contacts in their inbox", async () => {
    const created = await request(app)
      .post("/api/team/roster/athletes")
      .set(headers(adminId, "admin"))
      .send({ teamId, username: uniq("ath").slice(0, 30), name: "DM Athlete", age: 14 });
    expect(created.status).toBe(201);
    const athleteUserId = created.body.userId;
    await registerExistingUser(athleteUserId, "team_athlete");

    const inbox = await request(app).get("/api/messages/inbox").set(headers(athleteUserId, "team_athlete"));
    expect(inbox.status).toBe(200);
    const peerIds = (inbox.body.threads ?? []).filter((t: any) => t.type === "direct").map((t: any) => t.peerUserId);
    expect(peerIds).toContain(primaryId);
    expect(peerIds).toContain(coManagerId);
  });

  it("team path: primary removes a co-manager via DELETE /team/managers/:userId", async () => {
    const email = `${uniq("comgr2")}@example.com`;
    const add = await request(app).post("/api/team/managers").query({ teamId }).set(headers(primaryId, "team_coach")).send({ email });
    expect(add.status).toBe(201);
    const id = add.body.userId;
    userIds.add(id);

    const del = await request(app)
      .delete(`/api/team/managers/${id}`)
      .query({ teamId })
      .set(headers(primaryId, "team_coach"))
      .set("Content-Type", "application/json");
    expect(del.status).toBe(200);
    expect(del.body.removed).toBe(true);
    const rows = await db.select().from(teamManagersTable).where(eq(teamManagersTable.teamId, teamId));
    expect(rows.some((r) => r.userId === id)).toBe(false);
  });

  it("admin path: remove co-manager, then it no longer appears", async () => {
    const del = await request(app)
      .delete(`/api/admin/teams/${encodeURIComponent(teamName)}/managers/${coManagerId}`)
      .set(headers(adminId, "admin"))
      .set("Content-Type", "application/json");
    expect(del.status).toBe(200);
    expect(del.body.removed).toBe(true);
    const rows = await db.select().from(teamManagersTable).where(eq(teamManagersTable.teamId, teamId));
    expect(rows.some((r) => r.userId === coManagerId)).toBe(false);
  });
});
