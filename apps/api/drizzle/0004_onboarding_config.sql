ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "extraResponses" jsonb;

CREATE TABLE IF NOT EXISTS "onboarding_configs" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "version" integer DEFAULT 1 NOT NULL,
  "fields" jsonb NOT NULL,
  "requiredDocuments" jsonb NOT NULL,
  "welcomeMessage" varchar(500),
  "coachMessage" varchar(500),
  "defaultProgramTier" program_type NOT NULL DEFAULT 'PHP',
  "approvalWorkflow" varchar(50) NOT NULL DEFAULT 'manual',
  "notes" varchar(1000),
  "createdBy" integer REFERENCES "users"("id"),
  "updatedBy" integer REFERENCES "users"("id"),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
