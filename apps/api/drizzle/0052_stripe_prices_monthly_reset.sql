UPDATE "subscription_plans"
SET
  "stripePriceId" = CASE
    WHEN "tier" = 'PHP' THEN 'price_1TIkf2Rt6s4ZTtfZiwSA3Fnh'
    WHEN "tier" = 'PHP_Premium' THEN 'price_1TIkggRt6s4ZTtfZySDji55W'
    WHEN "tier" = 'PHP_Premium_Plus' THEN 'price_1TIkhaRt6s4ZTtfZkJWWBfE4'
    WHEN "tier" = 'PHP_Pro' THEN 'price_1TIkidRt6s4ZTtfZipC6RuFS'
    ELSE "stripePriceId"
  END,
  "stripePriceIdMonthly" = CASE
    WHEN "tier" = 'PHP' THEN 'price_1TIkf2Rt6s4ZTtfZiwSA3Fnh'
    WHEN "tier" = 'PHP_Premium' THEN 'price_1TIkggRt6s4ZTtfZySDji55W'
    WHEN "tier" = 'PHP_Premium_Plus' THEN 'price_1TIkhaRt6s4ZTtfZkJWWBfE4'
    WHEN "tier" = 'PHP_Pro' THEN 'price_1TIkidRt6s4ZTtfZipC6RuFS'
    ELSE "stripePriceIdMonthly"
  END,
  "stripePriceIdYearly" = NULL,
  "billingInterval" = 'monthly',
  "yearlyPrice" = ''
WHERE "tier" IN ('PHP', 'PHP_Premium', 'PHP_Premium_Plus', 'PHP_Pro');
