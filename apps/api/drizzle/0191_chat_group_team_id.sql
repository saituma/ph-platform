-- Team chat groups had no ID link back to the team they represent — only fuzzy name
-- matching (canonicalTeamMatchKey / resolveTeamInboxGroup) on both API and web. This
-- adds a real FK so team chat lookups stop depending on exact/fuzzy name strings.

ALTER TABLE "chat_groups" ADD COLUMN IF NOT EXISTS "teamId" integer;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "chat_groups" ADD CONSTRAINT "chat_groups_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_groups_team_idx" ON "chat_groups" USING btree ("teamId");--> statement-breakpoint

-- One-time backfill: link existing team-category chat groups to their team by exact
-- case-insensitive name match. Best effort — rows that don't match stay NULL and the
-- app keeps falling back to name-based matching for those.
UPDATE "chat_groups" cg
SET "teamId" = t."id"
FROM "teams" t
WHERE cg."category" = 'team'
  AND cg."teamId" IS NULL
  AND lower(trim(cg."name")) = lower(trim(t."name"));
