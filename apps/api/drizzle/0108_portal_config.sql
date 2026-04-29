CREATE TABLE IF NOT EXISTS "portal_configs" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "hero" jsonb,
  "features" jsonb,
  "testimonials" jsonb,
  "cta" jsonb,
  "footer" jsonb,
  "updatedBy" integer REFERENCES "users"("id"),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
