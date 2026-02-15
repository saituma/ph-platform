DO $$ BEGIN
  CREATE TYPE "subscription_status" AS ENUM ('pending_payment', 'pending_approval', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "name" varchar(255) NOT NULL,
  "tier" program_type NOT NULL,
  "stripePriceId" varchar(255) NOT NULL,
  "displayPrice" varchar(100) NOT NULL,
  "billingInterval" varchar(50) NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "subscription_requests" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "userId" integer NOT NULL REFERENCES "users"("id"),
  "athleteId" integer NOT NULL REFERENCES "athletes"("id"),
  "planId" integer NOT NULL REFERENCES "subscription_plans"("id"),
  "stripeSessionId" varchar(255),
  "paymentStatus" varchar(100),
  "status" subscription_status NOT NULL DEFAULT 'pending_payment',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
