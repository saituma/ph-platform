const mockDb = {
  execSync: jest.fn(),
  getAllSync: jest.fn().mockReturnValue([]),
  runSync: jest.fn(),
  getFirstSync: jest.fn().mockReturnValue(null),
};
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn().mockReturnValue(mockDb),
}));
jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/store", () => ({
  store: { getState: jest.fn() },
}));

import { apiRequest } from "@/lib/api";
import { store } from "@/store";

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockedGetState = store.getState as jest.MockedFunction<typeof store.getState>;

/** Rows returned for the pending-deletions SELECT; every other query returns []. */
function withPendingDeletions(ids: string[]) {
  mockDb.getAllSync.mockImplementation((sql: string) =>
    sql.includes("FROM run_deletions") ? ids.map((id) => ({ id })) : [],
  );
}

function deletedIds(): string[] {
  return mockDb.runSync.mock.calls
    .filter(([sql]) => typeof sql === "string" && sql.startsWith("DELETE FROM run_deletions"))
    .map(([, params]) => (params as string[])[0]);
}

describe("runSync — discard propagation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.getAllSync.mockReturnValue([]);
    mockedGetState.mockReturnValue({
      user: { token: "t0ken", profile: { id: 7 } },
    } as unknown as ReturnType<typeof store.getState>);
  });

  it("deletes the run on the server and clears the tombstone", async () => {
    withPendingDeletions(["run-a"]);
    mockedApiRequest.mockResolvedValue({ ok: true } as never);

    const { pushRunDeletionsToCloud } = require("@/lib/runSync");
    await pushRunDeletionsToCloud();

    expect(mockedApiRequest).toHaveBeenCalledWith("/runs/run-a", expect.objectContaining({ method: "DELETE" }));
    expect(deletedIds()).toEqual(["run-a"]);
  });

  it("clears the tombstone when the server says the run is already gone (404)", async () => {
    withPendingDeletions(["run-b"]);
    mockedApiRequest.mockRejectedValue(new Error("404 Run not found"));

    const { pushRunDeletionsToCloud } = require("@/lib/runSync");
    await pushRunDeletionsToCloud();

    // Idempotent: a retry must not requeue forever just because the run is already deleted.
    expect(deletedIds()).toEqual(["run-b"]);
  });

  it("KEEPS the tombstone when offline, so the discard is retried later", async () => {
    withPendingDeletions(["run-c"]);
    mockedApiRequest.mockRejectedValue(new Error("Network request failed"));

    const { pushRunDeletionsToCloud } = require("@/lib/runSync");
    await pushRunDeletionsToCloud();

    // This is the property that keeps a discarded run from living on the coach's
    // dashboard forever: a failed delete must stay queued.
    expect(deletedIds()).toEqual([]);
  });

  it("keeps the tombstone on a server error (5xx)", async () => {
    withPendingDeletions(["run-d"]);
    mockedApiRequest.mockRejectedValue(new Error("500 Internal Server Error"));

    const { pushRunDeletionsToCloud } = require("@/lib/runSync");
    await pushRunDeletionsToCloud();

    expect(deletedIds()).toEqual([]);
  });

  it("does nothing when signed out", async () => {
    withPendingDeletions(["run-e"]);
    mockedGetState.mockReturnValue({
      user: { token: null, profile: { id: null } },
    } as unknown as ReturnType<typeof store.getState>);

    const { pushRunDeletionsToCloud } = require("@/lib/runSync");
    await pushRunDeletionsToCloud();

    expect(mockedApiRequest).not.toHaveBeenCalled();
  });
});
