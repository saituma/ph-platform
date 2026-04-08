ALTER TABLE "contents"
ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true;
