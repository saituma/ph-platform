CREATE TABLE IF NOT EXISTS "athlete_plan_sessions" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "athleteId" integer NOT NULL REFERENCES "athletes"("id"),
  "weekNumber" integer NOT NULL,
  "sessionNumber" integer NOT NULL,
  "title" varchar(255),
  "notes" varchar(500),
  "createdBy" integer NOT NULL REFERENCES "users"("id"),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "athlete_plan_sessions_athlete_idx" ON "athlete_plan_sessions" ("athleteId");
CREATE INDEX IF NOT EXISTS "athlete_plan_sessions_week_idx" ON "athlete_plan_sessions" ("weekNumber");

CREATE TABLE IF NOT EXISTS "athlete_plan_exercises" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "planSessionId" integer NOT NULL REFERENCES "athlete_plan_sessions"("id"),
  "exerciseId" integer NOT NULL REFERENCES "exercises"("id"),
  "order" integer NOT NULL,
  "sets" integer,
  "reps" integer,
  "duration" integer,
  "restSeconds" integer,
  "coachingNotes" varchar(500),
  "progressionNotes" varchar(500),
  "regressionNotes" varchar(500),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "athlete_plan_exercises_session_idx" ON "athlete_plan_exercises" ("planSessionId");

CREATE TABLE IF NOT EXISTS "athlete_plan_exercise_completions" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "athleteId" integer NOT NULL REFERENCES "athletes"("id"),
  "planExerciseId" integer NOT NULL REFERENCES "athlete_plan_exercises"("id"),
  "completedAt" timestamp DEFAULT now() NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "athlete_plan_exercise_completions_unique"
  ON "athlete_plan_exercise_completions" ("athleteId", "planExerciseId");
CREATE INDEX IF NOT EXISTS "athlete_plan_exercise_completions_athlete_idx" ON "athlete_plan_exercise_completions" ("athleteId");
CREATE INDEX IF NOT EXISTS "athlete_plan_exercise_completions_completed_at_idx" ON "athlete_plan_exercise_completions" ("completedAt");

CREATE TABLE IF NOT EXISTS "athlete_plan_session_completions" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "athleteId" integer NOT NULL REFERENCES "athletes"("id"),
  "planSessionId" integer NOT NULL REFERENCES "athlete_plan_sessions"("id"),
  "rpe" integer,
  "soreness" integer,
  "fatigue" integer,
  "notes" varchar(500),
  "completedAt" timestamp DEFAULT now() NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "athlete_plan_session_completions_athlete_idx" ON "athlete_plan_session_completions" ("athleteId");
CREATE INDEX IF NOT EXISTS "athlete_plan_session_completions_session_idx" ON "athlete_plan_session_completions" ("planSessionId");
CREATE INDEX IF NOT EXISTS "athlete_plan_session_completions_completed_at_idx" ON "athlete_plan_session_completions" ("completedAt");

