-- Social Privacy Settings and Run Likes
-- This migration adds tables for privacy-compliant social features

-- Create social privacy settings table
CREATE TABLE IF NOT EXISTS "social_privacy_settings" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "socialEnabled" boolean NOT NULL DEFAULT false,
  "shareRunsPublicly" boolean NOT NULL DEFAULT false,
  "allowComments" boolean NOT NULL DEFAULT true,
  "showInLeaderboard" boolean NOT NULL DEFAULT true,
  "showInDirectory" boolean NOT NULL DEFAULT true,
  "optedInAt" timestamp,
  "optedOutAt" timestamp,
  "privacyVersionAccepted" varchar(20),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Create unique index on userId for social_privacy_settings
CREATE UNIQUE INDEX IF NOT EXISTS "social_privacy_settings_user_unique"
  ON "social_privacy_settings" ("userId");

-- Create index on userId for faster lookups
CREATE INDEX IF NOT EXISTS "social_privacy_settings_user_idx"
  ON "social_privacy_settings" ("userId");

-- Create index on socialEnabled for filtering
CREATE INDEX IF NOT EXISTS "social_privacy_settings_enabled_idx"
  ON "social_privacy_settings" ("socialEnabled");

-- Create run likes table
CREATE TABLE IF NOT EXISTS "run_likes" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "runLogId" integer NOT NULL REFERENCES "run_logs"("id") ON DELETE CASCADE,
  "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Create unique index to prevent duplicate likes
CREATE UNIQUE INDEX IF NOT EXISTS "run_likes_run_user_unique"
  ON "run_likes" ("runLogId", "userId");

-- Create index on runLogId for faster lookups
CREATE INDEX IF NOT EXISTS "run_likes_run_idx"
  ON "run_likes" ("runLogId");

-- Create index on userId for faster lookups
CREATE INDEX IF NOT EXISTS "run_likes_user_idx"
  ON "run_likes" ("userId");

-- Run comments (matches schema.ts; no earlier migration created this table)
CREATE TABLE IF NOT EXISTS "run_comments" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "runLogId" integer NOT NULL REFERENCES "run_logs"("id") ON DELETE CASCADE,
  "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "parentId" integer REFERENCES "run_comments"("id") ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "run_comments_run_idx"
  ON "run_comments" ("runLogId");

CREATE INDEX IF NOT EXISTS "run_comments_parent_idx"
  ON "run_comments" ("parentId");

-- Create run comment reactions table (if not exists from service layer)
CREATE TABLE IF NOT EXISTS "run_comment_reactions" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "commentId" integer NOT NULL REFERENCES "run_comments"("id") ON DELETE CASCADE,
  "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "emoji" varchar(16) NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Create unique index for reactions
CREATE UNIQUE INDEX IF NOT EXISTS "run_comment_reactions_unique_idx"
  ON "run_comment_reactions" ("commentId", "userId");

-- Create index on commentId for faster lookups
CREATE INDEX IF NOT EXISTS "run_comment_reactions_comment_idx"
  ON "run_comment_reactions" ("commentId");

-- run_logs.visibility (matches schema.ts; needed before visibility indexes)
ALTER TABLE "run_logs" ADD COLUMN IF NOT EXISTS "visibility" varchar(20) NOT NULL DEFAULT 'public';

-- Add index on run_logs visibility for social queries
CREATE INDEX IF NOT EXISTS "run_logs_visibility_idx"
  ON "run_logs" ("visibility");

-- Add index on run_logs visibility + userId for social queries
CREATE INDEX IF NOT EXISTS "run_logs_visibility_user_idx"
  ON "run_logs" ("visibility", "userId");
