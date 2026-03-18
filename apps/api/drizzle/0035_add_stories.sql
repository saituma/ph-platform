CREATE TYPE "story_media_type" AS ENUM ('image', 'video');--> statement-breakpoint
CREATE TABLE "stories" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "title" varchar(255) NOT NULL,
  "mediaUrl" varchar(500) NOT NULL,
  "mediaType" "story_media_type" NOT NULL DEFAULT 'image',
  "badge" varchar(50),
  "order" integer NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "startsAt" timestamp,
  "endsAt" timestamp,
  "createdBy" integer NOT NULL REFERENCES "public"."users"("id"),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
