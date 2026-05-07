DO $$ BEGIN
  CREATE TYPE "public"."outbox_channel" AS ENUM('push', 'email');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'processing', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_outbox" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "channel" "outbox_channel" NOT NULL,
  "status" "outbox_status" NOT NULL DEFAULT 'pending',
  "payload" jsonb NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "last_error" text,
  "next_run_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_outbox_drain_idx" ON "notification_outbox" USING btree ("status","next_run_at");
