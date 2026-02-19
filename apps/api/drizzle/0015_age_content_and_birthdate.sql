ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "birthDate" date;
ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "minAge" integer;
ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "maxAge" integer;
ALTER TABLE "parent_courses" ADD COLUMN IF NOT EXISTS "minAge" integer;
ALTER TABLE "parent_courses" ADD COLUMN IF NOT EXISTS "maxAge" integer;
