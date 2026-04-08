ALTER TABLE "service_types"
ADD COLUMN IF NOT EXISTS "eligiblePlans" jsonb;

