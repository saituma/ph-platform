CREATE TABLE IF NOT EXISTS "athlete_training_session_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"athleteId" integer NOT NULL REFERENCES "athletes"("id"),
	"weekNumber" integer,
	"sessionLabel" varchar(500),
	"programKey" varchar(32),
	"contentIds" jsonb NOT NULL,
	"exerciseCount" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "athlete_training_session_logs_athlete_idx" ON "athlete_training_session_logs" ("athleteId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "athlete_training_session_logs_created_idx" ON "athlete_training_session_logs" ("createdAt");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "athlete_achievement_unlocks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"athleteId" integer NOT NULL REFERENCES "athletes"("id"),
	"achievementKey" varchar(64) NOT NULL,
	"unlockedAt" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "athlete_achievement_unlocks_athlete_key_unique" UNIQUE("athleteId", "achievementKey")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "athlete_achievement_unlocks_athlete_idx" ON "athlete_achievement_unlocks" ("athleteId");
