CREATE TABLE "referral_claims" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "referral_claims_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"referral_code_id" integer NOT NULL,
	"new_user_id" integer NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_device_tokens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_device_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"deviceId" varchar(255) NOT NULL,
	"expoPushToken" varchar(255),
	"devicePushToken" text,
	"devicePushTokenType" varchar(20),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_device_tokens_user_id_device_id_unique" UNIQUE("userId","deviceId")
);
--> statement-breakpoint
CREATE TABLE "user_referral_codes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_referral_codes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"code" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "user_locations" ADD COLUMN "route_points" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "referral_claims" ADD CONSTRAINT "referral_claims_referral_code_id_user_referral_codes_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."user_referral_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_claims" ADD CONSTRAINT "referral_claims_new_user_id_users_id_fk" FOREIGN KEY ("new_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_device_tokens" ADD CONSTRAINT "user_device_tokens_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_referral_codes" ADD CONSTRAINT "user_referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "referral_claims_new_user_unique" ON "referral_claims" USING btree ("new_user_id");--> statement-breakpoint
CREATE INDEX "referral_claims_code_idx" ON "referral_claims" USING btree ("referral_code_id");--> statement-breakpoint
CREATE INDEX "user_device_tokens_user_id_idx" ON "user_device_tokens" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_referral_codes_user_unique" ON "user_referral_codes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_referral_codes_code_unique" ON "user_referral_codes" USING btree ("code");