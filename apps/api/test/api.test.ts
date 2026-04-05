import request from "supertest";

import { createApp } from "../src/app";

jest.mock("../src/config/env", () => ({
  env: {
    authMode: "cognito",
    stripePublishableKey: "pk_test",
    stripeSecretKey: "",
    stripeWebhookSecret: "",
    stripeSuccessUrl: "",
    stripeCancelUrl: "",
    videoMaxMb: 200,
    mediaMaxMb: 25,
  },
}));

jest.mock("../src/db", () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(async () => [{ userId: 1 }]),
        })),
      })),
    })),
  },
}));

jest.mock("../src/middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 1, role: "coach", email: "test@example.com", name: "Test", sub: "sub" };
    next();
  },
}));

jest.mock("../src/middlewares/roles", () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../src/services/auth.service", () => ({
  signUpUser: jest.fn(async () => ({ UserSub: "sub", CodeDeliveryDetails: { Destination: "test@example.com" } })),
  confirmSignUp: jest.fn(async () => ({})),
  resendConfirmation: jest.fn(async () => ({ CodeDeliveryDetails: { Destination: "test@example.com" } })),
  loginUser: jest.fn(async () => ({ AuthenticationResult: { AccessToken: "token", IdToken: "id", RefreshToken: "refresh", ExpiresIn: 3600, TokenType: "Bearer" } })),
  refreshUserSession: jest.fn(async () => ({ AuthenticationResult: { AccessToken: "token", IdToken: "id", ExpiresIn: 3600, TokenType: "Bearer" } })),
  startForgotPassword: jest.fn(async () => ({ CodeDeliveryDetails: { Destination: "test@example.com" } })),
  confirmForgotPassword: jest.fn(async () => ({})),
  changePassword: jest.fn(async () => ({})),
}));

jest.mock("../src/services/onboarding.service", () => ({
  submitOnboarding: jest.fn(async () => ({ athleteId: 1, status: "active" })),
  getOnboardingByUser: jest.fn(async () => ({ id: 1 })),
  getPublicOnboardingConfig: jest.fn(async () => ({ id: 1, fields: [] })),
}));

jest.mock("../src/services/program.service", () => ({
  getProgramCards: jest.fn(async () => [{ type: "PHP", status: "active" }]),
  getProgramById: jest.fn(async () => ({ id: 1, name: "Program" })),
  getProgramSessions: jest.fn(async () => []),
  getExerciseLibrary: jest.fn(async () => []),
}));

jest.mock("../src/services/content.service", () => ({
  getHomeContentForUser: jest.fn(async () => []),
  getParentPlatformContent: jest.fn(async () => []),
  createContent: jest.fn(async () => ({ id: 1 })),
  updateContent: jest.fn(async () => ({ id: 1 })),
  getContentById: jest.fn(async () => ({ id: 1, title: "Title" })),
  listParentCourses: jest.fn(async () => []),
  getParentCourseById: jest.fn(async () => ({ id: 1, title: "Course" })),
  createParentCourse: jest.fn(async () => ({ id: 1 })),
  updateParentCourse: jest.fn(async () => ({ id: 1 })),
}));

jest.mock("../src/services/message.service", () => ({
  listThread: jest.fn(async () => []),
  sendMessage: jest.fn(async () => ({ id: 1 })),
  markThreadRead: jest.fn(async () => 1),
  getCoachUser: jest.fn(async () => ({ id: 2 })),
  getLastAdminContact: jest.fn(async () => null),
}));

jest.mock("../src/services/reaction.service", () => ({
  toggleDirectMessageReaction: jest.fn(async () => ({ messageId: 1, reactions: [] })),
  toggleGroupMessageReaction: jest.fn(async () => ({ messageId: 1, reactions: [] })),
}));

jest.mock("../src/services/chat.service", () => ({
  listGroupsForUser: jest.fn(async () => []),
  createGroup: jest.fn(async () => ({ id: 1 })),
  addGroupMembers: jest.fn(async () => ({})),
  listGroupMembers: jest.fn(async () => []),
  listGroupMessages: jest.fn(async () => []),
  isGroupMember: jest.fn(async () => true),
  createGroupMessage: jest.fn(async () => ({ id: 1 })),
}));

jest.mock("../src/services/user.service", () => ({
  getGuardianAndAthlete: jest.fn(async () => ({
    guardian: { id: 1, userId: 1 },
    athlete: { id: 1, guardianId: 1, currentProgramTier: "PHP_Premium" },
  })),
  getAthleteForUser: jest.fn(async () => ({ id: 1, guardianId: 1, currentProgramTier: "PHP_Premium" })),
}));

jest.mock("../src/services/booking.service", () => ({
  listServiceTypes: jest.fn(async () => []),
  createServiceType: jest.fn(async () => ({ id: 1 })),
  updateServiceType: jest.fn(async () => ({ id: 1 })),
  listAvailabilityBlocks: jest.fn(async () => []),
  createAvailabilityBlock: jest.fn(async () => ({ id: 1 })),
  createBooking: jest.fn(async () => ({ id: 1 })),
  listBookingsForUser: jest.fn(async () => []),
}));

jest.mock("../src/services/s3.service", () => ({
  getPresignedUploadUrl: jest.fn(async () => "https://s3.test/upload"),
  getPublicObjectUrl: jest.fn(async () => "https://s3.test/public"),
}));

jest.mock("../src/services/cloudfront.service", () => ({
  getSignedMediaUrl: jest.fn(() => "https://cdn.test/signed"),
}));

jest.mock("../src/services/video.service", () => ({
  createVideoUpload: jest.fn(async () => ({ id: 1 })),
  listVideoUploadsByAthlete: jest.fn(async () => []),
  reviewVideoUpload: jest.fn(async () => ({ id: 1 })),
}));

jest.mock("../src/services/billing.service", () => ({
  listSubscriptionPlans: jest.fn(async () => []),
  getLatestSubscriptionRequest: jest.fn(async () => ({ requestId: 1, status: "pending_payment" })),
  createCheckoutSession: jest.fn(async () => ({ session: { url: "https://checkout", id: "sess_1" }, request: {} })),
  confirmCheckoutSession: jest.fn(async () => ({ session: { payment_status: "paid" }, request: {} })),
  createPaymentSheetIntent: jest.fn(async () => ({
    customerId: "cus_1",
    ephemeralKey: "eph_1",
    paymentIntentId: "pi_1",
    paymentIntentClientSecret: "secret",
    request: {},
  })),
  confirmPaymentSheetIntent: jest.fn(async () => ({ request: {}, intent: { status: "succeeded" } })),
  createSubscriptionPlan: jest.fn(async () => ({ id: 1 })),
  updateSubscriptionPlan: jest.fn(async () => ({ id: 1 })),
  listSubscriptionRequests: jest.fn(async () => []),
  approveSubscriptionRequest: jest.fn(async () => ({ requestId: 1, status: "approved" })),
  updateSubscriptionRequestStatus: jest.fn(async () => ({ requestId: 1, status: "rejected" })),
  updateRequestFromStripeSession: jest.fn(async () => ({})),
}));

jest.mock("../src/services/admin.service", () => ({
  listUsers: jest.fn(async () => []),
  getUserOnboarding: jest.fn(async () => ({ guardian: { id: 1 }, athlete: { id: 1 } })),
  updateAthleteProgramTier: jest.fn(async () => ({ id: 1 })),
  assignEnrollment: jest.fn(async () => ({ id: 1 })),
  createProgramTemplate: jest.fn(async () => ({ id: 1 })),
  createExercise: jest.fn(async () => ({ id: 1 })),
  createSession: jest.fn(async () => ({ id: 1 })),
  addExerciseToSession: jest.fn(async () => ({ id: 1 })),
  deleteSessionExercise: jest.fn(async () => ({ id: 1 })),
  listBookingsAdmin: jest.fn(async () => []),
  listMessageThreadsAdmin: jest.fn(async () => []),
  listThreadMessagesAdmin: jest.fn(async () => []),
  markThreadReadAdmin: jest.fn(async () => 0),
  sendMessageAdmin: jest.fn(async () => ({ id: 1 })),
  getAdminProfile: jest.fn(async () => ({ user: { id: 1 }, settings: {} })),
  updateAdminProfile: jest.fn(async () => ({ user: { id: 1 }, settings: {} })),
  updateAdminPreferences: jest.fn(async () => ({ user: { id: 1 }, settings: {} })),
  getDashboardMetrics: jest.fn(async () => ({})),
  getOnboardingConfig: jest.fn(async () => ({ id: 1 })),
  updateOnboardingConfig: jest.fn(async () => ({ id: 1 })),
  listVideoUploadsAdmin: jest.fn(async () => []),
  setUserBlocked: jest.fn(async () => ({ id: 1 })),
  softDeleteUser: jest.fn(async () => ({ id: 1 })),
  listAvailabilityAdmin: jest.fn(async () => []),
  listExercises: jest.fn(async () => []),
  updateExercise: jest.fn(async () => ({ id: 1 })),
  deleteExercise: jest.fn(async () => ({ id: 1 })),
}));

describe("API routes", () => {
  const app = createApp();

  it("GET /api/health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("POST /api/auth/register", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "test@example.com", password: "Password123", name: "Test" });
    expect(res.status).toBe(201);
    expect(res.body.userSub).toBe("sub");
  });

  it("POST /api/auth/confirm", async () => {
    const res = await request(app).post("/api/auth/confirm").send({ email: "test@example.com", code: "123456" });
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/resend", async () => {
    const res = await request(app).post("/api/auth/resend").send({ email: "test@example.com" });
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/login", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "test@example.com", password: "Password123" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe("token");
  });

  it("POST /api/auth/refresh", async () => {
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken: "refresh" });
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/forgot", async () => {
    const res = await request(app).post("/api/auth/forgot").send({ email: "test@example.com" });
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/forgot/confirm", async () => {
    const res = await request(app)
      .post("/api/auth/forgot/confirm")
      .send({ email: "test@example.com", code: "123456", password: "Password123" });
    expect(res.status).toBe(200);
  });

  it("GET /api/auth/me", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("POST /api/auth/change-password", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", "Bearer token")
      .send({ oldPassword: "Password123", newPassword: "Password234" });
    expect(res.status).toBe(200);
  });

  it("POST /api/onboarding", async () => {
    const res = await request(app)
      .post("/api/onboarding")
      .send({
        athleteName: "Athlete",
        age: 12,
        team: "Team",
        trainingPerWeek: 3,
        growthNotes: null,
        parentEmail: "parent@example.com",
        desiredProgramType: "PHP",
        termsVersion: "v1",
        privacyVersion: "v1",
        appVersion: "1.0.0",
      });
    expect(res.status).toBe(200);
  });

  it("GET /api/onboarding", async () => {
    const res = await request(app).get("/api/onboarding");
    expect(res.status).toBe(200);
  });

  it("GET /api/onboarding/config", async () => {
    const res = await request(app).get("/api/onboarding/config");
    expect(res.status).toBe(200);
  });

  it("GET /api/programs", async () => {
    const res = await request(app).get("/api/programs");
    expect(res.status).toBe(200);
  });

  it("GET /api/programs/1", async () => {
    const res = await request(app).get("/api/programs/1");
    expect(res.status).toBe(200);
  });

  it("GET /api/programs/1/sessions", async () => {
    const res = await request(app).get("/api/programs/1/sessions");
    expect(res.status).toBe(200);
  });

  it("GET /api/programs/exercises", async () => {
    const res = await request(app).get("/api/programs/exercises");
    expect(res.status).toBe(200);
  });

  it("GET /api/content/home", async () => {
    const res = await request(app).get("/api/content/home");
    expect(res.status).toBe(200);
  });

  it("GET /api/content/parent-platform", async () => {
    const res = await request(app).get("/api/content/parent-platform");
    expect(res.status).toBe(200);
  });

  it("GET /api/content/parent-courses", async () => {
    const res = await request(app).get("/api/content/parent-courses");
    expect(res.status).toBe(200);
  });

  it("GET /api/content/parent-courses/1", async () => {
    const res = await request(app).get("/api/content/parent-courses/1");
    expect(res.status).toBe(200);
  });

  it("GET /api/content/1", async () => {
    const res = await request(app).get("/api/content/1");
    expect(res.status).toBe(200);
  });

  it("POST /api/content", async () => {
    const res = await request(app)
      .post("/api/content")
      .send({ title: "Title", content: "Body", type: "article", surface: "home" });
    expect(res.status).toBe(201);
  });

  it("PUT /api/content/1", async () => {
    const res = await request(app)
      .put("/api/content/1")
      .send({ title: "Title", content: "Body", type: "article" });
    expect(res.status).toBe(200);
  });

  it("POST /api/content/parent-courses", async () => {
    const res = await request(app).post("/api/content/parent-courses").send({
      title: "Course",
      summary: "Summary",
      category: "Growth and maturation",
      modules: [{ id: "mod-1", title: "Intro", type: "article", order: 0, content: "Text" }],
    });
    expect(res.status).toBe(201);
  });

  it("PUT /api/content/parent-courses/1", async () => {
    const res = await request(app).put("/api/content/parent-courses/1").send({
      title: "Course",
      summary: "Summary",
      category: "Growth and maturation",
      modules: [{ id: "mod-1", title: "Intro", type: "article", order: 0, content: "Text" }],
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/messages", async () => {
    const res = await request(app).get("/api/messages");
    expect(res.status).toBe(200);
  });

  it("POST /api/messages", async () => {
    const res = await request(app).post("/api/messages").send({ content: "Hi" });
    expect(res.status).toBe(201);
  });

  it("POST /api/messages/read", async () => {
    const res = await request(app).post("/api/messages/read");
    expect(res.status).toBe(200);
  });

  it("PUT /api/messages/1/reactions", async () => {
    const res = await request(app).put("/api/messages/1/reactions").send({ emoji: "ok" });
    expect(res.status).toBe(200);
  });

  it("GET /api/chat/groups", async () => {
    const res = await request(app).get("/api/chat/groups");
    expect(res.status).toBe(200);
  });

  it("POST /api/chat/groups", async () => {
    const res = await request(app).post("/api/chat/groups").send({ name: "Group", memberIds: [2] });
    expect(res.status).toBe(201);
  });

  it("GET /api/chat/groups/1/members", async () => {
    const res = await request(app).get("/api/chat/groups/1/members");
    expect(res.status).toBe(200);
  });

  it("POST /api/chat/groups/1/members", async () => {
    const res = await request(app).post("/api/chat/groups/1/members").send({ memberIds: [2] });
    expect(res.status).toBe(200);
  });

  it("GET /api/chat/groups/1/messages", async () => {
    const res = await request(app).get("/api/chat/groups/1/messages");
    expect(res.status).toBe(200);
  });

  it("POST /api/chat/groups/1/messages", async () => {
    const res = await request(app).post("/api/chat/groups/1/messages").send({ content: "Hello" });
    expect(res.status).toBe(201);
  });

  it("PUT /api/chat/groups/1/messages/1/reactions", async () => {
    const res = await request(app).put("/api/chat/groups/1/messages/1/reactions").send({ emoji: "ok" });
    expect(res.status).toBe(200);
  });

  it("GET /api/bookings/services", async () => {
    const res = await request(app).get("/api/bookings/services");
    expect(res.status).toBe(200);
  });

  it("POST /api/bookings/services", async () => {
    const res = await request(app).post("/api/bookings/services").send({ name: "Call", type: "group_call", durationMinutes: 30 });
    expect(res.status).toBe(201);
  });

  it("PATCH /api/bookings/services/1", async () => {
    const res = await request(app).patch("/api/bookings/services/1").send({ name: "Updated Call" });
    expect(res.status).toBe(200);
  });

  it("GET /api/bookings/availability", async () => {
    const res = await request(app).get("/api/bookings/availability").query({ serviceTypeId: 1, from: new Date().toISOString(), to: new Date().toISOString() });
    expect(res.status).toBe(200);
  });

  it("POST /api/bookings/availability", async () => {
    const res = await request(app)
      .post("/api/bookings/availability")
      .send({ serviceTypeId: 1, startsAt: new Date().toISOString(), endsAt: new Date().toISOString() });
    expect(res.status).toBe(201);
  });

  it("POST /api/bookings", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .send({ serviceTypeId: 1, startsAt: new Date().toISOString(), endsAt: new Date().toISOString() });
    expect(res.status).toBe(201);
  });

  it("GET /api/bookings", async () => {
    const res = await request(app).get("/api/bookings");
    expect(res.status).toBe(200);
  });

  it("POST /api/videos/presign", async () => {
    const res = await request(app)
      .post("/api/videos/presign")
      .send({ key: "videos/test.mp4", contentType: "video/mp4", sizeBytes: 1024 });
    expect(res.status).toBe(200);
  });

  it("GET /api/videos", async () => {
    const res = await request(app).get("/api/videos");
    expect(res.status).toBe(200);
  });

  it("POST /api/videos", async () => {
    const res = await request(app).post("/api/videos").send({ videoUrl: "https://example.com/video.mp4" });
    expect(res.status).toBe(201);
  });

  it("POST /api/videos/review", async () => {
    const res = await request(app).post("/api/videos/review").send({ uploadId: 1, feedback: "Looks good" });
    expect(res.status).toBe(200);
  });

  it("POST /api/media/signed-url", async () => {
    const res = await request(app).post("/api/media/signed-url").send({ path: "media/test.png", expiresInSeconds: 900 });
    expect(res.status).toBe(200);
  });

  it("POST /api/media/presign", async () => {
    const res = await request(app)
      .post("/api/media/presign")
      .send({ folder: "media", fileName: "file.png", contentType: "image/png", sizeBytes: 1024 });
    expect(res.status).toBe(200);
  });

  it("GET /api/public/plans", async () => {
    const res = await request(app).get("/api/public/plans");
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

  it("GET /api/billing/status", async () => {
    const res = await request(app).get("/api/billing/status");
    expect(res.status).toBe(200);
  });

  it("POST /api/billing/checkout", async () => {
    const res = await request(app).post("/api/billing/checkout").send({ planId: 1, interval: "monthly" });
    expect(res.status).toBe(200);
  });

  it("POST /api/billing/payment-sheet", async () => {
    const res = await request(app).post("/api/billing/payment-sheet").send({ planId: 1, interval: "monthly" });
    expect(res.status).toBe(200);
  });

  it("POST /api/billing/payment-sheet/confirm", async () => {
    const res = await request(app).post("/api/billing/payment-sheet/confirm").send({ paymentIntentId: "pi_1" });
    expect(res.status).toBe(200);
  });

  it("POST /api/billing/confirm", async () => {
    const res = await request(app).post("/api/billing/confirm").send({ sessionId: "sess_1" });
    expect(res.status).toBe(200);
  });

  it("POST /api/billing/downgrade", async () => {
    const res = await request(app).post("/api/billing/downgrade").send({ tier: "PHP_Premium_Plus" });
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/subscription-plans", async () => {
    const res = await request(app).get("/api/admin/subscription-plans");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/subscription-plans", async () => {
    const res = await request(app).post("/api/admin/subscription-plans").send({
      name: "Plan",
      tier: "PHP",
      displayPrice: "$10",
      billingInterval: "monthly",
    });
    expect(res.status).toBe(201);
  });

  it("PUT /api/admin/subscription-plans/1", async () => {
    const res = await request(app).put("/api/admin/subscription-plans/1").send({ displayPrice: "$12" });
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/subscription-requests", async () => {
    const res = await request(app).get("/api/admin/subscription-requests");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/subscription-requests/1/approve", async () => {
    const res = await request(app).post("/api/admin/subscription-requests/1/approve");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/subscription-requests/1/reject", async () => {
    const res = await request(app).post("/api/admin/subscription-requests/1/reject");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/users", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/users/1/block", async () => {
    const res = await request(app).post("/api/admin/users/1/block").send({ blocked: true });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/admin/users/1", async () => {
    const res = await request(app).delete("/api/admin/users/1");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/dashboard", async () => {
    const res = await request(app).get("/api/admin/dashboard");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/profile", async () => {
    const res = await request(app).get("/api/admin/profile");
    expect(res.status).toBe(200);
  });

  it("PUT /api/admin/profile", async () => {
    const res = await request(app)
      .put("/api/admin/profile")
      .send({ name: "Admin", email: "admin@example.com" });
    expect(res.status).toBe(200);
  });

  it("PUT /api/admin/preferences", async () => {
    const res = await request(app).put("/api/admin/preferences").send({
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
    const res = await request(app).get("/api/admin/onboarding-config");
    expect(res.status).toBe(200);
  });

  it("PUT /api/admin/onboarding-config", async () => {
    const res = await request(app).put("/api/admin/onboarding-config").send({
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
    const res = await request(app).get("/api/admin/bookings");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/availability", async () => {
    const res = await request(app).get("/api/admin/availability");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/users/1/onboarding", async () => {
    const res = await request(app).get("/api/admin/users/1/onboarding");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/videos", async () => {
    const res = await request(app).get("/api/admin/videos");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/messages/threads", async () => {
    const res = await request(app).get("/api/admin/messages/threads");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/messages/1", async () => {
    const res = await request(app).get("/api/admin/messages/1");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/messages/1", async () => {
    const res = await request(app).post("/api/admin/messages/1").send({ content: "Hello" });
    expect(res.status).toBe(201);
  });

  it("POST /api/admin/messages/1/read", async () => {
    const res = await request(app).post("/api/admin/messages/1/read");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/users/program-tier", async () => {
    const res = await request(app).post("/api/admin/users/program-tier").send({ athleteId: 1, programTier: "PHP" });
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/enrollments", async () => {
    const res = await request(app).post("/api/admin/enrollments").send({ athleteId: 1, programType: "PHP" });
    expect(res.status).toBe(201);
  });

  it("POST /api/admin/programs", async () => {
    const res = await request(app).post("/api/admin/programs").send({ name: "Template", type: "PHP" });
    expect(res.status).toBe(201);
  });

  it("POST /api/admin/exercises", async () => {
    const res = await request(app).post("/api/admin/exercises").send({ name: "Squat" });
    expect(res.status).toBe(201);
  });

  it("GET /api/admin/exercises", async () => {
    const res = await request(app).get("/api/admin/exercises");
    expect(res.status).toBe(200);
  });

  it("PATCH /api/admin/exercises/1", async () => {
    const res = await request(app).patch("/api/admin/exercises/1").send({ name: "Updated Squat" });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/admin/exercises/1", async () => {
    const res = await request(app).delete("/api/admin/exercises/1");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/sessions", async () => {
    const res = await request(app).post("/api/admin/sessions").send({ programId: 1, weekNumber: 1, sessionNumber: 1, type: "program" });
    expect(res.status).toBe(201);
  });

  it("POST /api/admin/session-exercises", async () => {
    const res = await request(app).post("/api/admin/session-exercises").send({ sessionId: 1, exerciseId: 1, order: 1 });
    expect(res.status).toBe(201);
  });

  it("DELETE /api/admin/session-exercises/:sessionExerciseId", async () => {
    const res = await request(app).delete("/api/admin/session-exercises/1");
    expect(res.status).toBe(200);
  });
});
