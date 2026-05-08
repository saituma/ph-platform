DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outbox_channel') THEN CREATE TYPE "public"."outbox_channel" AS ENUM('push', 'email'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outbox_status') THEN CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'processing', 'sent', 'failed'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduled_session_status') THEN CREATE TYPE "public"."scheduled_session_status" AS ENUM('upcoming', 'completed', 'cancelled'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_assignment_scope') THEN CREATE TYPE "public"."session_assignment_scope" AS ENUM('individual', 'group', 'team'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_attendance_status') THEN CREATE TYPE "public"."session_attendance_status" AS ENUM('unmarked', 'attended', 'missed'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'youth' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tracking_goal_audience')) THEN ALTER TYPE "public"."tracking_goal_audience" ADD VALUE 'youth'; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'team' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tracking_goal_scope')) THEN ALTER TYPE "public"."tracking_goal_scope" ADD VALUE 'team'; END IF; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_outbox" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"channel" "outbox_channel" NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"payload" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_run_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduled_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "scheduled_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"templateId" integer,
	"name" varchar(255) NOT NULL,
	"type" "booking_type" NOT NULL,
	"scope" "session_assignment_scope" NOT NULL,
	"startsAt" timestamp NOT NULL,
	"endsAt" timestamp NOT NULL,
	"status" "scheduled_session_status" DEFAULT 'upcoming' NOT NULL,
	"location" varchar(500),
	"meetingLink" varchar(500),
	"notes" text,
	"teamId" integer,
	"googleEventId" varchar(255),
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_attendance" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "session_attendance_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"scheduledSessionId" integer NOT NULL,
	"userId" integer NOT NULL,
	"status" "session_attendance_status" DEFAULT 'unmarked' NOT NULL,
	"checkInAt" timestamp,
	"markedBy" integer,
	"markedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_templates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "session_templates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"type" "booking_type" NOT NULL,
	"scope" "session_assignment_scope" NOT NULL,
	"isRecurring" boolean DEFAULT true NOT NULL,
	"weekday" integer,
	"startsAtTime" varchar(5) NOT NULL,
	"endsAtTime" varchar(5) NOT NULL,
	"location" varchar(500),
	"meetingLink" varchar(500),
	"notes" text,
	"teamId" integer,
	"targetUserIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"googleSyncEnabled" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sleep_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sleep_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"dateKey" varchar(10) NOT NULL,
	"totalMinutes" integer DEFAULT 0 NOT NULL,
	"bedTime" varchar(5),
	"wakeTime" varchar(5),
	"quality" integer,
	"deepMinutes" integer,
	"lightMinutes" integer,
	"remMinutes" integer,
	"awakeMinutes" integer,
	"notes" text,
	"coachFeedback" text,
	"coachId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_payment_config_drafts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "team_payment_config_drafts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"adminId" integer NOT NULL,
	"teamId" integer NOT NULL,
	"scope_key" varchar(255) NOT NULL,
	"payment_mode" "team_payment_mode" DEFAULT 'coach_pays_all' NOT NULL,
	"coach_pays_seats" integer DEFAULT 0 NOT NULL,
	"terms_accepted_at" timestamp,
	"terms_version" varchar(50),
	"player_payers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_settings' AND column_name='googleCalendarId') THEN ALTER TABLE "admin_settings" ADD COLUMN "googleCalendarId" varchar(255); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_settings' AND column_name='googleServiceAccountEmail') THEN ALTER TABLE "admin_settings" ADD COLUMN "googleServiceAccountEmail" varchar(255); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_settings' AND column_name='googleServiceAccountPrivateKey') THEN ALTER TABLE "admin_settings" ADD COLUMN "googleServiceAccountPrivateKey" text; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_settings' AND column_name='googleCalendarConnectedAt') THEN ALTER TABLE "admin_settings" ADD COLUMN "googleCalendarConnectedAt" timestamp; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='athletes' AND column_name='youth_tracking_enabled') THEN ALTER TABLE "athletes" ADD COLUMN "youth_tracking_enabled" boolean DEFAULT false NOT NULL; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='program_assignments' AND column_name='scheduled_date') THEN ALTER TABLE "program_assignments" ADD COLUMN "scheduled_date" timestamp; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_player_payment_invites' AND column_name='emailSentAt') THEN ALTER TABLE "team_player_payment_invites" ADD COLUMN "emailSentAt" timestamp; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_player_payment_invites' AND column_name='emailLastError') THEN ALTER TABLE "team_player_payment_invites" ADD COLUMN "emailLastError" varchar(500); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_subscription_requests' AND column_name='inviteEmailsReady') THEN ALTER TABLE "team_subscription_requests" ADD COLUMN "inviteEmailsReady" boolean DEFAULT false NOT NULL; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_subscription_requests' AND column_name='inviteEmailsLastAttemptAt') THEN ALTER TABLE "team_subscription_requests" ADD COLUMN "inviteEmailsLastAttemptAt" timestamp; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_subscription_requests' AND column_name='inviteEmailsError') THEN ALTER TABLE "team_subscription_requests" ADD COLUMN "inviteEmailsError" varchar(500); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_sessions_templateId_session_templates_id_fk') THEN ALTER TABLE "scheduled_sessions" ADD CONSTRAINT "scheduled_sessions_templateId_session_templates_id_fk" FOREIGN KEY ("templateId") REFERENCES "public"."session_templates"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_sessions_teamId_teams_id_fk') THEN ALTER TABLE "scheduled_sessions" ADD CONSTRAINT "scheduled_sessions_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_sessions_createdBy_users_id_fk') THEN ALTER TABLE "scheduled_sessions" ADD CONSTRAINT "scheduled_sessions_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_attendance_scheduledSessionId_scheduled_sessions_id_fk') THEN ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_scheduledSessionId_scheduled_sessions_id_fk" FOREIGN KEY ("scheduledSessionId") REFERENCES "public"."scheduled_sessions"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_attendance_userId_users_id_fk') THEN ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_attendance_markedBy_users_id_fk') THEN ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_markedBy_users_id_fk" FOREIGN KEY ("markedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_templates_teamId_teams_id_fk') THEN ALTER TABLE "session_templates" ADD CONSTRAINT "session_templates_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_templates_createdBy_users_id_fk') THEN ALTER TABLE "session_templates" ADD CONSTRAINT "session_templates_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sleep_logs_userId_users_id_fk') THEN ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sleep_logs_coachId_users_id_fk') THEN ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_coachId_users_id_fk" FOREIGN KEY ("coachId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_payment_config_drafts_adminId_users_id_fk') THEN ALTER TABLE "team_payment_config_drafts" ADD CONSTRAINT "team_payment_config_drafts_adminId_users_id_fk" FOREIGN KEY ("adminId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_payment_config_drafts_teamId_teams_id_fk') THEN ALTER TABLE "team_payment_config_drafts" ADD CONSTRAINT "team_payment_config_drafts_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_outbox_drain_idx" ON "notification_outbox" USING btree ("status","next_run_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_sessions_starts_at_idx" ON "scheduled_sessions" USING btree ("startsAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_sessions_template_idx" ON "scheduled_sessions" USING btree ("templateId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_sessions_google_event_id_idx" ON "scheduled_sessions" USING btree ("googleEventId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scheduled_sessions_template_starts_unique" ON "scheduled_sessions" USING btree ("templateId","startsAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_attendance_user_idx" ON "session_attendance" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_attendance_session_idx" ON "session_attendance" USING btree ("scheduledSessionId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "session_attendance_session_user_unique" ON "session_attendance" USING btree ("scheduledSessionId","userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_templates_scope_idx" ON "session_templates" USING btree ("scope");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_templates_team_idx" ON "session_templates" USING btree ("teamId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sleep_logs_user_date_unique" ON "sleep_logs" USING btree ("userId","dateKey");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sleep_logs_user_idx" ON "sleep_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sleep_logs_date_idx" ON "sleep_logs" USING btree ("dateKey");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_payment_config_drafts_admin_team_unique" ON "team_payment_config_drafts" USING btree ("adminId","teamId");