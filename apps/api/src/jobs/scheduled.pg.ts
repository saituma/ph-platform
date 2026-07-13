import { sql } from "drizzle-orm";

import { db } from "../db";
import { logger } from "../lib/logger";

/**
 * Postgres-backed scheduler for the recurring reminders.
 *
 * These jobs have NEVER run in production. They were BullMQ repeatables registered only inside
 * worker.ts, and Heroku starts new process types at 0 dynos — so nothing registered them. Moving
 * the registration into the web process was not enough either: production sets DISABLE_REDIS=true,
 * which makes isQueueEnabled() false and getRedisConnection() null, so BullMQ cannot start at all.
 *
 * On a single dyno a distributed queue buys nothing. Scheduling state lives in scheduled_job_runs:
 * a run is claimed with one atomic `UPDATE ... WHERE next_run_at <= now() RETURNING`, so only one
 * caller can ever win a given tick — safe across any number of instances, durable across restarts,
 * and it needs no Redis.
 */

type Cadence = { everyMs: number } | { dailyAtUtc: string };

type ScheduledJob = {
  name: string;
  cadence: Cadence;
  run: () => Promise<unknown>;
};

const JOBS: ScheduledJob[] = [
  {
    name: "nutrition-reminder",
    cadence: { everyMs: 5 * 60_000 },
    run: async () => (await import("../services/nutrition-reminder.service")).runNutritionLogReminderSweep(),
  },
  {
    name: "session-reminder",
    cadence: { everyMs: 30 * 60_000 },
    run: async () => (await import("../services/session-reminder.service")).sendSessionReminders(),
  },
  {
    name: "subscription-expiry",
    cadence: { dailyAtUtc: "03:00" },
    run: async () => (await import("../services/subscription-expiry.service")).runSubscriptionExpirySweep(),
  },
  {
    name: "streak-reminder",
    cadence: { dailyAtUtc: "20:00" },
    run: async () => (await import("../services/streak-reminder.service")).runStreakReminderSweep(),
  },
  {
    name: "goal-expiry",
    cadence: { dailyAtUtc: "00:05" },
    run: async () => (await import("../services/tracking-goals.service")).expireOverdueGoals(),
  },
];

/** How often we look for due jobs. The cadences above are all >= 5 minutes, so a minute is ample. */
const TICK_MS = 60_000;

let _timer: ReturnType<typeof setInterval> | null = null;
let _ticking = false;

function nextRunAfter(cadence: Cadence, from: Date): Date {
  if ("everyMs" in cadence) return new Date(from.getTime() + cadence.everyMs);

  const [hh, mm] = cadence.dailyAtUtc.split(":").map(Number);
  const next = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), hh, mm, 0, 0),
  );
  // Today's slot has passed — go to tomorrow's.
  if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

/** Create the row if it is missing. Never resets next_run_at for a job that already exists. */
async function ensureRow(job: ScheduledJob): Promise<void> {
  const firstRun = nextRunAfter(job.cadence, new Date());
  await db.execute(sql`
    INSERT INTO scheduled_job_runs ("name", "next_run_at")
    VALUES (${job.name}, ${firstRun.toISOString()})
    ON CONFLICT ("name") DO NOTHING
  `);
}

/**
 * Atomically take ownership of this job's next run.
 *
 * The UPDATE is the lock: two instances racing the same tick issue the same statement, and only
 * one sees next_run_at <= now(), because the winner has already pushed it forward.
 */
async function claim(job: ScheduledJob): Promise<boolean> {
  const nextAfterThisRun = nextRunAfter(job.cadence, new Date());
  const result = await db.execute(sql`
    UPDATE scheduled_job_runs
    SET "next_run_at" = ${nextAfterThisRun.toISOString()},
        "last_run_at" = now(),
        "runs" = "runs" + 1,
        "updated_at" = now()
    WHERE "name" = ${job.name} AND "next_run_at" <= now()
    RETURNING "name"
  `);
  return (result.rowCount ?? 0) > 0;
}

async function recordResult(name: string, status: "ok" | "error", error?: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : error ? String(error) : null;
  await db
    .execute(sql`
      UPDATE scheduled_job_runs
      SET "last_status" = ${status}, "last_error" = ${message}, "updated_at" = now()
      WHERE "name" = ${name}
    `)
    .catch(() => {
      /* best effort — never let bookkeeping take down the tick */
    });
}

async function tick(): Promise<void> {
  if (_ticking) return; // a slow job must not stack up behind itself
  _ticking = true;
  try {
    for (const job of JOBS) {
      let claimed = false;
      try {
        claimed = await claim(job);
      } catch (err) {
        logger.error({ err, job: job.name }, "scheduled.claim_failed");
        continue;
      }
      if (!claimed) continue;

      const startedAt = Date.now();
      try {
        await job.run();
        await recordResult(job.name, "ok");
        logger.info({ job: job.name, elapsedMs: Date.now() - startedAt }, "scheduled.job_completed");
      } catch (err) {
        await recordResult(job.name, "error", err);
        // Deliberately not re-thrown: one failing reminder must not stop the other four.
        logger.error({ err, job: job.name }, "scheduled.job_failed");
      }
    }
  } finally {
    _ticking = false;
  }
}

export async function startPgScheduler(): Promise<void> {
  if (_timer) return;

  for (const job of JOBS) {
    await ensureRow(job).catch((err) => logger.error({ err, job: job.name }, "scheduled.ensure_row_failed"));
  }

  _timer = setInterval(() => void tick(), TICK_MS);

  logger.info(
    { jobs: JOBS.map((j) => j.name), tickMs: TICK_MS },
    "Postgres scheduler started (no Redis required)",
  );

  // Catch anything already overdue rather than waiting a full tick.
  void tick();
}

export function stopPgScheduler(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

/** Exposed so the boot log and tests can assert the full set. */
export const SCHEDULED_JOB_NAMES = JOBS.map((j) => j.name);

/** Exported for tests — pure date maths, no DB. */
export const __test = { nextRunAfter };
