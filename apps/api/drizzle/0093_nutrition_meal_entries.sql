ALTER TABLE "nutrition_logs" ADD COLUMN IF NOT EXISTS "mealType" varchar(30) NOT NULL DEFAULT 'daily';--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN IF NOT EXISTS "loggedAt" timestamp NOT NULL DEFAULT now();--> statement-breakpoint
DROP INDEX IF EXISTS "nutrition_logs_user_date_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nutrition_logs_user_date_meal_unique"
  ON "nutrition_logs" ("userId", "dateKey", "mealType");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nutrition_logs_user_date_idx"
  ON "nutrition_logs" ("userId", "dateKey");--> statement-breakpoint
