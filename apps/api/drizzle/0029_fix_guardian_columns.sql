ALTER TABLE "guardians" ADD COLUMN IF NOT EXISTS "activeAthleteId" integer;
ALTER TABLE "guardians" ADD COLUMN IF NOT EXISTS "currentProgramTier" "program_type";
