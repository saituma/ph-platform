ALTER TABLE session_exercises
  ADD COLUMN sets_override integer,
  ADD COLUMN reps_override integer,
  ADD COLUMN duration_override integer,
  ADD COLUMN rest_seconds_override integer;
