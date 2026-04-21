CREATE TABLE "run_comments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "run_comments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"runLogId" integer NOT NULL,
	"userId" integer NOT NULL,
	"content" text NOT NULL,
	"parentId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_likes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "run_likes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"runLogId" integer NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_privacy_settings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "social_privacy_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"socialEnabled" boolean DEFAULT false NOT NULL,
	"shareRunsPublicly" boolean DEFAULT false NOT NULL,
	"allowComments" boolean DEFAULT true NOT NULL,
	"showInLeaderboard" boolean DEFAULT true NOT NULL,
	"showInDirectory" boolean DEFAULT true NOT NULL,
	"optedInAt" timestamp,
	"optedOutAt" timestamp,
	"privacyVersionAccepted" varchar(20),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "subscriptionStatus" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "subscriptionStatus" SET DEFAULT 'pending_payment';--> statement-breakpoint
ALTER TABLE "run_logs" ADD COLUMN "visibility" varchar(20) DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_requests" ADD COLUMN "planBillingCycle" varchar(20);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "planPaymentType" "plan_payment_type" DEFAULT 'monthly';--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "planCommitmentMonths" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "devicePushToken" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "devicePushTokenType" varchar(20);--> statement-breakpoint
ALTER TABLE "run_comments" ADD CONSTRAINT "run_comments_runLogId_run_logs_id_fk" FOREIGN KEY ("runLogId") REFERENCES "public"."run_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_comments" ADD CONSTRAINT "run_comments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_comments" ADD CONSTRAINT "run_comments_parentId_run_comments_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."run_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_likes" ADD CONSTRAINT "run_likes_runLogId_run_logs_id_fk" FOREIGN KEY ("runLogId") REFERENCES "public"."run_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_likes" ADD CONSTRAINT "run_likes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_privacy_settings" ADD CONSTRAINT "social_privacy_settings_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "run_comments_run_idx" ON "run_comments" USING btree ("runLogId");--> statement-breakpoint
CREATE INDEX "run_comments_parent_idx" ON "run_comments" USING btree ("parentId");--> statement-breakpoint
CREATE UNIQUE INDEX "run_likes_run_user_unique" ON "run_likes" USING btree ("runLogId","userId");--> statement-breakpoint
CREATE INDEX "run_likes_run_idx" ON "run_likes" USING btree ("runLogId");--> statement-breakpoint
CREATE INDEX "run_likes_user_idx" ON "run_likes" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "social_privacy_settings_user_unique" ON "social_privacy_settings" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "social_privacy_settings_user_idx" ON "social_privacy_settings" USING btree ("userId");