ALTER TABLE "training_modules" ADD COLUMN IF NOT EXISTS "audienceLabel" varchar(64);
UPDATE "training_modules" SET "audienceLabel" = COALESCE("audienceLabel", CAST("age" AS varchar(64)));
ALTER TABLE "training_modules" ALTER COLUMN "audienceLabel" SET DEFAULT 'All';
ALTER TABLE "training_modules" ALTER COLUMN "audienceLabel" SET NOT NULL;

ALTER TABLE "training_other_contents" ADD COLUMN IF NOT EXISTS "audienceLabel" varchar(64);
UPDATE "training_other_contents" SET "audienceLabel" = COALESCE("audienceLabel", CAST("age" AS varchar(64)));
ALTER TABLE "training_other_contents" ALTER COLUMN "audienceLabel" SET DEFAULT 'All';
ALTER TABLE "training_other_contents" ALTER COLUMN "audienceLabel" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "training_modules_audience_label_idx" ON "training_modules" ("audienceLabel");
CREATE INDEX IF NOT EXISTS "training_other_contents_audience_label_idx" ON "training_other_contents" ("audienceLabel");
