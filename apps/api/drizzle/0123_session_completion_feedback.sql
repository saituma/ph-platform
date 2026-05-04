ALTER TABLE "program_session_completions" ADD COLUMN IF NOT EXISTS "video_url" varchar(500);
ALTER TABLE "program_session_completions" ADD COLUMN IF NOT EXISTS "weights_used" text;
ALTER TABLE "program_session_completions" ADD COLUMN IF NOT EXISTS "reps_completed" text;
ALTER TABLE "program_session_completions" ADD COLUMN IF NOT EXISTS "rpe" integer;
ALTER TABLE "program_session_completions" ADD COLUMN IF NOT EXISTS "coach_response" text;
ALTER TABLE "program_session_completions" ADD COLUMN IF NOT EXISTS "coach_response_at" timestamp;
