-- Message pushes were coalesced by an in-memory setTimeout (lib/notification-batcher.ts):
-- the push intent did not reach the durable outbox until 3 seconds AFTER the message was
-- written, and the failure was swallowed (.catch(() => {})). A dyno restart, a deploy, or a
-- crash inside that window silently lost the notification. The outbox is well built — it was
-- simply being reached at the wrong moment.
--
-- The 3-second batching window now lives in the database: the intent is written immediately
-- with next_run_at = now() + 3s, and a further message in the same thread UPDATES that pending
-- row (bumping messageCount and pushing next_run_at out) instead of inserting a second push.
--
-- The partial unique index is what makes the upsert possible, and it only constrains rows that
-- are still pending — sent/failed rows keep their dedupe_key for debugging without blocking a
-- future push to the same thread.
ALTER TABLE "notification_outbox" ADD COLUMN IF NOT EXISTS "dedupe_key" varchar(160);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_outbox_pending_dedupe_key_unique"
  ON "notification_outbox" ("dedupe_key")
  WHERE "status" = 'pending' AND "dedupe_key" IS NOT NULL;
