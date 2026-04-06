-- Core ordering/join indexes for command-palette queries
CREATE INDEX IF NOT EXISTS users_is_deleted_updated_at_idx
  ON users ("isDeleted", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS athletes_user_id_idx
  ON athletes ("userId");

CREATE INDEX IF NOT EXISTS athletes_guardian_id_idx
  ON athletes ("guardianId");

CREATE INDEX IF NOT EXISTS guardians_user_id_idx
  ON guardians ("userId");

CREATE INDEX IF NOT EXISTS messages_sender_created_at_idx
  ON messages ("senderId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS messages_receiver_created_at_idx
  ON messages ("receiverId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS messages_sender_receiver_created_at_idx
  ON messages ("senderId", "receiverId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS messages_receiver_sender_created_at_idx
  ON messages ("receiverId", "senderId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS messages_receiver_read_created_at_idx
  ON messages ("receiverId", "read", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS chat_groups_created_at_idx
  ON chat_groups ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS chat_group_messages_group_created_at_idx
  ON chat_group_messages ("groupId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS bookings_starts_at_idx
  ON bookings ("startsAt" DESC);

CREATE INDEX IF NOT EXISTS bookings_athlete_id_idx
  ON bookings ("athleteId");

CREATE INDEX IF NOT EXISTS bookings_service_type_id_idx
  ON bookings ("serviceTypeId");

CREATE INDEX IF NOT EXISTS video_uploads_created_at_idx
  ON video_uploads ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS video_uploads_athlete_id_idx
  ON video_uploads ("athleteId");

CREATE INDEX IF NOT EXISTS programs_is_template_created_at_idx
  ON programs ("isTemplate", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS food_diary_guardian_date_created_at_idx
  ON food_diary ("guardianId", "date" DESC, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS food_diary_athlete_date_created_at_idx
  ON food_diary ("athleteId", "date" DESC, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS physio_refferals_athlete_created_at_idx
  ON physio_refferals ("athleteId", "createdAt" DESC);

-- Optional substring-search acceleration via pg_trgm.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping pg_trgm extension (insufficient privilege).';
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS users_name_trgm_idx
      ON users USING gin ("name" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS users_email_trgm_idx
      ON users USING gin ("email" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS athletes_name_trgm_idx
      ON athletes USING gin ("name" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS athletes_team_trgm_idx
      ON athletes USING gin ("team" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS guardians_email_trgm_idx
      ON guardians USING gin ("email" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS chat_groups_name_trgm_idx
      ON chat_groups USING gin ("name" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS service_types_name_trgm_idx
      ON service_types USING gin ("name" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS programs_name_trgm_idx
      ON programs USING gin ("name" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS programs_description_trgm_idx
      ON programs USING gin ("description" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS video_uploads_notes_trgm_idx
      ON video_uploads USING gin ("notes" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS video_uploads_feedback_trgm_idx
      ON video_uploads USING gin ("feedback" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS food_diary_notes_trgm_idx
      ON food_diary USING gin ("notes" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS food_diary_feedback_trgm_idx
      ON food_diary USING gin ("feedback" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS physio_refferals_referal_link_trgm_idx
      ON physio_refferals USING gin ("referalLink" gin_trgm_ops);
  END IF;
END
$$;
