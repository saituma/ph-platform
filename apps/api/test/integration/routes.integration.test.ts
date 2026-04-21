import request from "supertest";
import Stripe from "stripe";

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
const hasStripe = Boolean(env.stripeSecretKey);
const hasR2 = Boolean(env.r2Bucket && env.r2AccountId && env.r2AccessKeyId && env.r2SecretAccessKey);

const app = createApp();

const ctx: {
  adminUserId?: number;
  guardianUserId?: number;
  tempUserId?: number;
  guardianId?: number;
  athleteId?: number;
  contentId?: number;
  courseId?: number;
  messageId?: number;
  groupId?: number;
  groupMessageId?: number;
  serviceTypeId?: number;
  availabilityId?: number;
  bookingId?: number;
  videoId?: number;
  exerciseId?: number;
  programId?: number;
  sessionId?: number;
  sessionExerciseId?: number;
  subscriptionPlanId?: number;
  subscriptionRequestId?: number;
  checkoutSessionId?: string;
  stripeProductId?: string;
  stripePriceId?: string;
  stripeCustomerId?: string;
} = {};

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

async function lookupGuardianAndAthlete(userId: number) {
  const guardianRes = await pool.query('select id from "guardians" where "userId" = $1', [userId]);
  const guardianId = guardianRes.rows[0]?.id as number | undefined;
  if (!guardianId) return { guardianId: undefined, athleteId: undefined };
  const athleteRes = await pool.query('select id from "athletes" where "guardianId" = $1', [guardianId]);
  const athleteId = athleteRes.rows[0]?.id as number | undefined;
  return { guardianId, athleteId };
}

async function ensureGuardianAndAthlete(userId: number) {
  const existing = await lookupGuardianAndAthlete(userId);
  if (existing.guardianId && existing.athleteId) {
    return existing;
  }

  let guardianId = existing.guardianId;
  if (!guardianId) {
    const email = testUsers.get(userId)?.email ?? `guardian-${userId}@example.com`;
    const guardianRes = await pool.query('insert into "guardians" ("userId", "email") values ($1, $2) returning id', [
      userId,
      email,
    ]);
    guardianId = guardianRes.rows[0]?.id as number | undefined;
  }

  if (!guardianId) {
    return { guardianId: undefined, athleteId: undefined };
  }

  const athleteRes = await pool.query(
    'insert into "athletes" ("userId", "guardianId", "name", "age", "birthDate", "team", "trainingPerWeek", "onboardingCompleted", "onboardingCompletedAt") values ($1,$2,$3,$4,$5,$6,$7,$8,now()) returning id',
    [userId, guardianId, "Test Athlete", 14, "2010-01-01", "Test Team", 3, true],
  );
  const athleteId = athleteRes.rows[0]?.id as number | undefined;
  return { guardianId, athleteId };
}

describe("integration: routes (real DB/Stripe)", () => {
  if (!hasDatabase) {
    it.skip("DATABASE_URL missing", () => {});
    return;
  }

  jest.setTimeout(60000);

  let previousOnboardingConfig: any = null;
  let schemaReady = false;

  beforeAll(async () => {
    const columnCheck = await pool.query(
      `select column_name from information_schema.columns where table_name = 'athletes' and column_name = 'birthDate'`,
    );
    schemaReady = (columnCheck.rowCount ?? 0) > 0;

    ctx.adminUserId = await insertUser("admin");
    ctx.guardianUserId = await insertUser("guardian");
    ctx.tempUserId = await insertUser("guardian");
    defaultUserId = ctx.guardianUserId!;

    const configRes = await pool.query('select * from "onboarding_configs" order by id asc limit 1');
    previousOnboardingConfig = configRes.rows[0] ?? null;
  });

  afterAll(async () => {
    const ids = {
      admin: ctx.adminUserId,
      guardian: ctx.guardianUserId,
      temp: ctx.tempUserId,
    };

    if (ctx.subscriptionRequestId) {
      await pool.query('delete from "subscription_requests" where id = $1', [ctx.subscriptionRequestId]);
    }
    if (ctx.subscriptionPlanId) {
      await pool.query('delete from "subscription_requests" where "planId" = $1', [ctx.subscriptionPlanId]);
    }
    if (ids.guardian || ids.admin || ids.temp) {
      await pool.query(
        'delete from "message_reactions" where "messageId" in (select id from "messages" where "senderId" = any($1) or "receiverId" = any($1))',
        [[ids.guardian, ids.admin, ids.temp].filter(Boolean)],
      );
    }
    if (ids.guardian || ids.admin || ids.temp) {
      await pool.query('delete from "messages" where "senderId" = any($1) or "receiverId" = any($1)', [
        [ids.guardian, ids.admin, ids.temp].filter(Boolean),
      ]);
    }
    if (ids.guardian) {
      await pool.query('delete from "notifications" where "userId" = $1', [ids.guardian]);
    }
    if (ctx.subscriptionPlanId) {
      await pool.query('delete from "subscription_plans" where id = $1', [ctx.subscriptionPlanId]);
    }
    if (ctx.groupMessageId) {
      await pool.query('delete from "chat_group_message_reactions" where "messageId" = $1', [ctx.groupMessageId]);
    }
    if (ctx.groupId) {
      await pool.query('delete from "chat_group_messages" where "groupId" = $1', [ctx.groupId]);
      await pool.query('delete from "chat_group_members" where "groupId" = $1', [ctx.groupId]);
      await pool.query('delete from "chat_groups" where id = $1', [ctx.groupId]);
    }
    if (ctx.messageId) {
      await pool.query('delete from "message_reactions" where "messageId" = $1', [ctx.messageId]);
      await pool.query('delete from "messages" where id = $1', [ctx.messageId]);
    }
    if (ctx.sessionExerciseId) {
      await pool.query('delete from "session_exercises" where id = $1', [ctx.sessionExerciseId]);
    }
    if (ctx.sessionId) {
      await pool.query('delete from "sessions" where id = $1', [ctx.sessionId]);
    }
    if (ctx.programId) {
      await pool.query('delete from "programs" where id = $1', [ctx.programId]);
    }
    if (ctx.exerciseId) {
      await pool.query('delete from "exercises" where id = $1', [ctx.exerciseId]);
    }
    if (ctx.bookingId) {
      await pool.query('delete from "bookings" where id = $1', [ctx.bookingId]);
    }
    if (ctx.availabilityId) {
      await pool.query('delete from "availability_blocks" where id = $1', [ctx.availabilityId]);
    }
    if (ctx.serviceTypeId) {
      await pool.query('delete from "service_types" where id = $1', [ctx.serviceTypeId]);
    }
    if (ctx.videoId) {
      await pool.query('delete from "video_uploads" where id = $1', [ctx.videoId]);
    }
    if (ctx.contentId) {
      await pool.query('delete from "contents" where id = $1', [ctx.contentId]);
    }
    if (ctx.courseId) {
      await pool.query('delete from "parent_courses" where id = $1', [ctx.courseId]);
    }
    if (ctx.athleteId) {
      await pool.query('delete from "legal_acceptances" where "athleteId" = $1', [ctx.athleteId]);
      await pool.query('delete from "enrollments" where "athleteId" = $1', [ctx.athleteId]);
      await pool.query('delete from "athletes" where id = $1', [ctx.athleteId]);
    }
    if (ctx.guardianId) {
      await pool.query('delete from "guardians" where id = $1', [ctx.guardianId]);
    }
    if (ids.guardian) {
      await pool.query('delete from "guardians" where "userId" = $1', [ids.guardian]);
    }
    if (ids.temp) {
      await pool.query('delete from "guardians" where "userId" = $1', [ids.temp]);
    }

    if (previousOnboardingConfig) {
      await pool.query(
        'update "onboarding_configs" set version = $1, fields = $2::jsonb, "requiredDocuments" = $3::jsonb, "welcomeMessage" = $4, "coachMessage" = $5, "defaultProgramTier" = $6, "approvalWorkflow" = $7, notes = $8, "updatedAt" = now() where id = $9',
        [
          previousOnboardingConfig.version,
          JSON.stringify(previousOnboardingConfig.fields ?? []),
          JSON.stringify(previousOnboardingConfig.requiredDocuments ?? []),
          previousOnboardingConfig.welcomeMessage,
          previousOnboardingConfig.coachMessage,
          previousOnboardingConfig.defaultProgramTier,
          previousOnboardingConfig.approvalWorkflow,
          previousOnboardingConfig.notes,
          previousOnboardingConfig.id,
        ],
      );
    }
    if (ids.admin) {
      await pool.query(
        'update "onboarding_configs" set "updatedBy" = null, "createdBy" = null where "updatedBy" = $1 or "createdBy" = $1',
        [ids.admin],
      );
    }

    if (ids.admin) {
      await pool.query('delete from "admin_settings" where "userId" = $1', [ids.admin]);
    }

    if (ids.temp) {
      await pool.query('delete from "users" where id = $1', [ids.temp]);
    }
    if (ids.guardian) {
      await pool.query('delete from "users" where id = $1', [ids.guardian]);
    }
    if (ids.admin) {
      await pool.query('delete from "users" where id = $1', [ids.admin]);
    }

    if (hasStripe) {
      const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
      if (ctx.stripeCustomerId) {
        await stripe.customers.del(ctx.stripeCustomerId);
      }
      if (ctx.stripePriceId) {
        await stripe.prices.update(ctx.stripePriceId, { active: false });
      }
      if (ctx.stripeProductId) {
        await stripe.products.update(ctx.stripeProductId, { active: false });
      }
    }

    await pool.end();
  });

  it("GET /api/health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
  });

  it("GET /api/public/plans", async () => {
    const res = await request(app).get("/api/public/plans");
    expect(res.status).toBe(200);
  });

  it("POST /api/onboarding", async () => {
    if (!schemaReady) return;
    const res = await request(app)
      .post("/api/onboarding")
      .set(testHeaders(ctx.guardianUserId!))
      .send({
        athleteName: "Test Athlete",
        birthDate: "2010-01-01",
        team: "Test Team",
        trainingPerWeek: 3,
        injuries: "None",
        growthNotes: null,
        performanceGoals: "Goals",
        equipmentAccess: "Yes",
        parentEmail: testUsers.get(ctx.guardianUserId!)!.email,
        desiredProgramType: "PHP",
        termsVersion: "v1",
        privacyVersion: "v1",
        appVersion: "1.0.0",
      });
    expect(res.status).toBe(200);

    const { guardianId, athleteId } = await lookupGuardianAndAthlete(ctx.guardianUserId!);
    ctx.guardianId = guardianId;
    ctx.athleteId = athleteId;
    expect(ctx.guardianId).toBeDefined();
    expect(ctx.athleteId).toBeDefined();
  });

  it("GET /api/onboarding", async () => {
    if (!schemaReady) return;
    const res = await request(app).get("/api/onboarding").set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("GET /api/onboarding/config", async () => {
    const res = await request(app).get("/api/onboarding/config");
    expect(res.status).toBe(200);
  });

  it("GET /api/programs", async () => {
    if (!schemaReady) return;
    const res = await request(app).get("/api/programs").set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/programs", async () => {
    const res = await request(app)
      .post("/api/admin/programs")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ name: "Test Program", type: "PHP" });
    expect(res.status).toBe(201);
    ctx.programId = res.body.program?.id;
  });

  it("POST /api/admin/exercises", async () => {
    const res = await request(app)
      .post("/api/admin/exercises")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ name: "Test Exercise" });
    expect(res.status).toBe(201);
    ctx.exerciseId = res.body.exercise?.id;
  });

  it("POST /api/admin/sessions", async () => {
    const res = await request(app)
      .post("/api/admin/sessions")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ programId: ctx.programId, weekNumber: 1, sessionNumber: 1, type: "program" });
    expect(res.status).toBe(201);
    ctx.sessionId = res.body.session?.id;
  });

  it("POST /api/admin/session-exercises", async () => {
    const res = await request(app)
      .post("/api/admin/session-exercises")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ sessionId: ctx.sessionId, exerciseId: ctx.exerciseId, order: 1 });
    expect(res.status).toBe(201);
    ctx.sessionExerciseId = res.body.item?.id;
  });

  it("GET /api/programs/exercises", async () => {
    const res = await request(app).get("/api/programs/exercises").set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("GET /api/programs/:programId", async () => {
    const res = await request(app).get(`/api/programs/${ctx.programId}`).set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("GET /api/programs/:programId/sessions", async () => {
    const res = await request(app).get(`/api/programs/${ctx.programId}/sessions`).set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("POST /api/content", async () => {
    if (!schemaReady) return;
    const res = await request(app).post("/api/content").set(testHeaders(ctx.adminUserId!, "admin")).send({
      title: "Test Content",
      content: "Summary",
      type: "article",
      surface: "parent_platform",
    });
    expect(res.status).toBe(201);
    ctx.contentId = res.body.item?.id;
  });

  it("PUT /api/content/:contentId", async () => {
    if (!schemaReady || !ctx.contentId) return;
    const res = await request(app)
      .put(`/api/content/${ctx.contentId}`)
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({
        title: "Updated Content",
        content: "Summary",
        type: "article",
      });
    expect(res.status).toBe(200);
  });

  it("GET /api/content/home", async () => {
    if (!schemaReady) return;
    const res = await request(app).get("/api/content/home").set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("GET /api/content/parent-platform", async () => {
    if (!schemaReady) return;
    const res = await request(app).get("/api/content/parent-platform").set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("GET /api/content/:contentId", async () => {
    if (!schemaReady || !ctx.contentId) return;
    const res = await request(app).get(`/api/content/${ctx.contentId}`).set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("POST /api/content/parent-courses", async () => {
    if (!schemaReady) return;
    const res = await request(app)
      .post("/api/content/parent-courses")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({
        title: "Test Course",
        summary: "Summary",
        category: "Growth and maturation",
        modules: [{ id: "mod-1", title: "Intro", type: "article", order: 0, content: "Text" }],
      });
    expect(res.status).toBe(201);
    ctx.courseId = res.body.item?.id;
  });

  it("PUT /api/content/parent-courses/:courseId", async () => {
    if (!schemaReady || !ctx.courseId) return;
    const res = await request(app)
      .put(`/api/content/parent-courses/${ctx.courseId}`)
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({
        title: "Updated Course",
        summary: "Summary",
        category: "Growth and maturation",
        modules: [{ id: "mod-1", title: "Intro", type: "article", order: 0, content: "Text" }],
      });
    expect(res.status).toBe(200);
  });

  it("GET /api/content/parent-courses", async () => {
    if (!schemaReady) return;
    const res = await request(app).get("/api/content/parent-courses").set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("GET /api/content/parent-courses/:courseId", async () => {
    if (!schemaReady || !ctx.courseId) return;
    const res = await request(app)
      .get(`/api/content/parent-courses/${ctx.courseId}`)
      .set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("POST /api/messages", async () => {
    if (!schemaReady) return;
    const res = await request(app)
      .post("/api/messages")
      .set(testHeaders(ctx.guardianUserId!))
      .send({ content: "Hello" });
    expect(res.status).toBe(201);
    ctx.messageId = res.body.message?.id;
  });

  it("GET /api/messages", async () => {
    if (!schemaReady) return;
    const res = await request(app).get("/api/messages").set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("POST /api/messages/read", async () => {
    if (!schemaReady) return;
    const res = await request(app).post("/api/messages/read").set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("PUT /api/messages/:messageId/reactions", async () => {
    if (!schemaReady || !ctx.messageId) return;
    const res = await request(app)
      .put(`/api/messages/${ctx.messageId}/reactions`)
      .set(testHeaders(ctx.guardianUserId!))
      .send({ emoji: "ok" });
    expect(res.status).toBe(200);
  });

  it("POST /api/chat/groups", async () => {
    const res = await request(app)
      .post("/api/chat/groups")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ name: unique("group"), memberIds: [ctx.guardianUserId] });
    expect(res.status).toBe(201);
    ctx.groupId = res.body.group?.id;
  });

  it("GET /api/chat/groups", async () => {
    const res = await request(app).get("/api/chat/groups").set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("GET /api/chat/groups/:groupId/members", async () => {
    const res = await request(app).get(`/api/chat/groups/${ctx.groupId}/members`).set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("POST /api/chat/groups/:groupId/members", async () => {
    const res = await request(app)
      .post(`/api/chat/groups/${ctx.groupId}/members`)
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ memberIds: [ctx.adminUserId] });
    expect(res.status).toBe(200);
  });

  it("GET /api/chat/groups/:groupId/messages", async () => {
    const res = await request(app)
      .get(`/api/chat/groups/${ctx.groupId}/messages`)
      .set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("POST /api/chat/groups/:groupId/messages", async () => {
    const res = await request(app)
      .post(`/api/chat/groups/${ctx.groupId}/messages`)
      .set(testHeaders(ctx.guardianUserId!))
      .send({ content: "Hello group" });
    expect(res.status).toBe(201);
    ctx.groupMessageId = res.body.message?.id;
  });

  it("PUT /api/chat/groups/:groupId/messages/:messageId/reactions", async () => {
    const res = await request(app)
      .put(`/api/chat/groups/${ctx.groupId}/messages/${ctx.groupMessageId}/reactions`)
      .set(testHeaders(ctx.guardianUserId!))
      .send({ emoji: "ok" });
    expect(res.status).toBe(200);
  });

  it("POST /api/bookings/services", async () => {
    if (!schemaReady) return;
    const res = await request(app)
      .post("/api/bookings/services")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ name: "Test Service", type: "group_call", durationMinutes: 30 });
    expect(res.status).toBe(201);
    ctx.serviceTypeId = res.body.item?.id;
  });

  it("PATCH /api/bookings/services/:id", async () => {
    if (!schemaReady || !ctx.serviceTypeId) return;
    const res = await request(app)
      .patch(`/api/bookings/services/${ctx.serviceTypeId}`)
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ name: "Updated Service" });
    expect(res.status).toBe(200);
  });

  it("GET /api/bookings/services", async () => {
    if (!schemaReady) return;
    const res = await request(app).get("/api/bookings/services").set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("POST /api/bookings/availability", async () => {
    if (!schemaReady || !ctx.serviceTypeId) return;
    const startsAt = new Date(Date.now() + 3600000).toISOString();
    const endsAt = new Date(Date.now() + 7200000).toISOString();
    const res = await request(app)
      .post("/api/bookings/availability")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ serviceTypeId: ctx.serviceTypeId, startsAt, endsAt });
    expect(res.status).toBe(201);
    ctx.availabilityId = res.body.item?.id;
  });

  it("GET /api/bookings/availability", async () => {
    if (!schemaReady || !ctx.serviceTypeId) return;
    const from = new Date(Date.now() - 3600000).toISOString();
    const to = new Date(Date.now() + 7200000).toISOString();
    const res = await request(app)
      .get("/api/bookings/availability")
      .set(testHeaders(ctx.guardianUserId!))
      .query({ serviceTypeId: ctx.serviceTypeId, from, to });
    expect(res.status).toBe(200);
  });

  it("POST /api/bookings", async () => {
    if (!schemaReady || !ctx.serviceTypeId) return;
    const startsAt = new Date(Date.now() + 3600000).toISOString();
    const endsAt = new Date(Date.now() + 7200000).toISOString();
    const res = await request(app)
      .post("/api/bookings")
      .set(testHeaders(ctx.guardianUserId!))
      .send({ serviceTypeId: ctx.serviceTypeId, startsAt, endsAt });
    expect(res.status).toBe(201);
    ctx.bookingId = res.body.booking?.id;
  });

  it("GET /api/bookings", async () => {
    if (!schemaReady) return;
    const res = await request(app).get("/api/bookings").set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("POST /api/videos", async () => {
    if (!schemaReady) return;
    const res = await request(app)
      .post("/api/videos")
      .set(testHeaders(ctx.guardianUserId!))
      .send({ videoUrl: "https://example.com/video.mp4" });
    expect(res.status).toBe(201);
    ctx.videoId = res.body.item?.id;
  });

  it("GET /api/videos", async () => {
    if (!schemaReady) return;
    const res = await request(app).get("/api/videos").set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("POST /api/videos/presign", async () => {
    if (!schemaReady) return;
    const res = await request(app)
      .post("/api/videos/presign")
      .set(testHeaders(ctx.guardianUserId!))
      .send({ key: "videos/test.mp4", contentType: "video/mp4", sizeBytes: 1024 });
    expect(res.status).toBe(200);
  });

  it("POST /api/videos/review", async () => {
    if (!schemaReady || !ctx.videoId) return;
    const res = await request(app)
      .post("/api/videos/review")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ uploadId: ctx.videoId, feedback: "Looks good" });
    expect(res.status).toBe(200);
  });

  it("POST /api/media/signed-url (skipped: CloudFront not used)", async () => {
    return;
  });

  it("POST /api/media/presign", async () => {
    if (!hasR2) {
      return;
    }
    const res = await request(app)
      .post("/api/media/presign")
      .set(testHeaders(ctx.guardianUserId!))
      .send({ folder: "media", fileName: "file.png", contentType: "image/png", sizeBytes: 1024 });
    expect(res.status).toBe(200);
  });

  it("GET /api/billing/plans", async () => {
    const res = await request(app).get("/api/billing/plans");
    expect(res.status).toBe(200);
  });

  it("GET /api/billing/public-plans", async () => {
    const res = await request(app).get("/api/billing/public-plans");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/subscription-plans", async () => {
    if (!hasStripe) {
      return;
    }
    const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
    const product = await stripe.products.create({ name: unique("product") });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 500,
      currency: "usd",
    });
    ctx.stripeProductId = product.id;
    ctx.stripePriceId = price.id;

    const res = await request(app)
      .post("/api/admin/subscription-plans")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({
        name: "Test Plan",
        tier: "PHP",
        stripePriceId: price.id,
        displayPrice: "$5",
        billingInterval: "one_time",
      });
    expect(res.status).toBe(201);
    ctx.subscriptionPlanId = res.body.plan?.id;
  });

  it("GET /api/admin/subscription-plans", async () => {
    const res = await request(app).get("/api/admin/subscription-plans").set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("PUT /api/admin/subscription-plans/:planId", async () => {
    if (!ctx.subscriptionPlanId) return;
    const res = await request(app)
      .put(`/api/admin/subscription-plans/${ctx.subscriptionPlanId}`)
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ displayPrice: "$6" });
    expect(res.status).toBe(200);
  });

  it("POST /api/billing/checkout", async () => {
    if (!schemaReady || !ctx.subscriptionPlanId) return;
    if (!ctx.athleteId) {
      const ensured = await ensureGuardianAndAthlete(ctx.guardianUserId!);
      ctx.guardianId = ensured.guardianId ?? ctx.guardianId;
      ctx.athleteId = ensured.athleteId ?? ctx.athleteId;
    }
    if (!ctx.athleteId) {
      console.log("checkout skipped: no athlete profile found");
      return;
    }
    const res = await request(app)
      .post("/api/billing/checkout")
      .set(testHeaders(ctx.guardianUserId!))
      .send({ planId: ctx.subscriptionPlanId });
    if (res.status !== 200) {
      console.log("checkout failed", res.status, res.body);
    }
    expect(res.status).toBe(200);
    ctx.subscriptionRequestId = res.body.request?.id ?? ctx.subscriptionRequestId;
    ctx.checkoutSessionId = res.body.sessionId ?? ctx.checkoutSessionId;
  });

  it("POST /api/billing/payment-sheet", async () => {
    if (!schemaReady || !ctx.subscriptionPlanId) return;
    if (!ctx.athleteId) {
      const ensured = await ensureGuardianAndAthlete(ctx.guardianUserId!);
      ctx.guardianId = ensured.guardianId ?? ctx.guardianId;
      ctx.athleteId = ensured.athleteId ?? ctx.athleteId;
    }
    if (!ctx.athleteId) {
      console.log("payment-sheet skipped: no athlete profile found");
      return;
    }
    const res = await request(app)
      .post("/api/billing/payment-sheet")
      .set(testHeaders(ctx.guardianUserId!))
      .send({ planId: ctx.subscriptionPlanId });
    if (res.status !== 200) {
      console.log("payment-sheet failed", res.status, res.body);
    }
    expect(res.status).toBe(200);
    ctx.stripeCustomerId = res.body.customerId;
    if (res.body.request?.id) {
      ctx.subscriptionRequestId = res.body.request.id;
    }
    if (res.body.paymentIntentId) {
      const confirm = await request(app)
        .post("/api/billing/payment-sheet/confirm")
        .set(testHeaders(ctx.guardianUserId!))
        .send({ paymentIntentId: res.body.paymentIntentId });
      expect(confirm.status).toBe(200);
    }
  });

  it("POST /api/billing/confirm", async () => {
    if (!ctx.checkoutSessionId) return;
    const res = await request(app)
      .post("/api/billing/confirm")
      .set(testHeaders(ctx.guardianUserId!))
      .send({ sessionId: ctx.checkoutSessionId });
    expect(res.status).toBe(200);
  });

  it("GET /api/billing/status", async () => {
    if (!schemaReady) return;
    const res = await request(app).get("/api/billing/status").set(testHeaders(ctx.guardianUserId!));
    expect(res.status).toBe(200);
  });

  it("POST /api/billing/downgrade", async () => {
    if (!schemaReady || !ctx.athleteId) return;
    const promote = await request(app)
      .post("/api/admin/users/program-tier")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ athleteId: ctx.athleteId, programTier: "PHP_Premium" });
    expect(promote.status).toBe(200);

    const res = await request(app)
      .post("/api/billing/downgrade")
      .set(testHeaders(ctx.guardianUserId!))
      .send({ tier: "PHP_Premium_Plus" });
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/subscription-requests", async () => {
    const res = await request(app).get("/api/admin/subscription-requests").set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/subscription-requests/:requestId/approve", async () => {
    if (!ctx.subscriptionRequestId) return;
    const res = await request(app)
      .post(`/api/admin/subscription-requests/${ctx.subscriptionRequestId}/approve`)
      .set(testHeaders(ctx.adminUserId!, "admin"));
    expect([200, 404]).toContain(res.status);
  });

  it("POST /api/admin/subscription-requests/:requestId/reject", async () => {
    if (!ctx.subscriptionRequestId) return;
    const res = await request(app)
      .post(`/api/admin/subscription-requests/${ctx.subscriptionRequestId}/reject`)
      .set(testHeaders(ctx.adminUserId!, "admin"));
    expect([200, 404]).toContain(res.status);
  });

  it("GET /api/admin/users", async () => {
    if (!schemaReady) return;
    const res = await request(app).get("/api/admin/users").set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/users/:userId/block", async () => {
    const res = await request(app)
      .post(`/api/admin/users/${ctx.tempUserId}/block`)
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ blocked: true });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/admin/users/:userId", async () => {
    const res = await request(app)
      .delete(`/api/admin/users/${ctx.tempUserId}`)
      .set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/dashboard", async () => {
    if (!schemaReady) return;
    const res = await request(app).get("/api/admin/dashboard").set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/profile", async () => {
    const res = await request(app).get("/api/admin/profile").set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("PUT /api/admin/profile", async () => {
    const res = await request(app)
      .put("/api/admin/profile")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ name: "Admin", email: testUsers.get(ctx.adminUserId!)!.email });
    expect(res.status).toBe(200);
  });

  it("PUT /api/admin/preferences", async () => {
    const res = await request(app).put("/api/admin/preferences").set(testHeaders(ctx.adminUserId!, "admin")).send({
      timezone: "UTC",
      notificationSummary: "Weekly",
      workStartHour: 9,
      workStartMinute: 0,
      workEndHour: 17,
      workEndMinute: 0,
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/onboarding-config", async () => {
    const res = await request(app).get("/api/admin/onboarding-config").set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("PUT /api/admin/onboarding-config", async () => {
    const res = await request(app)
      .put("/api/admin/onboarding-config")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({
        version: 1,
        fields: [
          { id: "athleteName", label: "Athlete Name", type: "text", required: true, visible: true },
          { id: "birthDate", label: "Birth Date", type: "date", required: true, visible: true },
        ],
        requiredDocuments: [{ id: "consent", label: "Guardian Consent Form", required: true }],
        welcomeMessage: "Welcome",
        coachMessage: "Coach",
        defaultProgramTier: "PHP",
        approvalWorkflow: "manual",
        notes: "Notes",
      });
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/bookings", async () => {
    const res = await request(app).get("/api/admin/bookings").set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/availability", async () => {
    const res = await request(app).get("/api/admin/availability").set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/videos", async () => {
    const res = await request(app).get("/api/admin/videos").set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/messages/threads", async () => {
    const res = await request(app).get("/api/admin/messages/threads").set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/messages/:userId", async () => {
    const res = await request(app)
      .get(`/api/admin/messages/${ctx.guardianUserId}`)
      .set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/messages/:userId", async () => {
    const res = await request(app)
      .post(`/api/admin/messages/${ctx.guardianUserId}`)
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ content: "Hello from admin" });
    expect(res.status).toBe(201);
  });

  it("POST /api/admin/messages/:userId/read", async () => {
    const res = await request(app)
      .post(`/api/admin/messages/${ctx.guardianUserId}/read`)
      .set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/users/:userId/onboarding", async () => {
    if (!schemaReady || !ctx.guardianUserId) return;
    const res = await request(app)
      .get(`/api/admin/users/${ctx.guardianUserId}/onboarding`)
      .set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/users/program-tier", async () => {
    if (!schemaReady || !ctx.athleteId) return;
    const res = await request(app)
      .post("/api/admin/users/program-tier")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ athleteId: ctx.athleteId, programTier: "PHP" });
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/enrollments", async () => {
    if (!schemaReady || !ctx.athleteId) return;
    const res = await request(app)
      .post("/api/admin/enrollments")
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ athleteId: ctx.athleteId, programType: "PHP" });
    expect(res.status).toBe(201);
  });

  it("GET /api/admin/exercises", async () => {
    const res = await request(app).get("/api/admin/exercises").set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });

  it("PATCH /api/admin/exercises/:exerciseId", async () => {
    const res = await request(app)
      .patch(`/api/admin/exercises/${ctx.exerciseId}`)
      .set(testHeaders(ctx.adminUserId!, "admin"))
      .send({ name: "Updated Exercise" });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/admin/session-exercises/:sessionExerciseId", async () => {
    const res = await request(app)
      .delete(`/api/admin/session-exercises/${ctx.sessionExerciseId}`)
      .set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
    ctx.sessionExerciseId = undefined;
  });

  it("DELETE /api/admin/exercises/:exerciseId", async () => {
    const res = await request(app)
      .delete(`/api/admin/exercises/${ctx.exerciseId}`)
      .set(testHeaders(ctx.adminUserId!, "admin"));
    expect(res.status).toBe(200);
  });
});
