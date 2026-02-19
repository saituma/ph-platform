DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'food_diary' AND column_name = 'reviewedByCoach'
  ) THEN
    ALTER TABLE "food_diary" ADD COLUMN "reviewedByCoach" integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'food_diary' AND column_name = 'feedback'
  ) THEN
    ALTER TABLE "food_diary" ADD COLUMN "feedback" varchar(2000);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'food_diary' AND column_name = 'reviewedAt'
  ) THEN
    ALTER TABLE "food_diary" ADD COLUMN "reviewedAt" timestamp;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'food_diary_reviewedByCoach_users_id_fk'
  ) THEN
    ALTER TABLE "food_diary"
      ADD CONSTRAINT "food_diary_reviewedByCoach_users_id_fk"
      FOREIGN KEY ("reviewedByCoach") REFERENCES "public"."users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;
