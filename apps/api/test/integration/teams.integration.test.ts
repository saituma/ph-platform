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

// social_feed feature gate → passthrough (membership is still enforced in the service).
jest.mock("../../src/middlewares/feature", () => ({
  requireFeature: () => (_req: any, _res: any, next: any) => next(),
}));

// Stripe: never hit the network. Covers both the team-checkout helper and the raw
// client used by the per-player invite flow (prices.list/retrieve, sessions.create).
jest.mock("../../src/services/billing/stripe.service", () => ({
  getStripeClient: jest.fn(() => ({
    prices: {
      list: jest.fn(async () => ({ data: [{ id: "price_mock", unit_amount: 5000 }] })),
      retrieve: jest.fn(async () => ({ id: "price_mock", unit_amount: 5000 })),
    },
    checkout: {
      sessions: {
        create: jest.fn(async () => ({ id: "cs_player_mock", url: "https://stripe.test/player" })),
        retrieve: jest.fn(async () => ({ id: "cs_mock", payment_status: "paid", metadata: {} })),
      },
    },
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

// Emails: no-op so team creation / invites never send.
jest.mock("../../src/lib/mailer/billing.mailer", () => ({
  sendPlanInviteEmail: jest.fn(async () => ({ ok: true })),
  sendTeamPlayerPaymentInviteEmail: jest.fn(async () => ({ ok: true })),
}));
jest.mock("../../src/lib/mailer/auth.mailer", () => ({
  sendAdminWelcomeCredentialsEmail: jest.fn(async () => ({ ok: true })),
}));

// Keep real approve/reject logic, but stub the Stripe-reconciliation helpers the
// admin list endpoints call so invite/request state stays deterministic in tests.
jest.mock("../../src/services/billing/team-request.service", () => {
  const actual = jest.requireActual("../../src/services/billing/team-request.service");
  return {
    ...actual,
    syncTeamSubscriptionRequestPaymentFromStripe: jest.fn(async () => null),
    syncTeamPlayerInvitePaymentsFromStripe: jest.fn(async () => null),
  };
});

// Avoid Redis in tests.
jest.mock("../../src/lib/cache", () => ({
  cache: {
    getOrSet: jest.fn(async (_k: any, _t: any, fn: () => any) => fn()),
    del: jest.fn(),
    get: jest.fn(async () => null),
    set: jest.fn(),
  },
  cacheKeys: new Proxy({}, { get: () => () => "k" }),
}));

import { and, eq, inArray } from "drizzle-orm";
import { createApp } from "../../src/app";
import { env } from "../../src/config/env";
import { db, pool } from "../../src/db";
import {
  athleteTable,
  chatGroupMemberTable,
  chatGroupTable,
  legalAcceptanceTable,
  subscriptionPlanTable,
  teamPaymentConfigDraftTable,
  teamPlayerPaymentInviteTable,
  teamSubscriptionRequestTable,
  teamTable,
  userTable,
} from "../../src/db/schema";

const hasDatabase = Boolean(env.databaseUrl);
const app = createApp();

const STRONG_PW = "TeamPass9!"; // 10 chars: upper, lower, digit, symbol
const MANAGER_PW = "ManagerPass1!";

// Tracked for cleanup.
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
  const id = row.id;
  testUsers.set(id, { id, role, email, name });
  userIds.add(id);
  return id;
}

async function createActivePlan(tier: "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro") {
  const [row] = await db
    .insert(subscriptionPlanTable)
    .values({
      name: uniq(`plan-${tier}`),
      tier,
      stripePriceId: "price_mock",
      displayPrice: "£50",
      billingInterval: "monthly",
      monthlyPrice: "£50",
      yearlyPrice: "£500",
      isActive: true,
    })
    .returning({ id: subscriptionPlanTable.id });
  planIds.push(row.id);
  return row.id;
}

/**
 * Create a team through the real admin API. The acting user becomes the team's
 * adminId (no manager credentials path), so roster calls can be made as that
 * same user with role "coach".
 */
async function createTeamAs(
  actingUserId: number,
  body: Record<string, unknown>,
): Promise<{ status: number; teamId: number; teamName: string; res: request.Response }> {
  const teamName = (body.teamName as string) ?? uniq("Team");
  const res = await request(app)
    .post("/api/admin/teams")
    .set(headers(actingUserId, "admin"))
    .send({ teamName, tier: "PHP", maxAthletes: 10, ...body });
  if (res.status === 201) {
    teamIds.push(res.body.teamId);
    teamNames.push(res.body.team);
  }
  return { status: res.status, teamId: res.body?.teamId, teamName: res.body?.team ?? teamName, res };
}

// Uses the admin role so the team is resolved by the `teamId` body param (a "coach"
// resolves to their single owned team and would ignore teamId — wrong when the
// acting user owns several teams).
async function addRosterAthlete(actingUserId: number, teamId: number, over: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/api/team/roster/athletes")
    .set(headers(actingUserId, "admin"))
    .send({ teamId, username: uniq("ath").slice(0, 30), name: "Roster Athlete", age: 14, ...over });
  return res;
}

describe("integration: teams & team signing (real DB, mocked Stripe)", () => {
  if (!hasDatabase) {
    it.skip("DATABASE_URL missing — skipping team integration suite", () => {});
    return;
  }
  jest.setTimeout(60000);

  let adminId: number;
  let phpPlanId: number;

  beforeAll(async () => {
    adminId = await insertUser("admin");
    phpPlanId = await createActivePlan("PHP");
  });

  afterAll(async () => {
    for (const teamId of teamIds) {
      try {
        const ath = await db
          .select({ id: athleteTable.id, userId: athleteTable.userId })
          .from(athleteTable)
          .where(eq(athleteTable.teamId, teamId));
        const athleteIds = ath.map((a) => a.id);
        const athleteUserIds = ath.map((a) => a.userId);
        if (athleteIds.length) {
          await db.delete(legalAcceptanceTable).where(inArray(legalAcceptanceTable.athleteId, athleteIds)).catch(() => {});
        }
        await db.delete(athleteTable).where(eq(athleteTable.teamId, teamId)).catch(() => {});
        if (athleteUserIds.length) {
          await db.delete(userTable).where(inArray(userTable.id, athleteUserIds)).catch(() => {});
        }
        await db.delete(teamPlayerPaymentInviteTable).where(eq(teamPlayerPaymentInviteTable.teamId, teamId)).catch(() => {});
        await db.delete(teamSubscriptionRequestTable).where(eq(teamSubscriptionRequestTable.teamId, teamId)).catch(() => {});
        await db.delete(teamPaymentConfigDraftTable).where(eq(teamPaymentConfigDraftTable.teamId, teamId)).catch(() => {});
      } catch {
        /* best effort */
      }
    }
    if (teamNames.length) {
      const groups = await db.select({ id: chatGroupTable.id }).from(chatGroupTable).where(inArray(chatGroupTable.name, teamNames)).catch(() => []);
      const groupIds = groups.map((g: { id: number }) => g.id);
      if (groupIds.length) {
        await db.delete(chatGroupMemberTable).where(inArray(chatGroupMemberTable.groupId, groupIds)).catch(() => {});
        await db.delete(chatGroupTable).where(inArray(chatGroupTable.id, groupIds)).catch(() => {});
      }
    }
    if (teamIds.length) await db.delete(teamTable).where(inArray(teamTable.id, teamIds)).catch(() => {});
    if (planIds.length) await db.delete(subscriptionPlanTable).where(inArray(subscriptionPlanTable.id, planIds)).catch(() => {});
    if (userIds.size) await db.delete(userTable).where(inArray(userTable.id, [...userIds])).catch(() => {});
    await pool.end();
  });

  // ── 1. Team CRUD & signing ────────────────────────────────────────────────
  describe("team CRUD & signing", () => {
    it("creates a youth team (coach_pays_all, pay_now) with a checkout URL and chat group", async () => {
      const teamName = uniq("Youth");
      const { status, teamId, res } = await createTeamAs(adminId, {
        teamName,
        athleteType: "youth",
        minAge: 8,
        maxAge: 16,
        tier: "PHP",
        maxAthletes: 12,
        paymentMode: "coach_pays_all",
      });
      expect(status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.checkoutUrl).toBe("https://stripe.test/team");
      expect(res.body.invitesSent).toBe(0);

      const [team] = await db.select().from(teamTable).where(eq(teamTable.id, teamId)).limit(1);
      expect(team.athleteType).toBe("youth");
      expect(team.minAge).toBe(8);
      // The DB may already hold active PHP plans; the service picks the first active
      // plan for the tier, so just assert a plan was linked.
      expect(team.planId).toBeTruthy();

      const [group] = await db
        .select({ id: chatGroupTable.id })
        .from(chatGroupTable)
        .where(and(eq(chatGroupTable.name, teamName), eq(chatGroupTable.category, "team")))
        .limit(1);
      expect(group?.id).toBeTruthy();
    });

    it("creates a team with manager credentials → new team_coach user becomes adminId", async () => {
      const managerEmail = `${uniq("mgr")}@example.com`;
      const teamName = uniq("WithMgr");
      const { status, teamId } = await createTeamAs(adminId, {
        teamName,
        managerEmail,
        managerPassword: MANAGER_PW,
        managerName: "Coach Carter",
      });
      expect(status).toBe(201);
      const [team] = await db.select({ adminId: teamTable.adminId }).from(teamTable).where(eq(teamTable.id, teamId)).limit(1);
      const [mgr] = await db.select({ id: userTable.id, role: userTable.role }).from(userTable).where(eq(userTable.email, managerEmail)).limit(1);
      expect(mgr?.id).toBe(team.adminId);
      expect(mgr?.role).toBe("team_coach");
      if (mgr?.id) userIds.add(mgr.id);
    });

    it("per_player_all creates a subscription request + one pending invite per payer", async () => {
      const teamName = uniq("PerPlayer");
      const players = [
        { name: "Alpha", email: `${uniq("a")}@ex.com` },
        { name: "Bravo", email: `${uniq("b")}@ex.com` },
      ];
      const { status, teamId, res } = await createTeamAs(adminId, {
        teamName,
        paymentMode: "per_player_all",
        playerPayers: players,
      });
      expect(status).toBe(201);
      expect(res.body.invitesSent).toBe(2);

      const [reqRow] = await db
        .select()
        .from(teamSubscriptionRequestTable)
        .where(eq(teamSubscriptionRequestTable.teamId, teamId))
        .limit(1);
      expect(reqRow.paymentMode).toBe("per_player_all");
      expect(reqRow.status).toBe("pending_approval");

      const invites = await db
        .select()
        .from(teamPlayerPaymentInviteTable)
        .where(eq(teamPlayerPaymentInviteTable.requestId, reqRow.id));
      expect(invites).toHaveLength(2);
      expect(invites.every((i) => i.status === "pending")).toBe(true);
    });

    it("per_player_selected only invites the selected payers", async () => {
      const teamName = uniq("Selected");
      const { status, teamId, res } = await createTeamAs(adminId, {
        teamName,
        paymentMode: "per_player_selected",
        coachPaysSeats: 1,
        playerPayers: [
          { name: "Sel", email: `${uniq("s")}@ex.com`, selected: true },
          { name: "Unsel", email: `${uniq("u")}@ex.com`, selected: false },
        ],
      });
      expect(status).toBe(201);
      expect(res.body.invitesSent).toBe(1);
      const [reqRow] = await db
        .select({ id: teamSubscriptionRequestTable.id, coachPaysSeats: teamSubscriptionRequestTable.coachPaysSeats })
        .from(teamSubscriptionRequestTable)
        .where(eq(teamSubscriptionRequestTable.teamId, teamId))
        .limit(1);
      expect(reqRow.coachPaysSeats).toBe(1);
    });

    it("cash payment activates the team immediately", async () => {
      const { status, teamId } = await createTeamAs(adminId, { teamName: uniq("Cash"), paymentMethod: "cash" });
      expect(status).toBe(201);
      const [team] = await db.select({ s: teamTable.subscriptionStatus }).from(teamTable).where(eq(teamTable.id, teamId)).limit(1);
      expect(team.s).toBe("active");
    });

    it("rejects a duplicate team name (409)", async () => {
      const teamName = uniq("Dupe");
      const first = await createTeamAs(adminId, { teamName });
      expect(first.status).toBe(201);
      const second = await createTeamAs(adminId, { teamName });
      expect(second.status).toBe(409);
    });

    it("rejects a tier with no active plan (400)", async () => {
      const activeTiers = await db
        .select({ tier: subscriptionPlanTable.tier })
        .from(subscriptionPlanTable)
        .where(eq(subscriptionPlanTable.isActive, true));
      const present = new Set(activeTiers.map((r) => r.tier));
      const missing = (["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"] as const).find((t) => !present.has(t));
      if (!missing) {
        console.warn("[teams.it] every tier has an active plan on this DB; skipping no-plan negative case");
        return;
      }
      const { status } = await createTeamAs(adminId, { teamName: uniq("NoPlan"), tier: missing });
      expect(status).toBe(400);
    });

    it("rejects an invalid body (400)", async () => {
      const res = await request(app)
        .post("/api/admin/teams")
        .set(headers(adminId, "admin"))
        .send({ teamName: "x", tier: "PHP" }); // missing maxAthletes
      expect(res.status).toBe(400);
    });

    it("blocks non-staff roles from admin team routes (403)", async () => {
      const res = await request(app).post("/api/admin/teams").set(headers(adminId, "athlete")).send({ teamName: uniq("X"), tier: "PHP", maxAthletes: 5 });
      expect(res.status).toBe(403);
    });

    it("lists teams and fetches team detail", async () => {
      const teamName = uniq("Listable");
      await createTeamAs(adminId, { teamName });
      const list = await request(app).get("/api/admin/teams").set(headers(adminId, "admin"));
      expect(list.status).toBe(200);
      expect(Array.isArray(list.body.teams)).toBe(true);
      expect(list.body.teams.some((t: any) => t.team === teamName)).toBe(true);

      const detail = await request(app).get(`/api/admin/teams/${encodeURIComponent(teamName)}`).set(headers(adminId, "admin"));
      expect(detail.status).toBe(200);
      expect(detail.body.team).toBe(teamName);
      expect(Array.isArray(detail.body.members)).toBe(true);
    });

    it("deletes a team and detaches (not deletes) its athletes", async () => {
      const teamName = uniq("Deletable");
      const { teamId } = await createTeamAs(adminId, { teamName, maxAthletes: 5 });
      const created = await addRosterAthlete(adminId, teamId);
      expect(created.status).toBe(201);
      const athleteId = created.body.athleteId;

      const del = await request(app).delete(`/api/admin/teams/${teamId}`).set(headers(adminId, "admin")).send({});
      expect(del.status).toBe(200);

      const [team] = await db.select().from(teamTable).where(eq(teamTable.id, teamId)).limit(1);
      expect(team).toBeUndefined();
      const [ath] = await db.select({ teamId: athleteTable.teamId }).from(athleteTable).where(eq(athleteTable.id, athleteId)).limit(1);
      expect(ath).toBeTruthy();
      expect(ath.teamId).toBeNull();
      // athlete user no longer tracked under a team; clean up directly
      if (created.body.userId) {
        await db.delete(legalAcceptanceTable).where(eq(legalAcceptanceTable.athleteId, athleteId)).catch(() => {});
        await db.delete(athleteTable).where(eq(athleteTable.id, athleteId)).catch(() => {});
        await db.delete(userTable).where(eq(userTable.id, created.body.userId)).catch(() => {});
      }
    });
  });

  // ── 2. Approval & tier ────────────────────────────────────────────────────
  describe("approval & tier override", () => {
    it("approves a team → active, and grants tier to untiered athletes", async () => {
      const teamName = uniq("Approve");
      const { teamId } = await createTeamAs(adminId, { teamName, tier: "PHP", maxAthletes: 5 });
      const a = await addRosterAthlete(adminId, teamId);
      expect(a.status).toBe(201);

      const approve = await request(app)
        .post(`/api/admin/teams/${teamId}/approve`)
        .set(headers(adminId, "admin"))
        .send({ billingCycle: "monthly" });
      expect(approve.status).toBe(200);
      expect(approve.body.status).toBe("active");

      const [team] = await db.select({ s: teamTable.subscriptionStatus }).from(teamTable).where(eq(teamTable.id, teamId)).limit(1);
      expect(team.s).toBe("active");
      const [ath] = await db.select({ tier: athleteTable.currentProgramTier }).from(athleteTable).where(eq(athleteTable.id, a.body.athleteId)).limit(1);
      expect(ath.tier).toBe("PHP");
    });

    it("override-tier updates every athlete on the team", async () => {
      const teamName = uniq("Override");
      const { teamId } = await createTeamAs(adminId, { teamName, tier: "PHP", maxAthletes: 5 });
      const a1 = await addRosterAthlete(adminId, teamId);
      const a2 = await addRosterAthlete(adminId, teamId);
      const res = await request(app)
        .post(`/api/admin/teams/${teamId}/override-tier`)
        .set(headers(adminId, "admin"))
        .send({ accessTier: "PHP_Pro" });
      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(2);
      for (const id of [a1.body.athleteId, a2.body.athleteId]) {
        const [ath] = await db.select({ tier: athleteTable.currentProgramTier }).from(athleteTable).where(eq(athleteTable.id, id)).limit(1);
        expect(ath.tier).toBe("PHP_Pro");
      }
    });

    it("approve-sponsor-rest marks pending invites as sponsored/paid", async () => {
      const teamName = uniq("SponsorRest");
      const { teamId } = await createTeamAs(adminId, {
        teamName,
        paymentMode: "per_player_all",
        playerPayers: [{ name: "P1", email: `${uniq("p")}@ex.com` }],
      });
      const res = await request(app)
        .post(`/api/admin/teams/${teamId}/approve-sponsor-rest`)
        .set(headers(adminId, "admin"))
        .send({ billingCycle: "monthly" });
      expect(res.status).toBe(200);
      const invites = await db.select().from(teamPlayerPaymentInviteTable).where(eq(teamPlayerPaymentInviteTable.teamId, teamId));
      expect(invites.every((i) => i.status === "paid")).toBe(true);
      expect(invites.some((i) => i.emailLastError === "sponsored_by_manager")).toBe(true);
    });
  });

  // ── 3. Subscription requests, invites, draft, checkout ────────────────────
  describe("subscription requests, invites & payment config", () => {
    let teamId: number;
    let requestId: number;
    let inviteId: number;

    beforeAll(async () => {
      const teamName = uniq("Reqs");
      const created = await createTeamAs(adminId, {
        teamName,
        paymentMode: "per_player_all",
        playerPayers: [{ name: "Inv", email: `${uniq("inv")}@ex.com` }],
      });
      teamId = created.teamId;
      const [reqRow] = await db.select().from(teamSubscriptionRequestTable).where(eq(teamSubscriptionRequestTable.teamId, teamId)).limit(1);
      requestId = reqRow.id;
      const [inv] = await db.select().from(teamPlayerPaymentInviteTable).where(eq(teamPlayerPaymentInviteTable.requestId, requestId)).limit(1);
      inviteId = inv.id;
    });

    it("lists team subscription requests", async () => {
      const res = await request(app).get("/api/admin/team-subscription-requests").set(headers(adminId, "admin"));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.requests)).toBe(true);
    });

    it("lists player invites for a request", async () => {
      const res = await request(app).get(`/api/admin/team-subscription-requests/${requestId}/invites`).set(headers(adminId, "admin"));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.invites)).toBe(true);
      expect(res.body.invites.length).toBeGreaterThanOrEqual(1);
    });

    it("sponsors a single player invite", async () => {
      const res = await request(app)
        .post(`/api/admin/team-subscription-requests/${requestId}/invites/${inviteId}/sponsor`)
        .set(headers(adminId, "admin"))
        .send({});
      expect(res.status).toBe(200);
      const [inv] = await db.select({ status: teamPlayerPaymentInviteTable.status }).from(teamPlayerPaymentInviteTable).where(eq(teamPlayerPaymentInviteTable.id, inviteId)).limit(1);
      expect(inv.status).toBe("paid");
    });

    it("rejects a team subscription request", async () => {
      // fresh request so the sponsor/approve state above doesn't interfere
      const created = await createTeamAs(adminId, {
        teamName: uniq("Reject"),
        paymentMode: "per_player_all",
        playerPayers: [{ name: "Rej", email: `${uniq("rej")}@ex.com` }],
      });
      const [reqRow] = await db.select().from(teamSubscriptionRequestTable).where(eq(teamSubscriptionRequestTable.teamId, created.teamId)).limit(1);
      const res = await request(app).post(`/api/admin/team-subscription-requests/${reqRow.id}/reject`).set(headers(adminId, "admin")).send({});
      expect(res.status).toBe(200);
      const [after] = await db.select({ status: teamSubscriptionRequestTable.status }).from(teamSubscriptionRequestTable).where(eq(teamSubscriptionRequestTable.id, reqRow.id)).limit(1);
      expect(after.status).toBe("rejected");
    });

    it("round-trips a team payment config draft (owner only)", async () => {
      // The draft endpoints require the acting user to be the team's adminId.
      const put = await request(app)
        .put(`/api/billing/team/payment-config-draft/${teamId}`)
        .set(headers(adminId, "admin"))
        .send({
          scopeKey: "scope-1",
          paymentMode: "per_player_selected",
          coachPaysSeats: 2,
          playerPayers: [{ name: "Drafty", email: "drafty@ex.com", selected: true }],
        });
      expect(put.status).toBe(200);
      expect(put.body.draft.paymentMode).toBe("per_player_selected");

      const get = await request(app).get(`/api/billing/team/payment-config-draft/${teamId}`).set(headers(adminId, "admin"));
      expect(get.status).toBe(200);
      expect(get.body.draft.coachPaysSeats).toBe(2);

      // upsert again → same row (unique on adminId+teamId)
      const put2 = await request(app)
        .put(`/api/billing/team/payment-config-draft/${teamId}`)
        .set(headers(adminId, "admin"))
        .send({ scopeKey: "scope-2", paymentMode: "coach_pays_all", coachPaysSeats: 0, playerPayers: [] });
      expect(put2.status).toBe(200);
      const drafts = await db.select().from(teamPaymentConfigDraftTable).where(eq(teamPaymentConfigDraftTable.teamId, teamId));
      expect(drafts).toHaveLength(1);
    });

    it("creates a team checkout session for the owner (mocked Stripe URL)", async () => {
      // owner-only team with no prior request so the duplicate-guard doesn't trip
      const created = await createTeamAs(adminId, { teamName: uniq("Checkout"), maxAthletes: 6 });
      const res = await request(app)
        .post("/api/billing/team/checkout")
        .set(headers(adminId, "admin"))
        .send({ teamId: created.teamId, planId: phpPlanId, billingCycle: "monthly", paymentMode: "coach_pays_all" });
      expect(res.status).toBe(200);
      expect(typeof res.body.checkoutUrl === "string" || res.body.url).toBeTruthy();
    });
  });

  // ── 4. Roster (team manager) ──────────────────────────────────────────────
  describe("team roster", () => {
    let managerId: number;
    let teamId: number;
    let athleteId: number;

    beforeAll(async () => {
      managerId = await insertUser("team_coach");
      // managerId acts as admin to create the team so it becomes adminId.
      const created = await createTeamAs(managerId, { teamName: uniq("Roster"), maxAthletes: 5 });
      teamId = created.teamId;
    });

    it("creates a roster athlete with a generated email + temp password", async () => {
      const res = await addRosterAthlete(managerId, teamId, { username: "johnny", name: "Johnny R", age: 15 });
      expect(res.status).toBe(201);
      expect(res.body.email).toMatch(/^johnny\..+@/);
      expect(typeof res.body.temporaryPassword).toBe("string");
      athleteId = res.body.athleteId;
    });

    it("lists the roster with slot accounting", async () => {
      const res = await request(app).get("/api/team/roster").set(headers(managerId, "coach"));
      expect(res.status).toBe(200);
      expect(res.body.team.maxAthletes).toBe(5);
      expect(res.body.team.slotsRemaining).toBe(5 - res.body.team.memberCount);
      expect(res.body.members.some((m: any) => m.athleteId === athleteId)).toBe(true);
    });

    it("gets and patches an athlete detail", async () => {
      const get = await request(app).get(`/api/team/roster/athletes/${athleteId}`).set(headers(managerId, "coach"));
      expect(get.status).toBe(200);
      const patch = await request(app)
        .patch(`/api/team/roster/athletes/${athleteId}`)
        .set(headers(managerId, "coach"))
        .send({ name: "Johnny Renamed", trainingPerWeek: 4 });
      expect(patch.status).toBe(200);
      const [ath] = await db.select({ name: athleteTable.name, tpw: athleteTable.trainingPerWeek }).from(athleteTable).where(eq(athleteTable.id, athleteId)).limit(1);
      expect(ath.name).toBe("Johnny Renamed");
      expect(ath.tpw).toBe(4);
    });

    it("resets an athlete password (custom strong password accepted)", async () => {
      const res = await request(app)
        .post(`/api/team/roster/athletes/${athleteId}/reset-password`)
        .set(headers(managerId, "coach"))
        .send({ customPassword: STRONG_PW });
      expect(res.status).toBe(200);
      expect(res.body.temporaryPassword).toBe(STRONG_PW);
    });

    it("rejects a weak custom password (400)", async () => {
      const res = await request(app)
        .post(`/api/team/roster/athletes/${athleteId}/reset-password`)
        .set(headers(managerId, "coach"))
        .send({ customPassword: "weak" });
      expect(res.status).toBe(400);
    });

    it("updates the team email slug", async () => {
      const res = await request(app).patch("/api/team/roster/email-slug").set(headers(managerId, "coach")).send({ emailSlug: uniq("slug").slice(0, 40) });
      expect(res.status).toBe(200);
    });

    it("scopes the roster to the managing coach (other coach gets 404)", async () => {
      const otherCoach = await insertUser("team_coach");
      const res = await request(app).get("/api/team/roster").set(headers(otherCoach, "coach"));
      expect(res.status).toBe(404);
      const athRes = await request(app).get(`/api/team/roster/athletes/${athleteId}`).set(headers(otherCoach, "coach"));
      expect(athRes.status).toBe(404);
    });
  });

  // ── 5. Member admin, defaults, attach ─────────────────────────────────────
  describe("admin member management", () => {
    let teamName: string;
    let teamId: number;
    let athleteId: number;

    beforeAll(async () => {
      teamName = uniq("Members");
      const created = await createTeamAs(adminId, { teamName, maxAthletes: 5 });
      teamId = created.teamId;
      const a = await addRosterAthlete(adminId, teamId, { name: "Member One", age: 13 });
      athleteId = a.body.athleteId;
    });

    it("gets and updates a team member", async () => {
      const get = await request(app).get(`/api/admin/teams/${encodeURIComponent(teamName)}/members/${athleteId}`).set(headers(adminId, "admin"));
      expect(get.status).toBe(200);
      const patch = await request(app)
        .patch(`/api/admin/teams/${encodeURIComponent(teamName)}/members/${athleteId}`)
        .set(headers(adminId, "admin"))
        .send({ athleteName: "Member Renamed", currentProgramTier: "PHP_Premium", trainingPerWeek: 5 });
      expect(patch.status).toBe(200);
      const [ath] = await db.select({ name: athleteTable.name, tier: athleteTable.currentProgramTier }).from(athleteTable).where(eq(athleteTable.id, athleteId)).limit(1);
      expect(ath.name).toBe("Member Renamed");
      expect(ath.tier).toBe("PHP_Premium");
    });

    it("saves team defaults", async () => {
      const res = await request(app)
        .post("/api/admin/teams/defaults")
        .set(headers(adminId, "admin"))
        .send({ teamName, performanceGoals: "Run faster", equipmentAccess: "Cones" });
      expect(res.status).toBe(200);
    });

    it("attaches (moves) an athlete from another team", async () => {
      const other = await createTeamAs(adminId, { teamName: uniq("Source"), maxAthletes: 5 });
      const moving = await addRosterAthlete(adminId, other.teamId, { name: "Mover", age: 12 });
      const movingId = moving.body.athleteId;

      const res = await request(app)
        .post(`/api/admin/teams/${encodeURIComponent(teamName)}/athletes/${movingId}/attach`)
        .set(headers(adminId, "admin"))
        .send({ allowMoveFromOtherTeam: true });
      expect(res.status).toBe(200);
      const [ath] = await db.select({ teamId: athleteTable.teamId }).from(athleteTable).where(eq(athleteTable.id, movingId)).limit(1);
      expect(ath.teamId).toBe(teamId);
    });
  });

  // ── 6. Team sessions (program assignment) ─────────────────────────────────
  describe("team sessions", () => {
    it("lists team sessions (empty array for a fresh team)", async () => {
      const { teamId } = await createTeamAs(adminId, { teamName: uniq("Sessions"), maxAthletes: 5 });
      const res = await request(app).get(`/api/admin/teams/${teamId}/sessions`).set(headers(adminId, "admin"));
      expect(res.status).toBe(200);
      const list = Array.isArray(res.body) ? res.body : res.body.sessions;
      expect(Array.isArray(list)).toBe(true);
    });
  });

  // ── 7. Team social & chat ─────────────────────────────────────────────────
  describe("team social & chat", () => {
    let managerId: number;
    let teamId: number;
    let teamName: string;

    beforeAll(async () => {
      managerId = await insertUser("team_coach");
      const created = await createTeamAs(managerId, { teamName: uniq("Social"), maxAthletes: 5 });
      teamId = created.teamId;
      teamName = created.teamName;
      await addRosterAthlete(managerId, teamId);
    });

    it("returns the leaderboard for a team member (manager)", async () => {
      const res = await request(app).get("/api/teams/social/leaderboard").set(headers(managerId, "team_coach"));
      expect(res.status).toBe(200);
    });

    it("returns the directory and runs feed for a team member", async () => {
      const dir = await request(app).get("/api/teams/social/directory").set(headers(managerId, "team_coach"));
      expect(dir.status).toBe(200);
      const runs = await request(app).get("/api/teams/social/runs").set(headers(managerId, "team_coach"));
      expect(runs.status).toBe(200);
    });

    it("blocks a non-team user from the team feed", async () => {
      const outsider = await insertUser("athlete");
      const res = await request(app).get("/api/teams/social/leaderboard").set(headers(outsider, "athlete"));
      expect(res.status).not.toBe(200);
    });

    it("syncs team chat members (manager is in the team chat group)", async () => {
      const [group] = await db.select({ id: chatGroupTable.id }).from(chatGroupTable).where(eq(chatGroupTable.name, teamName)).limit(1);
      expect(group?.id).toBeTruthy();
      const members = await db.select({ userId: chatGroupMemberTable.userId }).from(chatGroupMemberTable).where(eq(chatGroupMemberTable.groupId, group.id));
      expect(members.some((m) => m.userId === managerId)).toBe(true);
    });
  });
});
