ALTER TABLE "wellbeing_logs" RENAME COLUMN "user_id" TO "userId";
--> statement-breakpoint
ALTER TABLE "wellbeing_logs" RENAME COLUMN "date_key" TO "dateKey";
--> statement-breakpoint
ALTER TABLE "wellbeing_logs" RENAME COLUMN "coach_feedback" TO "coachFeedback";
--> statement-breakpoint
ALTER TABLE "wellbeing_logs" RENAME COLUMN "coach_id" TO "coachId";
--> statement-breakpoint
ALTER TABLE "wellbeing_logs" RENAME COLUMN "created_at" TO "createdAt";
--> statement-breakpoint
ALTER TABLE "wellbeing_logs" RENAME COLUMN "updated_at" TO "updatedAt";
--> statement-breakpoint
DROP INDEX IF EXISTS "wellbeing_logs_user_date_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "wellbeing_logs_user_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "wellbeing_logs_date_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wellbeing_logs_user_date_unique" ON "wellbeing_logs" USING btree ("userId","dateKey");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wellbeing_logs_user_idx" ON "wellbeing_logs" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wellbeing_logs_date_idx" ON "wellbeing_logs" USING btree ("dateKey");
