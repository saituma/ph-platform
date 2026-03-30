DO $$ BEGIN
 CREATE TYPE "public"."training_other_type" AS ENUM('mobility', 'recovery', 'inseason', 'offseason', 'education');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."training_session_block_type" AS ENUM('warmup', 'main', 'cooldown');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "training_modules" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "age" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "order" integer NOT NULL DEFAULT 1,
  "createdBy" integer NOT NULL REFERENCES "users"("id"),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "training_module_sessions" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "moduleId" integer NOT NULL REFERENCES "training_modules"("id"),
  "title" varchar(255) NOT NULL,
  "dayLength" integer NOT NULL DEFAULT 7,
  "order" integer NOT NULL DEFAULT 1,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "training_session_items" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "sessionId" integer NOT NULL REFERENCES "training_module_sessions"("id"),
  "blockType" "training_session_block_type" NOT NULL DEFAULT 'main',
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "videoUrl" varchar(500),
  "allowVideoUpload" boolean NOT NULL DEFAULT false,
  "metadata" jsonb,
  "order" integer NOT NULL DEFAULT 1,
  "createdBy" integer NOT NULL REFERENCES "users"("id"),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "training_other_contents" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "age" integer NOT NULL,
  "type" "training_other_type" NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "scheduleNote" varchar(255),
  "videoUrl" varchar(500),
  "metadata" jsonb,
  "order" integer NOT NULL DEFAULT 1,
  "createdBy" integer NOT NULL REFERENCES "users"("id"),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "athlete_training_session_completions" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "athleteId" integer NOT NULL REFERENCES "athletes"("id"),
  "sessionId" integer NOT NULL REFERENCES "training_module_sessions"("id"),
  "completedAt" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "training_modules_age_idx" ON "training_modules" ("age");
CREATE INDEX IF NOT EXISTS "training_modules_age_order_idx" ON "training_modules" ("age", "order");
CREATE INDEX IF NOT EXISTS "training_module_sessions_module_idx" ON "training_module_sessions" ("moduleId");
CREATE INDEX IF NOT EXISTS "training_module_sessions_module_order_idx" ON "training_module_sessions" ("moduleId", "order");
CREATE INDEX IF NOT EXISTS "training_session_items_session_idx" ON "training_session_items" ("sessionId");
CREATE INDEX IF NOT EXISTS "training_session_items_session_block_order_idx" ON "training_session_items" ("sessionId", "blockType", "order");
CREATE INDEX IF NOT EXISTS "training_other_contents_age_type_idx" ON "training_other_contents" ("age", "type");
CREATE INDEX IF NOT EXISTS "training_other_contents_age_type_order_idx" ON "training_other_contents" ("age", "type", "order");
CREATE INDEX IF NOT EXISTS "athlete_training_session_completions_athlete_idx" ON "athlete_training_session_completions" ("athleteId");
CREATE INDEX IF NOT EXISTS "athlete_training_session_completions_session_idx" ON "athlete_training_session_completions" ("sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "athlete_training_session_completions_unique" ON "athlete_training_session_completions" ("athleteId", "sessionId");
