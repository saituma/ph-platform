-- PR-11: DB query audit — missing FK indexes and hot-path index additions
-- All indexes use CONCURRENTLY so they can be applied without table locks in production.
-- Note: CONCURRENTLY cannot run inside a transaction block; run each statement individually
-- or use psql with autocommit=on.

-- ── athletes ──────────────────────────────────────────────────────────────────
-- userId is the primary join key for auth/me lookups (called on every request).
CREATE INDEX CONCURRENTLY IF NOT EXISTS athletes_user_id_idx ON athletes (user_id);
-- guardianId is used in every guardian → children lookup.
CREATE INDEX CONCURRENTLY IF NOT EXISTS athletes_guardian_id_idx ON athletes (guardian_id);
-- currentProgramTier is filtered on in content and messaging access checks.
CREATE INDEX CONCURRENTLY IF NOT EXISTS athletes_current_program_tier_idx ON athletes (current_program_tier);
-- teamId is used when filtering athletes by team (team coaches, admin user list).
CREATE INDEX CONCURRENTLY IF NOT EXISTS athletes_team_id_idx ON athletes (team_id);

-- ── guardians ─────────────────────────────────────────────────────────────────
-- userId is the primary lookup for guardian auth/me and portal access.
CREATE INDEX CONCURRENTLY IF NOT EXISTS guardians_user_id_idx ON guardians (user_id);

-- ── bookings ──────────────────────────────────────────────────────────────────
-- athleteId and guardianId are FKs with no indexes — queried in list and cancel flows.
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_athlete_id_idx ON bookings (athlete_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_guardian_id_idx ON bookings (guardian_id);
-- startsAt is ordered/filtered in dashboard "today" queries and date-range reports.
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_starts_at_idx ON bookings (starts_at);
-- status is filtered in active-booking counts (capacity checks on every booking request).
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_status_idx ON bookings (status);

-- ── subscription_requests ─────────────────────────────────────────────────────
-- userId and athleteId are FKs used in billing status lookups.
CREATE INDEX CONCURRENTLY IF NOT EXISTS subscription_requests_user_id_idx ON subscription_requests (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS subscription_requests_athlete_id_idx ON subscription_requests (athlete_id);
-- status is filtered when checking pending/approved requests.
CREATE INDEX CONCURRENTLY IF NOT EXISTS subscription_requests_status_idx ON subscription_requests (status);

-- ── notifications ─────────────────────────────────────────────────────────────
-- userId is the only access pattern for in-app notification feeds.
CREATE INDEX CONCURRENTLY IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
-- Composite for unread-count queries (userId + read=false).
CREATE INDEX CONCURRENTLY IF NOT EXISTS notifications_user_read_idx ON notifications (user_id, read);

-- ── video_uploads ─────────────────────────────────────────────────────────────
-- athleteId is the primary lookup and FK with no index.
CREATE INDEX CONCURRENTLY IF NOT EXISTS video_uploads_athlete_id_idx ON video_uploads (athlete_id);
-- reviewedAt is used in "pending feedback" dashboard queries (IS NULL filter).
CREATE INDEX CONCURRENTLY IF NOT EXISTS video_uploads_reviewed_at_idx ON video_uploads (reviewed_at);

-- ── contents ──────────────────────────────────────────────────────────────────
-- surface is the primary partition key (home / announcements / legal / parent_platform).
-- Every content read queries by surface; without this index the table is seq-scanned.
CREATE INDEX CONCURRENTLY IF NOT EXISTS contents_surface_idx ON contents (surface);
-- Composite for active announcement queries (surface + is_active).
CREATE INDEX CONCURRENTLY IF NOT EXISTS contents_surface_is_active_idx ON contents (surface, is_active);
