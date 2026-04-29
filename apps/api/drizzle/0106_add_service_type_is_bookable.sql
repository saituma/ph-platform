ALTER TABLE "service_types" ADD COLUMN IF NOT EXISTS "isBookable" boolean NOT NULL DEFAULT true;
