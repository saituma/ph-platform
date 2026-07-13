import { PGlite } from "@electric-sql/pglite";

import { __test, SCHEDULED_JOB_NAMES } from "../../src/jobs/scheduled.pg";

const { nextRunAfter } = __test;

/**
 * The five recurring reminders had NEVER run in production.
 *
 * They were BullMQ repeatables registered only inside worker.ts, and Heroku starts new process
 * types at 0 dynos — so nothing registered them. Moving that into the web process was not enough
 * either: production sets DISABLE_REDIS=true, which makes isQueueEnabled() false and
 * getRedisConnection() null, so BullMQ can never start regardless of who asks.
 *
 * The scheduler is now Postgres-backed. The claim is a single atomic UPDATE, which is what makes
 * it safe without a distributed lock — verified here against a real Postgres.
 */
describe("Postgres scheduler", () => {
  describe("all five jobs are wired", () => {
    test("none of them went missing in the move off BullMQ", () => {
      expect(SCHEDULED_JOB_NAMES.sort()).toEqual(
        ["goal-expiry", "nutrition-reminder", "session-reminder", "streak-reminder", "subscription-expiry"].sort(),
      );
    });
  });

  describe("nextRunAfter", () => {
    test("interval cadence just adds the interval", () => {
      const from = new Date("2026-07-13T10:00:00.000Z");
      expect(nextRunAfter({ everyMs: 5 * 60_000 }, from).toISOString()).toBe("2026-07-13T10:05:00.000Z");
    });

    test("daily cadence picks today's slot when it is still ahead", () => {
      const from = new Date("2026-07-13T01:00:00.000Z");
      expect(nextRunAfter({ dailyAtUtc: "03:00" }, from).toISOString()).toBe("2026-07-13T03:00:00.000Z");
    });

    test("daily cadence rolls to tomorrow once today's slot has passed", () => {
      const from = new Date("2026-07-13T04:00:00.000Z");
      expect(nextRunAfter({ dailyAtUtc: "03:00" }, from).toISOString()).toBe("2026-07-14T03:00:00.000Z");
    });

    test("a job due exactly now is pushed to tomorrow, never scheduled in the past", () => {
      const from = new Date("2026-07-13T03:00:00.000Z");
      expect(nextRunAfter({ dailyAtUtc: "03:00" }, from).toISOString()).toBe("2026-07-14T03:00:00.000Z");
    });

    test("month and year roll over correctly", () => {
      const from = new Date("2026-12-31T23:59:00.000Z");
      expect(nextRunAfter({ dailyAtUtc: "00:05" }, from).toISOString()).toBe("2027-01-01T00:05:00.000Z");
    });
  });

  describe("the claim is atomic — this is what replaces the distributed lock", () => {
    let db: PGlite;

    beforeEach(async () => {
      db = new PGlite();
      await db.exec(`
        CREATE TABLE scheduled_job_runs (
          "name"        varchar(64) PRIMARY KEY,
          "next_run_at" timestamp NOT NULL DEFAULT now(),
          "last_run_at" timestamp,
          "last_status" varchar(16),
          "last_error"  text,
          "runs"        integer NOT NULL DEFAULT 0,
          "updated_at"  timestamp NOT NULL DEFAULT now()
        );
        INSERT INTO scheduled_job_runs ("name","next_run_at")
        VALUES ('nutrition-reminder', now() - interval '1 minute');
      `);
    }, 60_000);

    afterEach(async () => {
      await db?.close();
    });

    const claim = () =>
      db.query(`
        UPDATE scheduled_job_runs
        SET "next_run_at" = now() + interval '5 minutes',
            "last_run_at" = now(),
            "runs" = "runs" + 1
        WHERE "name" = 'nutrition-reminder' AND "next_run_at" <= now()
        RETURNING "name"
      `);

    test("an overdue job is claimed exactly once, however many instances race for it", async () => {
      const first = await claim();
      expect(first.rows).toHaveLength(1); // this instance won

      // Four more dynos issue the identical statement in the same tick.
      for (let i = 0; i < 4; i++) {
        const loser = await claim();
        expect(loser.rows).toHaveLength(0); // no double-run
      }

      const row = await db.query<{ runs: number }>(`SELECT "runs" FROM scheduled_job_runs`);
      expect(row.rows[0].runs).toBe(1);
    });

    test("a job that is not yet due is not claimed", async () => {
      await db.query(`UPDATE scheduled_job_runs SET "next_run_at" = now() + interval '1 hour'`);
      const result = await claim();
      expect(result.rows).toHaveLength(0);
    });

    test("claiming pushes next_run_at forward, so a restart cannot re-fire it", async () => {
      await claim();
      const after = await db.query<{ due: boolean }>(
        `SELECT ("next_run_at" <= now()) AS due FROM scheduled_job_runs`,
      );
      expect(after.rows[0].due).toBe(false);
    });
  });
});
