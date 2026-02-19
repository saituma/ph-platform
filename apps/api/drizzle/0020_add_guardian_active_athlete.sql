ALTER TABLE "guardians" ADD COLUMN IF NOT EXISTS "activeAthleteId" integer;
ALTER TABLE "guardians"
  ADD CONSTRAINT "guardians_active_athlete_fk"
  FOREIGN KEY ("activeAthleteId") REFERENCES "athletes"("id");
