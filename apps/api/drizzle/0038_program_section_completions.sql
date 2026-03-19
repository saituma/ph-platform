CREATE TABLE IF NOT EXISTS "program_section_completions" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "athleteId" integer NOT NULL REFERENCES "athletes"("id"),
  "programSectionContentId" integer NOT NULL REFERENCES "program_section_contents"("id"),
  "rpe" integer,
  "soreness" integer,
  "fatigue" integer,
  "notes" varchar(500),
  "completedAt" timestamp DEFAULT now() NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "program_section_completions_athlete_idx" ON "program_section_completions" ("athleteId");
CREATE INDEX IF NOT EXISTS "program_section_completions_content_idx" ON "program_section_completions" ("programSectionContentId");
CREATE INDEX IF NOT EXISTS "program_section_completions_completed_at_idx" ON "program_section_completions" ("completedAt");

