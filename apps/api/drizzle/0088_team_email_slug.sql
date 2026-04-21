-- Team-scoped athlete login emails: {username}.{email_slug}@{domain}
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "email_slug" varchar(80);

UPDATE "teams"
SET "email_slug" = CONCAT(
  regexp_replace(lower(trim("name")), '[^a-z0-9]+', '-', 'g'),
  '-',
  "id"::text
)
WHERE "email_slug" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "teams_email_slug_unique" ON "teams" ("email_slug");
