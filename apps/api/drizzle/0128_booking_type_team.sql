DO $$
BEGIN
  ALTER TYPE "public"."booking_type" ADD VALUE IF NOT EXISTS 'team';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
