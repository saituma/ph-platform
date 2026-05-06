ALTER TABLE "team_player_payment_invites"
  ADD COLUMN IF NOT EXISTS "emailSentAt" timestamp,
  ADD COLUMN IF NOT EXISTS "emailLastError" text;
