CREATE TABLE IF NOT EXISTS "user_locations" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "userId" integer NOT NULL REFERENCES "users" ("id"),
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  "accuracy" integer,
  "recordedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "user_locations_user_id_idx" ON "user_locations" ("userId");
CREATE INDEX IF NOT EXISTS "user_locations_recorded_at_idx" ON "user_locations" ("recordedAt");
