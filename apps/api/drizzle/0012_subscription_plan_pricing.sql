ALTER TABLE "subscription_plans"
  ADD COLUMN "monthlyPrice" varchar(100),
  ADD COLUMN "yearlyPrice" varchar(100),
  ADD COLUMN "discountType" varchar(20),
  ADD COLUMN "discountValue" varchar(50),
  ADD COLUMN "discountAppliesTo" varchar(20);
