DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'role' AND e.enumlabel = 'athlete'
  ) THEN
    ALTER TYPE "role" ADD VALUE 'athlete';
  END IF;
END $$;
