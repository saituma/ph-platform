CREATE TABLE IF NOT EXISTS "teams" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "name" varchar(255) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "teams_name_unique" ON "teams" ("name");

-- Backfill existing team names from athletes so historical teams continue to appear.
INSERT INTO "teams" ("name", "created_at", "updated_at")
SELECT
  "team" AS "name",
  min("created_at") AS "created_at",
  max("updated_at") AS "updated_at"
FROM "athletes"
WHERE btrim("team") <> ''
GROUP BY "team"
ON CONFLICT ("name") DO NOTHING;
