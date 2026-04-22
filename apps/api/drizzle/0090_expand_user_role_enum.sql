-- Add new role enum labels only. Postgres forbids using new enum values in the same
-- transaction they are added (55P04); data backfill runs in 0091_apply_user_role_enum_data.sql.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'role' AND e.enumlabel = 'team_coach'
  ) THEN
    ALTER TYPE "role" ADD VALUE 'team_coach';
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'role' AND e.enumlabel = 'program_coach'
  ) THEN
    ALTER TYPE "role" ADD VALUE 'program_coach';
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'role' AND e.enumlabel = 'team_athlete'
  ) THEN
    ALTER TYPE "role" ADD VALUE 'team_athlete';
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'role' AND e.enumlabel = 'adult_athlete'
  ) THEN
    ALTER TYPE "role" ADD VALUE 'adult_athlete';
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'role' AND e.enumlabel = 'youth_athlete'
  ) THEN
    ALTER TYPE "role" ADD VALUE 'youth_athlete';
  END IF;
END $$;
