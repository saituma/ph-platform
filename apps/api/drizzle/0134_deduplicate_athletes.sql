-- Remove duplicate athlete records, keeping only the oldest per userId + guardianId combination.
-- First, delete all duplicates (keeping the one with the lowest id).
DELETE FROM athletes
WHERE id NOT IN (
  SELECT MIN(id)
  FROM athletes
  GROUP BY "userId", COALESCE("guardianId", -1)
);

-- Add a unique index to prevent future duplicates.
-- For adult athletes (guardianId IS NULL), uniqueness is on userId alone.
-- For youth athletes, uniqueness is on userId + guardianId.
CREATE UNIQUE INDEX IF NOT EXISTS athletes_user_id_no_guardian_uniq
  ON athletes ("userId") WHERE "guardianId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS athletes_user_id_guardian_id_uniq
  ON athletes ("userId", "guardianId") WHERE "guardianId" IS NOT NULL;
