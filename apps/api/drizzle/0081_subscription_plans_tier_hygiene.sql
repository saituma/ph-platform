-- One active row per tier; marketing-friendly names; ensure PHP_Pro exists (enum added in 0051 without insert).

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY tier ORDER BY id ASC) AS rn
  FROM subscription_plans
  WHERE "isActive" = true
)
UPDATE subscription_plans p
SET
  "isActive" = false,
  "updatedAt" = now()
WHERE p.id IN (SELECT id FROM ranked WHERE rn > 1);

UPDATE subscription_plans
SET
  "name" = CASE "tier"
    WHEN 'PHP' THEN 'Foundation'
    WHEN 'PHP_Premium' THEN 'Premium'
    WHEN 'PHP_Premium_Plus' THEN 'Plus'
    WHEN 'PHP_Pro' THEN 'PHP Pro'
    ELSE "name"
  END,
  "displayPrice" = CASE
    WHEN "tier" = 'PHP' AND ("displayPrice" IS NULL OR TRIM("displayPrice") = '') THEN '£34.99/month'
    WHEN "tier" = 'PHP_Premium' AND ("displayPrice" IS NULL OR TRIM("displayPrice") = '') THEN '£69.99/month'
    WHEN "tier" = 'PHP_Premium_Plus' AND ("displayPrice" IS NULL OR TRIM("displayPrice") = '') THEN '£99/month'
    WHEN "tier" = 'PHP_Pro' AND ("displayPrice" IS NULL OR TRIM("displayPrice") = '') THEN '£124.99/month'
    ELSE "displayPrice"
  END,
  "monthlyPrice" = CASE
    WHEN "tier" = 'PHP' AND ("monthlyPrice" IS NULL OR TRIM("monthlyPrice") = '') THEN '£34.99'
    WHEN "tier" = 'PHP_Premium' AND ("monthlyPrice" IS NULL OR TRIM("monthlyPrice") = '') THEN '£69.99'
    WHEN "tier" = 'PHP_Premium_Plus' AND ("monthlyPrice" IS NULL OR TRIM("monthlyPrice") = '') THEN '£99'
    WHEN "tier" = 'PHP_Pro' AND ("monthlyPrice" IS NULL OR TRIM("monthlyPrice") = '') THEN '£124.99'
    ELSE "monthlyPrice"
  END,
  "billingInterval" = COALESCE(NULLIF(TRIM("billingInterval"), ''), 'monthly'),
  "updatedAt" = now()
WHERE "tier" IN ('PHP', 'PHP_Premium', 'PHP_Premium_Plus', 'PHP_Pro');

INSERT INTO subscription_plans (
  "name",
  "tier",
  "stripePriceId",
  "stripePriceIdMonthly",
  "displayPrice",
  "billingInterval",
  "monthlyPrice",
  "isActive"
)
SELECT
  'PHP Pro',
  'PHP_Pro'::program_type,
  'manual',
  NULL,
  '£124.99/month',
  'monthly',
  '£124.99',
  true
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE tier = 'PHP_Pro');
