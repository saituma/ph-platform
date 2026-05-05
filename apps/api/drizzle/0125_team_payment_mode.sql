-- Migration: team payment mode + player payment invites
-- Adds teamPaymentMode enum, teamPlayerInviteStatus enum,
-- new columns on team_subscription_requests,
-- and the new team_player_payment_invites table.

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE "public"."team_payment_mode" AS ENUM(
    'coach_pays_all',
    'per_player_all',
    'per_player_selected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."team_player_invite_status" AS ENUM(
    'pending',
    'paid',
    'expired',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. New columns on team_subscription_requests
ALTER TABLE "team_subscription_requests"
  ADD COLUMN IF NOT EXISTS "paymentMode" "team_payment_mode" NOT NULL DEFAULT 'coach_pays_all',
  ADD COLUMN IF NOT EXISTS "coachPaysSeats" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "termsAcceptedAt" timestamp,
  ADD COLUMN IF NOT EXISTS "termsVersion" varchar(50),
  ADD COLUMN IF NOT EXISTS "allPaymentsComplete" boolean NOT NULL DEFAULT false;

-- 3. New table: team_player_payment_invites
CREATE TABLE IF NOT EXISTS "team_player_payment_invites" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "requestId" integer NOT NULL REFERENCES "team_subscription_requests"("id") ON DELETE CASCADE,
  "teamId" integer NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "playerEmail" varchar(255) NOT NULL,
  "playerName" varchar(255),
  "stripePaymentLinkId" varchar(255),
  "stripePaymentLinkUrl" varchar(1024),
  "stripeSessionId" varchar(255),
  "amountCents" integer,
  "currency" varchar(10) NOT NULL DEFAULT 'gbp',
  "status" "team_player_invite_status" NOT NULL DEFAULT 'pending',
  "paidAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS "team_player_payment_invites_request_idx"
  ON "team_player_payment_invites" ("requestId");

CREATE INDEX IF NOT EXISTS "team_player_payment_invites_team_idx"
  ON "team_player_payment_invites" ("teamId");

CREATE UNIQUE INDEX IF NOT EXISTS "team_player_payment_invites_stripe_session_unique"
  ON "team_player_payment_invites" ("stripeSessionId")
  WHERE "stripeSessionId" IS NOT NULL;
