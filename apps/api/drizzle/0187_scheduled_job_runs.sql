-- The five scheduled reminders have NEVER run in production.
--
-- They were BullMQ repeatables, registered only inside worker.ts — and Heroku starts new process
-- types at 0 dynos, so nothing registered them. Moving the registration into the web process was
-- not enough either: production sets DISABLE_REDIS=true, which makes isQueueEnabled() return false
-- and getRedisConnection() return null, so BullMQ can never start at all.
--
-- On a single dyno a distributed queue buys nothing. This table is the whole scheduler: each job
-- owns one row, and a worker claims it with a single atomic UPDATE ... WHERE next_run_at <= now()
-- RETURNING. That is safe across any number of instances (only one UPDATE can win), it survives a
-- restart (state is in Postgres, not an in-process timer), and it needs no Redis.
CREATE TABLE IF NOT EXISTS "scheduled_job_runs" (
  "name"         varchar(64) PRIMARY KEY,
  "next_run_at"  timestamp NOT NULL DEFAULT now(),
  "last_run_at"  timestamp,
  "last_status"  varchar(16),
  "last_error"   text,
  "runs"         integer NOT NULL DEFAULT 0,
  "updated_at"   timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "scheduled_job_runs_due_idx"
  ON "scheduled_job_runs" ("next_run_at");
