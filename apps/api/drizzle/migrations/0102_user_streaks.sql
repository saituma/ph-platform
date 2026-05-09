CREATE TABLE "user_streaks" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "current_streak" integer NOT NULL DEFAULT 0,
  "longest_streak" integer NOT NULL DEFAULT 0,
  "total_days" integer NOT NULL DEFAULT 0,
  "total_sessions" integer NOT NULL DEFAULT 0,
  "total_minutes" integer NOT NULL DEFAULT 0,
  "completed_dates" jsonb NOT NULL DEFAULT '[]',
  "last_activity_date" varchar(10),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
