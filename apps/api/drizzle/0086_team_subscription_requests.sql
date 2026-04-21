CREATE TABLE IF NOT EXISTS "team_subscription_requests" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "adminId" integer NOT NULL,
  "teamId" integer NOT NULL,
  "planId" integer NOT NULL,
  "planBillingCycle" varchar(20),
  "stripeSessionId" varchar(255),
  "stripeSubscriptionId" varchar(255),
  "paymentStatus" varchar(100),
  "paymentAmountCents" integer,
  "paymentCurrency" varchar(10),
  "status" "subscription_status" DEFAULT 'pending_payment' NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "team_subscription_requests" ADD CONSTRAINT "team_subscription_requests_adminId_users_id_fk" FOREIGN KEY ("adminId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "team_subscription_requests" ADD CONSTRAINT "team_subscription_requests_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "team_subscription_requests" ADD CONSTRAINT "team_subscription_requests_planId_subscription_plans_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_subscription_requests_team_idx" ON "team_subscription_requests" USING btree ("teamId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_subscription_requests_status_idx" ON "team_subscription_requests" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_subscription_requests_stripe_session_unique" ON "team_subscription_requests" USING btree ("stripeSessionId");

