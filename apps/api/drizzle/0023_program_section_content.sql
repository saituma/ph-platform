CREATE TABLE IF NOT EXISTS "program_section_contents" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "sectionType" "session_type" NOT NULL,
  "programTier" "program_type",
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "videoUrl" varchar(500),
  "order" integer NOT NULL DEFAULT 1,
  "createdBy" integer NOT NULL REFERENCES "users" ("id"),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
