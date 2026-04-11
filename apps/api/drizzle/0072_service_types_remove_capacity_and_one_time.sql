-- Make existing services unlimited + remove one-time scheduling fields
-- Rationale: capacity/date/time are being removed from the admin form; existing rows should match.

UPDATE "service_types"
SET
  "capacity" = NULL,
  "oneTimeDate" = NULL,
  "oneTimeTime" = NULL
WHERE TRUE;
