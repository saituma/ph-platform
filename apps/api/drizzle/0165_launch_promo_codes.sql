CREATE TABLE "launch_promo_campaigns" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "name" varchar(255) NOT NULL,
  "stripe_coupon_id" varchar(100) NOT NULL,
  "discount_percent" integer NOT NULL,
  "expires_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "launch_promo_codes" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "campaign_id" integer NOT NULL REFERENCES "launch_promo_campaigns"("id") ON DELETE CASCADE,
  "email" varchar(255) NOT NULL,
  "stripe_promo_code_id" varchar(100) NOT NULL,
  "code" varchar(50) NOT NULL,
  "redeemed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "launch_promo_codes_campaign_idx" ON "launch_promo_codes" ("campaign_id");
CREATE INDEX "launch_promo_codes_email_idx" ON "launch_promo_codes" ("email");
