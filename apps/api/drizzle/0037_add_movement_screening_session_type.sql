DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'session_type' AND e.enumlabel = 'screening'
  ) THEN
    ALTER TYPE "session_type" ADD VALUE 'screening';
  END IF;
END $$;

