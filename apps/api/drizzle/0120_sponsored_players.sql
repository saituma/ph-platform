-- Sponsored players: team managers can sponsor players who can't afford the plan.
-- The manager pays for them during team creation; they get limited access based on
-- the sponsored plan's tier.

ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "sponsored_player_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "sponsored_plan_id" integer REFERENCES "subscription_plans"("id");

ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "is_sponsored" boolean NOT NULL DEFAULT false;
