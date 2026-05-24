CREATE TABLE "physio_referral_broadcasts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "physio_referral_broadcasts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"targetMode" varchar(20) NOT NULL,
	"referalLink" varchar(500),
	"discountPercent" integer,
	"metadata" jsonb,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "physio_referral_broadcasts" ADD CONSTRAINT "physio_referral_broadcasts_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;