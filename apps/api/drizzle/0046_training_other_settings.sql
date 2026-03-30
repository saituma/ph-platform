CREATE TABLE "training_other_settings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "training_other_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"audienceLabel" varchar(64) NOT NULL,
	"type" "public"."training_other_type" NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "training_other_settings" ADD CONSTRAINT "training_other_settings_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "training_other_settings_audience_type_unique" ON "training_other_settings" USING btree ("audienceLabel","type");
--> statement-breakpoint
CREATE INDEX "training_other_settings_audience_type_idx" ON "training_other_settings" USING btree ("audienceLabel","type");
