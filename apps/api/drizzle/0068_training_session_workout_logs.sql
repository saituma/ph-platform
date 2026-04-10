CREATE TABLE IF NOT EXISTS "athlete_training_session_workout_logs" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "athleteId" integer NOT NULL REFERENCES "athletes"("id"),
  "sessionId" integer NOT NULL REFERENCES "training_module_sessions"("id"),
  "weightsUsed" text,
  "repsCompleted" text,
  "rpe" integer,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "athlete_training_session_workout_logs_athlete_idx" ON "athlete_training_session_workout_logs" ("athleteId");
CREATE INDEX IF NOT EXISTS "athlete_training_session_workout_logs_session_idx" ON "athlete_training_session_workout_logs" ("sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "athlete_training_session_workout_logs_unique" ON "athlete_training_session_workout_logs" ("athleteId", "sessionId");
