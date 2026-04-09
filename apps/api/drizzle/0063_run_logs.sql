CREATE TABLE IF NOT EXISTS "run_logs" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "client_id" varchar(64) NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "date" timestamp NOT NULL,
  "distance_meters" double precision NOT NULL,
  "duration_seconds" integer NOT NULL,
  "avg_pace" double precision,
  "avg_speed" double precision,
  "calories" double precision,
  "coordinates" jsonb,
  "effort_level" integer,
  "feel_tags" jsonb,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "run_logs_user_idx" ON "run_logs" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "run_logs_client_id_user_unique" ON "run_logs" ("client_id", "user_id");
CREATE INDEX IF NOT EXISTS "run_logs_date_idx" ON "run_logs" ("date");
