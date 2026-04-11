-- Add optional description to service types
ALTER TABLE "service_types" ADD COLUMN IF NOT EXISTS "description" varchar(2000);
