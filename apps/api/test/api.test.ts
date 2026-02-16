import request from "supertest";

import { createApp } from "../src/app";

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
  startForgotPassword: jest.fn(async () => ({ CodeDeliveryDetails: { Destination: "test@example.com" } })),
  confirmForgotPassword: jest.fn(async () => ({})),
}));

jest.mock("../src/services/onboarding.service", () => ({
  submitOnboarding: jest.fn(async () => ({ athleteId: 1, status: "active" })),
  getOnboardingByUser: jest.fn(async () => ({ id: 1 })),
}));

jest.mock("../src/services/program.service", () => ({
  getProgramCards: jest.fn(async () => [{ type: "PHP", status: "active" }]),
  getProgramById: jest.fn(async () => ({ id: 1, name: "Program" })),
  getProgramSessions: jest.fn(async () => []),
  getExerciseLibrary: jest.fn(async () => []),
}));

jest.mock("../src/services/content.service", () => ({
  getHomeContent: jest.fn(async () => []),
  getParentPlatformContent: jest.fn(async () => []),
  createContent: jest.fn(async () => ({ id: 1 })),
}));

jest.mock("../src/services/message.service", () => ({
  listThread: jest.fn(async () => []),
  sendMessage: jest.fn(async () => ({ id: 1 })),
  markThreadRead: jest.fn(async () => 1),
  getCoachUser: jest.fn(async () => ({ id: 2 })),
}));

jest.mock("../src/services/user.service", () => ({
  getGuardianAndAthlete: jest.fn(async () => ({ guardian: { id: 1 }, athlete: { id: 1 } })),
}));

jest.mock("../src/services/booking.service", () => ({
  listServiceTypes: jest.fn(async () => []),
  createServiceType: jest.fn(async () => ({ id: 1 })),
  listAvailabilityBlocks: jest.fn(async () => []),
  createAvailabilityBlock: jest.fn(async () => ({ id: 1 })),
  createBooking: jest.fn(async () => ({ id: 1 })),
  listBookingsForUser: jest.fn(async () => []),
}));

jest.mock("../src/services/s3.service", () => ({
  getPresignedUploadUrl: jest.fn(async () => "https://s3.test/upload"),
}));

jest.mock("../src/services/video.service", () => ({
  createVideoUpload: jest.fn(async () => ({ id: 1 })),
  listVideoUploadsByAthlete: jest.fn(async () => []),
  reviewVideoUpload: jest.fn(async () => ({ id: 1 })),
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

  it("POST /api/onboarding", async () => {
    const res = await request(app)
      .post("/api/onboarding")
      .send({
        athleteName: "Athlete",
        age: 12,
        team: "Team",
        trainingPerWeek: 3,
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

  it("POST /api/content", async () => {
    const res = await request(app)
      .post("/api/content")
      .send({ title: "Title", content: "Body", type: "article", surface: "home" });
    expect(res.status).toBe(201);
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

  it("GET /api/bookings/services", async () => {
    const res = await request(app).get("/api/bookings/services");
    expect(res.status).toBe(200);
  });

  it("POST /api/bookings/services", async () => {
    const res = await request(app).post("/api/bookings/services").send({ name: "Call", type: "group_call", durationMinutes: 30 });
    expect(res.status).toBe(201);
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

  it("GET /api/admin/users", async () => {
    const res = await request(app).get("/api/admin/users");
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
