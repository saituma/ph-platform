ALTER TABLE "social_posts" ADD COLUMN IF NOT EXISTS "team_id" integer REFERENCES "teams"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "social_posts_team_idx" ON "social_posts" ("team_id");

CREATE TABLE IF NOT EXISTS "team_social_settings" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "team_id" integer NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "social_enabled" boolean NOT NULL DEFAULT false,
  "share_runs_publicly" boolean NOT NULL DEFAULT false,
  "allow_comments" boolean NOT NULL DEFAULT true,
  "show_in_leaderboard" boolean NOT NULL DEFAULT true,
  "show_in_directory" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "team_social_settings_team_unique" ON "team_social_settings" ("team_id");
