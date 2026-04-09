CREATE TABLE IF NOT EXISTS "teams" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "name" varchar(255) NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "teams_name_unique" ON "teams" ("name");

-- Backfill existing team names from athletes so historical teams continue to appear.
INSERT INTO "teams" ("name", "createdAt", "updatedAt")
SELECT
  "team" AS "name",
  min("createdAt") AS "createdAt",
  max("updatedAt") AS "updatedAt"
FROM "athletes"
WHERE btrim("team") <> ''
GROUP BY "team"
ON CONFLICT ("name") DO NOTHING;
