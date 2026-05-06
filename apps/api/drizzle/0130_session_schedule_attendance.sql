DO $$ BEGIN
  CREATE TYPE "public"."scheduled_session_status" AS ENUM('upcoming', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."session_assignment_scope" AS ENUM('individual', 'group', 'team');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."session_attendance_status" AS ENUM('unmarked', 'attended', 'missed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "session_templates" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "name" varchar(255) NOT NULL,
  "type" "booking_type" NOT NULL,
  "scope" "session_assignment_scope" NOT NULL,
  "isRecurring" boolean NOT NULL DEFAULT true,
  "weekday" integer,
  "startsAtTime" varchar(5) NOT NULL,
  "endsAtTime" varchar(5) NOT NULL,
  "location" varchar(500),
  "meetingLink" varchar(500),
  "notes" text,
  "teamId" integer,
  "targetUserIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdBy" integer NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "scheduled_sessions" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "templateId" integer,
  "name" varchar(255) NOT NULL,
  "type" "booking_type" NOT NULL,
  "scope" "session_assignment_scope" NOT NULL,
  "startsAt" timestamp NOT NULL,
  "endsAt" timestamp NOT NULL,
  "status" "scheduled_session_status" NOT NULL DEFAULT 'upcoming',
  "location" varchar(500),
  "meetingLink" varchar(500),
  "notes" text,
  "teamId" integer,
  "createdBy" integer NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "session_attendance" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "scheduledSessionId" integer NOT NULL,
  "userId" integer NOT NULL,
  "status" "session_attendance_status" NOT NULL DEFAULT 'unmarked',
  "checkInAt" timestamp,
  "markedBy" integer,
  "markedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "session_templates" ADD CONSTRAINT "session_templates_teamId_teams_id_fk"
  FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "session_templates" ADD CONSTRAINT "session_templates_createdBy_users_id_fk"
  FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "scheduled_sessions" ADD CONSTRAINT "scheduled_sessions_templateId_session_templates_id_fk"
  FOREIGN KEY ("templateId") REFERENCES "public"."session_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "scheduled_sessions" ADD CONSTRAINT "scheduled_sessions_teamId_teams_id_fk"
  FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "scheduled_sessions" ADD CONSTRAINT "scheduled_sessions_createdBy_users_id_fk"
  FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_scheduledSessionId_scheduled_sessions_id_fk"
  FOREIGN KEY ("scheduledSessionId") REFERENCES "public"."scheduled_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_userId_users_id_fk"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_markedBy_users_id_fk"
  FOREIGN KEY ("markedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "session_templates_scope_idx" ON "session_templates" USING btree ("scope");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_templates_team_idx" ON "session_templates" USING btree ("teamId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_sessions_starts_at_idx" ON "scheduled_sessions" USING btree ("startsAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_sessions_template_idx" ON "scheduled_sessions" USING btree ("templateId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_attendance_user_idx" ON "session_attendance" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_attendance_session_idx" ON "session_attendance" USING btree ("scheduledSessionId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "session_attendance_session_user_unique" ON "session_attendance" USING btree ("scheduledSessionId", "userId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scheduled_sessions_template_starts_unique" ON "scheduled_sessions" USING btree ("templateId", "startsAt");
