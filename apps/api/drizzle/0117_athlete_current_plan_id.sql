ALTER TABLE "athletes" ADD COLUMN "current_plan_id" integer REFERENCES "subscription_plans"("id");
ALTER TABLE "guardians" ADD COLUMN "current_plan_id" integer REFERENCES "subscription_plans"("id");
