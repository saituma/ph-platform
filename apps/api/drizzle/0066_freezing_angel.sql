CREATE TABLE IF NOT EXISTS "teams" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "teams_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "service_types" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."booking_type";--> statement-breakpoint
CREATE TYPE "public"."booking_type" AS ENUM('one_to_one', 'semi_private', 'in_person');--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "type" SET DATA TYPE "public"."booking_type" USING "type"::"public"."booking_type";--> statement-breakpoint
ALTER TABLE "service_types" ALTER COLUMN "type" SET DATA TYPE "public"."booking_type" USING "type"::"public"."booking_type";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "teams_name_unique" ON "teams" USING btree ("name");