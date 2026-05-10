// ── Drizzle mock helpers ──────────────────────────────────────────────────────
// We need a chainable builder that resolves to arrays returned by mockReturnValue.
// Each call to db.select/insert/update returns a fresh chain object.

type ChainNode = Record<string, (...args: any[]) => ChainNode | Promise<any[]>>;

function makeChain(resolvedValue: any[]): ChainNode {
  const chain: ChainNode = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          // Make the chain itself a thenable so `await db.select()...` works
          // when the last method in the chain returns the chain itself.
          return (resolve: (v: any) => any) => Promise.resolve(resolvedValue).then(resolve);
        }
        return (..._args: any[]) => chain;
      },
    },
  );
  return chain;
}

// db mock — we rebuild the mock before each test
const mockSelectChainValue: { value: any[] } = { value: [] };
const selectCallValues: any[][] = [];
let selectCallIndex = 0;

const mockDbSelect = jest.fn();
const mockDbInsert = jest.fn();
const mockDbUpdate = jest.fn();

jest.mock("../../src/db", () => ({
  db: {
    select: (...args: any[]) => mockDbSelect(...args),
    insert: (...args: any[]) => mockDbInsert(...args),
    update: (...args: any[]) => mockDbUpdate(...args),
  },
}));

// Schema proxy — column references resolve to themselves without throwing
jest.mock("../../src/db/schema", () => {
  function makeTable(): Record<string, unknown> {
    const col = {};
    return new Proxy(col, { get: () => col });
  }
  return new Proxy(
    {},
    {
      get(_t, name) {
        if (name === "__esModule") return false;
        return makeTable();
      },
    },
  );
});

// drizzle-orm operators — return something truthy
jest.mock("drizzle-orm", () => ({
  eq: jest.fn((_a: any, _b: any) => ({ op: "eq" })),
  and: jest.fn((...args: any[]) => ({ op: "and", args })),
  desc: jest.fn((col: any) => col),
  count: jest.fn(() => ({ op: "count" })),
  inArray: jest.fn((_col: any, vals: any[]) => ({ op: "inArray", vals })),
  sql: jest.fn((strings: TemplateStringsArray) => strings[0]),
}));

// Socket-hub mock
const mockEmit = jest.fn();
const mockTo = jest.fn(() => ({ emit: mockEmit }));
const mockGetSocketServer = jest.fn<any, []>(() => ({ to: mockTo }));

jest.mock("../../src/socket-hub", () => ({
  getSocketServer: () => mockGetSocketServer(),
}));

// node:crypto — deterministic, so password hashing doesn't fail
jest.mock("node:crypto", () => ({
  randomBytes: () => Buffer.from("0".repeat(32), "ascii"),
  scryptSync: () => Buffer.from("0".repeat(128), "ascii"),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Queue successive db.select() call results */
function queueSelects(...rows: any[][]) {
  let call = 0;
  mockDbSelect.mockImplementation(() => {
    const value = rows[call] ?? [];
    call++;
    return makeChain(value);
  });
}

/** Make db.insert().values().returning() resolve to `rows` */
function mockInsert(rows: any[]) {
  const chain = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") return (resolve: (v: any) => any) => Promise.resolve(rows).then(resolve);
        return (..._args: any[]) => chain;
      },
    },
  );
  mockDbInsert.mockReturnValue(chain);
}

/** Make db.update()...where(...) resolve with undefined (fire-and-forget) */
function mockUpdate() {
  const chain = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") return (resolve: (v: any) => any) => Promise.resolve(undefined).then(resolve);
        return (..._args: any[]) => chain;
      },
    },
  );
  mockDbUpdate.mockReturnValue(chain);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSocketServer.mockReturnValue({ to: mockTo });
});

// Lazy-import so mocks are installed before the module initialises
async function svc() {
  jest.resetModules();
  return import("../../src/services/guardian-portal.service");
}

// ── 1. getGuardianMe ──────────────────────────────────────────────────────────

describe("getGuardianMe", () => {
  it("returns user + guardian when both exist", async () => {
    const user = { id: 1, name: "Alice", email: "alice@example.com", role: "guardian" };
    const guardian = { id: 10, userId: 1, activeAthleteId: null };
    queueSelects([user], [guardian]);

    const { getGuardianMe } = await svc();
    const result = await getGuardianMe(1);

    expect(result).toMatchObject({ id: 1, name: "Alice", guardian: expect.objectContaining({ id: 10 }) });
  });

  it("returns null when user not found", async () => {
    queueSelects([], []);

    const { getGuardianMe } = await svc();
    const result = await getGuardianMe(99);

    expect(result).toBeNull();
  });

  it("returns user with guardian: null when guardian row missing", async () => {
    const user = { id: 2, name: "Bob", email: "bob@example.com", role: "guardian" };
    queueSelects([user], []);

    const { getGuardianMe } = await svc();
    const result = await getGuardianMe(2);

    expect(result).toMatchObject({ id: 2, guardian: null });
  });
});

// ── 2. getGuardianChildren ────────────────────────────────────────────────────

describe("getGuardianChildren", () => {
  it("returns { id: null, children: [] } when no guardian row", async () => {
    queueSelects([]);

    const { getGuardianChildren } = await svc();
    const result = await getGuardianChildren(1);

    expect(result).toEqual({ id: null, children: [] });
  });

  it("returns { id, children: [] } when guardian exists but no athletes", async () => {
    const guardian = { id: 5, userId: 1, activeAthleteId: null };
    // select guardian, then select athlete IDs (empty)
    queueSelects([guardian], []);

    const { getGuardianChildren } = await svc();
    const result = await getGuardianChildren(1);

    expect(result).toEqual({ id: 5, children: [] });
  });

  it("returns children array when athletes exist", async () => {
    const guardian = { id: 5, userId: 1, activeAthleteId: null };
    const athleteIds = [{ id: 20 }, { id: 21 }];
    const athletes = [
      { id: 20, name: "Kid A", age: 10, athleteType: "youth", teamId: null, teamName: null, currentProgramTier: null, currentPlanId: null, performanceGoals: null },
      { id: 21, name: "Kid B", age: 12, athleteType: "youth", teamId: null, teamName: null, currentProgramTier: null, currentPlanId: null, performanceGoals: null },
    ];
    queueSelects([guardian], athleteIds, athletes);

    const { getGuardianChildren } = await svc();
    const result = await getGuardianChildren(1);

    expect(result.id).toBe(5);
    expect((result.children as any[]).length).toBe(2);
  });
});

// ── 3. getGuardianChild ───────────────────────────────────────────────────────

describe("getGuardianChild", () => {
  it("returns null when guardian row not found", async () => {
    queueSelects([]);

    const { getGuardianChild } = await svc();
    const result = await getGuardianChild(1, 20);

    expect(result).toBeNull();
  });

  it("returns null when athlete not found", async () => {
    const guardian = { id: 5, userId: 1, activeAthleteId: null };
    queueSelects([guardian], []);

    const { getGuardianChild } = await svc();
    const result = await getGuardianChild(1, 99);

    expect(result).toBeNull();
  });

  it("returns 'forbidden' when athlete doesn't belong to guardian", async () => {
    const guardian = { id: 5, userId: 1, activeAthleteId: null };
    const athlete = { id: 20, name: "Other Kid", age: 9, athleteType: "youth", teamName: null, currentProgramTier: null, performanceGoals: null, injuries: null };
    // guardian row, athlete row, ownership check (empty = not owned)
    queueSelects([guardian], [athlete], []);

    const { getGuardianChild } = await svc();
    const result = await getGuardianChild(1, 20);

    expect(result).toBe("forbidden");
  });

  it("returns athlete data when athlete is owned via activeAthleteId", async () => {
    const guardian = { id: 5, userId: 1, activeAthleteId: 20 };
    const athlete = { id: 20, name: "My Kid", age: 10, athleteType: "youth", teamName: null, currentProgramTier: null, performanceGoals: null, injuries: null };
    // After ownership confirmed via activeAthleteId, subsequent queries:
    // assignments, sessionCounts (none), completedCounts (none), logs
    queueSelects([guardian], [athlete], [], [], [], []);

    const { getGuardianChild } = await svc();
    const result = await getGuardianChild(1, 20);

    expect(result).not.toBeNull();
    expect(result).not.toBe("forbidden");
    expect((result as any).id).toBe(20);
    expect((result as any).name).toBe("My Kid");
  });
});

// ── 4. getGuardianChildAttendance ─────────────────────────────────────────────

describe("getGuardianChildAttendance", () => {
  it("returns 'forbidden' when no guardian row", async () => {
    queueSelects([]);

    const { getGuardianChildAttendance } = await svc();
    const result = await getGuardianChildAttendance(1, 20);

    expect(result).toBe("forbidden");
  });

  it("returns 'forbidden' when athlete doesn't belong to guardian", async () => {
    const guardian = { id: 5, userId: 1, activeAthleteId: null };
    const athlete = { id: 20, userId: 50, guardianId: 99 }; // different guardianId
    queueSelects([guardian], [athlete]);

    const { getGuardianChildAttendance } = await svc();
    const result = await getGuardianChildAttendance(1, 20);

    expect(result).toBe("forbidden");
  });

  it("returns null when athlete not found", async () => {
    const guardian = { id: 5, userId: 1, activeAthleteId: null };
    queueSelects([guardian], []);

    const { getGuardianChildAttendance } = await svc();
    const result = await getGuardianChildAttendance(1, 99);

    expect(result).toBeNull();
  });

  it("returns attendance summary when athlete is owned", async () => {
    const guardian = { id: 5, userId: 1, activeAthleteId: null };
    const athlete = { id: 20, userId: 50, guardianId: 5 };
    const rows = [
      { id: 1, status: "attended", checkInAt: null, markedAt: null, sessionId: 1, sessionName: "Session A", sessionType: "training", startsAt: new Date(), endsAt: new Date(), location: null },
      { id: 2, status: "missed", checkInAt: null, markedAt: null, sessionId: 2, sessionName: "Session B", sessionType: "training", startsAt: new Date(), endsAt: new Date(), location: null },
    ];
    queueSelects([guardian], [athlete], rows);

    const { getGuardianChildAttendance } = await svc();
    const result = await getGuardianChildAttendance(1, 20);

    expect(result).not.toBeNull();
    expect(result).not.toBe("forbidden");
    const r = result as any;
    expect(r.summary.total).toBe(2);
    expect(r.summary.attended).toBe(1);
    expect(r.summary.missed).toBe(1);
    expect(r.summary.rate).toBe(50);
  });
});

// ── 5. patchGuardianChildMedical ──────────────────────────────────────────────

describe("patchGuardianChildMedical", () => {
  it("returns 'forbidden' when no guardian row", async () => {
    queueSelects([]);
    mockUpdate();

    const { patchGuardianChildMedical } = await svc();
    const result = await patchGuardianChildMedical(1, 20, "sprained ankle");

    expect(result).toBe("forbidden");
  });

  it("returns 'forbidden' when athlete doesn't belong to guardian", async () => {
    const guardian = { id: 5, userId: 1, activeAthleteId: null };
    const athlete = { id: 20, guardianId: 99 }; // not owned
    queueSelects([guardian], [athlete]);
    mockUpdate();

    const { patchGuardianChildMedical } = await svc();
    const result = await patchGuardianChildMedical(1, 20, "injury");

    expect(result).toBe("forbidden");
  });

  it("returns null when athlete not found", async () => {
    const guardian = { id: 5, userId: 1, activeAthleteId: null };
    queueSelects([guardian], []);
    mockUpdate();

    const { patchGuardianChildMedical } = await svc();
    const result = await patchGuardianChildMedical(1, 99, "injury");

    expect(result).toBeNull();
  });

  it("returns { ok: true } when athlete is owned and update succeeds", async () => {
    const guardian = { id: 5, userId: 1, activeAthleteId: null };
    const athlete = { id: 20, guardianId: 5 };
    queueSelects([guardian], [athlete]);
    mockUpdate();

    const { patchGuardianChildMedical } = await svc();
    const result = await patchGuardianChildMedical(1, 20, "knee pain");

    expect(result).toEqual({ ok: true });
    expect(mockDbUpdate).toHaveBeenCalled();
  });
});

// ── 6. createFeedbackThread ───────────────────────────────────────────────────

describe("createFeedbackThread", () => {
  it("emits guardian:feedback:new socket event with correct payload", async () => {
    const thread = { id: 42, subject: "Need help", status: "open" };
    const reply = { id: 100, feedbackId: 42, senderId: 1, content: "Hello" };

    let insertCall = 0;
    mockDbInsert.mockImplementation(() => {
      const rows = insertCall === 0 ? [thread] : [reply];
      insertCall++;
      return makeChain(rows);
    });

    const { createFeedbackThread } = await svc();
    const result = await createFeedbackThread(1, "Need help", "Hello");

    expect(mockTo).toHaveBeenCalledWith("admin:all");
    expect(mockEmit).toHaveBeenCalledWith("guardian:feedback:new", {
      feedbackId: 42,
      subject: "Need help",
      guardianUserId: 1,
    });
    expect((result as any).id).toBe(42);
    expect((result as any).replies).toHaveLength(1);
  });

  it("returns thread with reply even when socket server is null", async () => {
    mockGetSocketServer.mockReturnValue(null);

    const thread = { id: 43, subject: "Question", status: "open" };
    const reply = { id: 101, feedbackId: 43, senderId: 2, content: "Hi" };

    let insertCall = 0;
    mockDbInsert.mockImplementation(() => {
      const rows = insertCall === 0 ? [thread] : [reply];
      insertCall++;
      return makeChain(rows);
    });

    const { createFeedbackThread } = await svc();
    const result = await createFeedbackThread(2, "Question", "Hi");

    expect(mockEmit).not.toHaveBeenCalled();
    expect((result as any).id).toBe(43);
  });
});

// ── 7. replyToFeedback ────────────────────────────────────────────────────────

describe("replyToFeedback", () => {
  it("returns null when thread not found (guardianUserId mismatch)", async () => {
    // Thread select returns empty — thread belongs to a different user
    queueSelects([]);

    const { replyToFeedback } = await svc();
    const result = await replyToFeedback(1, 42, "my reply");

    expect(result).toBeNull();
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it("inserts reply and emits socket event when thread is found", async () => {
    const thread = { id: 42 };
    const reply = { id: 200, feedbackId: 42, senderId: 1, content: "my reply" };

    queueSelects([thread]);
    let insertCall = 0;
    mockDbInsert.mockImplementation(() => {
      const rows = [reply];
      insertCall++;
      return makeChain(rows);
    });
    mockUpdate();

    const { replyToFeedback } = await svc();
    const result = await replyToFeedback(1, 42, "my reply");

    expect(result).toEqual(reply);
    expect(mockTo).toHaveBeenCalledWith("admin:all");
    expect(mockEmit).toHaveBeenCalledWith("guardian:feedback:reply", { feedbackId: 42, reply });
  });
});

// ── 8. adminReplyToFeedback ───────────────────────────────────────────────────

describe("adminReplyToFeedback", () => {
  it("returns null when feedback thread not found", async () => {
    queueSelects([]);

    const { adminReplyToFeedback } = await svc();
    const result = await adminReplyToFeedback(99, 999, "hello");

    expect(result).toBeNull();
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it("emits guardian:feedback:reply to the correct user room", async () => {
    const thread = { id: 10, guardianUserId: 55 };
    const reply = { id: 300, feedbackId: 10, senderId: 99, content: "Admin response" };

    queueSelects([thread]);
    mockDbInsert.mockImplementation(() => makeChain([reply]));
    mockUpdate();

    const { adminReplyToFeedback } = await svc();
    const result = await adminReplyToFeedback(99, 10, "Admin response");

    expect(result).toEqual(reply);
    expect(mockTo).toHaveBeenCalledWith("user:55");
    expect(mockEmit).toHaveBeenCalledWith("guardian:feedback:reply", { feedbackId: 10, reply });
  });
});
