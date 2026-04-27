-- Fix athlete 41 (user 161, parent@gmail.com): billing fields were set but
-- currentProgramTier was never assigned due to a bug in admin provisioning.
-- The user's plan is PHP_Pro (confirmed by the user).
UPDATE "athletes"
SET "currentProgramTier" = 'PHP_Pro'::program_type, "updatedAt" = NOW()
WHERE "id" = 41 AND "currentProgramTier" IS NULL;

UPDATE "guardians"
SET "currentProgramTier" = 'PHP_Pro'::program_type, "updatedAt" = NOW()
WHERE "id" = (SELECT "guardianId" FROM "athletes" WHERE "id" = 41)
  AND "currentProgramTier" IS NULL;
