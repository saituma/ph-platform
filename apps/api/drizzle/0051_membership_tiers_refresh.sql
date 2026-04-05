ALTER TYPE "public"."program_type" RENAME VALUE 'PHP_Plus' TO 'PHP_Premium_Plus';
ALTER TYPE "public"."program_type" ADD VALUE IF NOT EXISTS 'PHP_Pro';

UPDATE "subscription_plans"
SET
  "name" = CASE
    WHEN "tier" = 'PHP' THEN 'PHP Program'
    WHEN "tier" = 'PHP_Premium' THEN 'PHP Premium'
    WHEN "tier" = 'PHP_Premium_Plus' THEN 'PHP Premium Plus'
    ELSE "name"
  END,
  "displayPrice" = CASE
    WHEN "tier" = 'PHP' THEN '£34.99/month'
    WHEN "tier" = 'PHP_Premium' THEN '£69.99/month'
    WHEN "tier" = 'PHP_Premium_Plus' THEN '£99/month'
    ELSE "displayPrice"
  END,
  "billingInterval" = 'monthly',
  "monthlyPrice" = CASE
    WHEN "tier" = 'PHP' THEN '£34.99'
    WHEN "tier" = 'PHP_Premium' THEN '£69.99'
    WHEN "tier" = 'PHP_Premium_Plus' THEN '£99'
    ELSE "monthlyPrice"
  END,
  "updatedAt" = now();
