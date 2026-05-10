-- PR-11: DB query audit — missing FK indexes and hot-path index additions

-- ── athletes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS athletes_user_id_idx ON athletes (user_id);
CREATE INDEX IF NOT EXISTS athletes_guardian_id_idx ON athletes (guardian_id);
CREATE INDEX IF NOT EXISTS athletes_current_program_tier_idx ON athletes (current_program_tier);
CREATE INDEX IF NOT EXISTS athletes_team_id_idx ON athletes (team_id);

-- ── guardians ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS guardians_user_id_idx ON guardians (user_id);

-- ── bookings ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS bookings_athlete_id_idx ON bookings (athlete_id);
CREATE INDEX IF NOT EXISTS bookings_guardian_id_idx ON bookings (guardian_id);
CREATE INDEX IF NOT EXISTS bookings_starts_at_idx ON bookings (starts_at);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);

-- ── subscription_requests ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS subscription_requests_user_id_idx ON subscription_requests (user_id);
CREATE INDEX IF NOT EXISTS subscription_requests_athlete_id_idx ON subscription_requests (athlete_id);
CREATE INDEX IF NOT EXISTS subscription_requests_status_idx ON subscription_requests (status);

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications (user_id, read);

-- ── video_uploads ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS video_uploads_athlete_id_idx ON video_uploads (athlete_id);
CREATE INDEX IF NOT EXISTS video_uploads_reviewed_at_idx ON video_uploads (reviewed_at);

-- ── contents ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS contents_surface_idx ON contents (surface);
CREATE INDEX IF NOT EXISTS contents_surface_is_active_idx ON contents (surface, is_active);
