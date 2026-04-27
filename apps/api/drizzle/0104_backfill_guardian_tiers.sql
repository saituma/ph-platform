-- Backfill guardian currentProgramTier from the highest-tier managed athlete.
-- Guardian owns the tier; this one-time sync covers records created before the fix.
UPDATE "guardians" g
SET "currentProgramTier" = sub.tier, "updatedAt" = NOW()
FROM (
  SELECT a."guardianId",
         (ARRAY['PHP','PHP_Premium','PHP_Premium_Plus','PHP_Pro'])[
           MAX(
             CASE a."currentProgramTier"
               WHEN 'PHP'              THEN 1
               WHEN 'PHP_Premium'      THEN 2
               WHEN 'PHP_Premium_Plus' THEN 3
               WHEN 'PHP_Pro'          THEN 4
             END
           )
         ] AS tier
  FROM "athletes" a
  WHERE a."guardianId" IS NOT NULL
    AND a."currentProgramTier" IS NOT NULL
  GROUP BY a."guardianId"
) sub
WHERE g."id" = sub."guardianId"
  AND (g."currentProgramTier" IS NULL OR g."currentProgramTier" != sub.tier);
