ALTER TABLE "sessions" ADD COLUMN "teamId" integer REFERENCES "teams"("id") ON DELETE SET NULL;
