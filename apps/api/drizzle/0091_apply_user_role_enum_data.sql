-- Backfill users.role after 0090 committed new enum values (see 0090_expand_user_role_enum.sql).
UPDATE "users" u
SET role = 'team_coach'::"role"
FROM "teams" t
WHERE u.role::text = 'coach' AND t."adminId" = u.id;
--> statement-breakpoint
UPDATE "users" u
SET role = 'program_coach'::"role"
WHERE u.role::text = 'coach'
  AND NOT EXISTS (SELECT 1 FROM "teams" t WHERE t."adminId" = u.id);
--> statement-breakpoint
UPDATE "users" u
SET role = 'team_athlete'::"role"
FROM "athletes" a
WHERE u.role::text = 'athlete' AND a."userId" = u.id AND a."teamId" IS NOT NULL;
--> statement-breakpoint
UPDATE "users" u
SET role = 'adult_athlete'::"role"
FROM "athletes" a
WHERE u.role::text = 'athlete'
  AND a."userId" = u.id
  AND a."teamId" IS NULL
  AND a."athleteType"::text = 'adult';
--> statement-breakpoint
UPDATE "users" u
SET role = 'youth_athlete'::"role"
FROM "athletes" a
WHERE u.role::text = 'athlete'
  AND a."userId" = u.id
  AND a."teamId" IS NULL
  AND a."athleteType"::text = 'youth';
--> statement-breakpoint
UPDATE "users" u
SET role = 'youth_athlete'::"role"
WHERE u.role::text = 'athlete'
  AND NOT EXISTS (SELECT 1 FROM "athletes" a WHERE a."userId" = u.id);
