CREATE TABLE IF NOT EXISTS "parent_courses" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "title" varchar(255) NOT NULL,
  "summary" varchar(500) NOT NULL,
  "description" varchar(2000),
  "coverImage" varchar(500),
  "category" varchar(255) NOT NULL,
  "programTier" program_type,
  "modules" jsonb NOT NULL,
  "createdBy" integer NOT NULL REFERENCES "users"("id"),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
