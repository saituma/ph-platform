DO $$ BEGIN
  CREATE TYPE "public"."team_payment_mode" AS ENUM('coach_pays_all', 'per_player_all', 'per_player_selected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."team_player_invite_status" AS ENUM('pending', 'paid', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."booking_type" ADD VALUE 'team';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_player_payment_invites" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "team_player_payment_invites_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"requestId" integer NOT NULL,
	"teamId" integer NOT NULL,
	"playerEmail" varchar(255) NOT NULL,
	"playerName" varchar(255),
	"stripePaymentLinkId" varchar(255),
	"stripePaymentLinkUrl" varchar(1024),
	"stripeSessionId" varchar(255),
	"amountCents" integer,
	"currency" varchar(10) DEFAULT 'gbp' NOT NULL,
	"status" "team_player_invite_status" DEFAULT 'pending' NOT NULL,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "preferred_training_days" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "team_subscription_requests" ADD COLUMN IF NOT EXISTS "paymentMode" "team_payment_mode" DEFAULT 'coach_pays_all' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_subscription_requests" ADD COLUMN IF NOT EXISTS "coachPaysSeats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "team_subscription_requests" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" timestamp;--> statement-breakpoint
ALTER TABLE "team_subscription_requests" ADD COLUMN IF NOT EXISTS "termsVersion" varchar(50);--> statement-breakpoint
ALTER TABLE "team_subscription_requests" ADD COLUMN IF NOT EXISTS "allPaymentsComplete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "payment_mode" "team_payment_mode" DEFAULT 'coach_pays_all' NOT NULL;--> statement-breakpoint
ALTER TABLE "video_uploads" ADD COLUMN IF NOT EXISTS "coach_video_url" varchar(500);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "team_player_payment_invites" ADD CONSTRAINT "team_player_payment_invites_requestId_team_subscription_requests_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."team_subscription_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "team_player_payment_invites" ADD CONSTRAINT "team_player_payment_invites_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_player_payment_invites_request_idx" ON "team_player_payment_invites" USING btree ("requestId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_player_payment_invites_team_idx" ON "team_player_payment_invites" USING btree ("teamId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_player_payment_invites_stripe_session_unique" ON "team_player_payment_invites" USING btree ("stripeSessionId");
