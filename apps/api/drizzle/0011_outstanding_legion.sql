DO $$
BEGIN
  ALTER TYPE "public"."booking_type" ADD VALUE IF NOT EXISTS 'call';
  ALTER TYPE "public"."booking_type" ADD VALUE IF NOT EXISTS 'individual_call';
  ALTER TYPE "public"."booking_type" ADD VALUE IF NOT EXISTS 'lift_lab_1on1';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN IF NOT EXISTS "attendeeVisibility" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN IF NOT EXISTS "defaultLocation" varchar(500);--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN IF NOT EXISTS "defaultMeetingLink" varchar(500);
