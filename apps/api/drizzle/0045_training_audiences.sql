CREATE TABLE IF NOT EXISTS "training_audiences" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "label" varchar(64) NOT NULL,
  "createdBy" integer NOT NULL REFERENCES "users"("id"),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "training_audiences_label_unique" ON "training_audiences" ("label");
