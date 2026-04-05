DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'athlete_type') THEN
    CREATE TYPE "athlete_type" AS ENUM ('youth', 'adult');
  END IF;
END $$;

ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "athleteType" "athlete_type" DEFAULT 'youth' NOT NULL;
ALTER TABLE "athletes" ALTER COLUMN "guardianId" DROP NOT NULL;
