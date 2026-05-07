ALTER TABLE "athletes" ADD COLUMN "youth_tracking_enabled" boolean NOT NULL DEFAULT false;

-- Add 'team' to tracking_goal_scope enum
ALTER TYPE "tracking_goal_scope" ADD VALUE IF NOT EXISTS 'team';

-- Add 'youth' to tracking_goal_audience enum
ALTER TYPE "tracking_goal_audience" ADD VALUE IF NOT EXISTS 'youth';
