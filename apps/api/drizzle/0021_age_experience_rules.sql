CREATE TABLE IF NOT EXISTS "age_experience_rules" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "title" varchar(255) NOT NULL,
  "minAge" integer,
  "maxAge" integer,
  "isDefault" boolean NOT NULL DEFAULT false,
  "uiPreset" varchar(32) NOT NULL DEFAULT 'standard',
  "fontSizeOption" varchar(16) NOT NULL DEFAULT 'default',
  "density" varchar(16) NOT NULL DEFAULT 'default',
  "hiddenSections" jsonb,
  "createdBy" integer REFERENCES "users" ("id"),
  "updatedBy" integer REFERENCES "users" ("id"),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
