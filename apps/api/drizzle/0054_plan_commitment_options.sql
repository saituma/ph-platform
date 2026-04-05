DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_payment_type') THEN
    CREATE TYPE "plan_payment_type" AS ENUM ('monthly', 'upfront');
  END IF;
END $$;

ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "planPaymentType" "plan_payment_type";
ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "planCommitmentMonths" integer;
