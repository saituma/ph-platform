ALTER TABLE "video_uploads" ADD COLUMN "trainingSessionItemId" integer;
ALTER TABLE "video_uploads" ADD CONSTRAINT "video_uploads_trainingSessionItemId_training_session_items_id_fk" FOREIGN KEY ("trainingSessionItemId") REFERENCES "public"."training_session_items"("id") ON DELETE set null;

CREATE INDEX IF NOT EXISTS video_uploads_training_session_item_id_idx
  ON video_uploads ("trainingSessionItemId");
