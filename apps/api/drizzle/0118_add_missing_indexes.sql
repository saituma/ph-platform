-- Add missing indexes for foreign key columns and frequently queried columns.
-- Identified by auditing schema.ts FK references and eq() / desc() usage in src/services/.

-- ============================================================
-- users: email lookups (auth), cognitoSub lookups (auth), role filtering
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_users_email"
  ON "users" ("email");

CREATE INDEX IF NOT EXISTS "idx_users_cognito_sub"
  ON "users" ("cognitoSub");

CREATE INDEX IF NOT EXISTS "idx_users_role"
  ON "users" ("role");

-- ============================================================
-- athletes: userId, guardianId, teamId are the top FK lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_athletes_user_id"
  ON "athletes" ("userId");

CREATE INDEX IF NOT EXISTS "idx_athletes_guardian_id"
  ON "athletes" ("guardianId");

CREATE INDEX IF NOT EXISTS "idx_athletes_team_id"
  ON "athletes" ("teamId");

CREATE INDEX IF NOT EXISTS "idx_athletes_athlete_type"
  ON "athletes" ("athleteType");

CREATE INDEX IF NOT EXISTS "idx_athletes_current_plan_id"
  ON "athletes" ("current_plan_id");

-- ============================================================
-- guardians: userId is queried 27 times
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_guardians_user_id"
  ON "guardians" ("userId");

-- ============================================================
-- enrollments: athleteId lookups, status filtering
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_enrollments_athlete_id"
  ON "enrollments" ("athleteId");

CREATE INDEX IF NOT EXISTS "idx_enrollments_status"
  ON "enrollments" ("status");

-- ============================================================
-- sessions: programId, moduleId FK lookups + ordering by weekNumber/sessionNumber
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_sessions_program_id"
  ON "sessions" ("programId");

CREATE INDEX IF NOT EXISTS "idx_sessions_module_id"
  ON "sessions" ("moduleId");

CREATE INDEX IF NOT EXISTS "idx_sessions_program_week_session"
  ON "sessions" ("programId", "weekNumber", "sessionNumber");

-- ============================================================
-- session_exercises: sessionId FK (7 queries)
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_session_exercises_session_id"
  ON "session_exercises" ("sessionId");

-- ============================================================
-- bookings: athleteId, guardianId, serviceTypeId FKs + status filter + startsAt ordering
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_bookings_athlete_id"
  ON "bookings" ("athleteId");

CREATE INDEX IF NOT EXISTS "idx_bookings_guardian_id"
  ON "bookings" ("guardianId");

CREATE INDEX IF NOT EXISTS "idx_bookings_service_type_id"
  ON "bookings" ("serviceTypeId");

CREATE INDEX IF NOT EXISTS "idx_bookings_status"
  ON "bookings" ("status");

CREATE INDEX IF NOT EXISTS "idx_bookings_starts_at"
  ON "bookings" ("startsAt");

-- ============================================================
-- contents: surface + isActive are the primary filter columns
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_contents_surface"
  ON "contents" ("surface");

CREATE INDEX IF NOT EXISTS "idx_contents_surface_active"
  ON "contents" ("surface", "isActive");

-- ============================================================
-- notifications: userId FK (high frequency)
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id"
  ON "notifications" ("userId");

CREATE INDEX IF NOT EXISTS "idx_notifications_user_read"
  ON "notifications" ("userId", "read");

-- ============================================================
-- audit_logs: performedBy FK + createdAt ordering
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_audit_logs_performed_by"
  ON "audit_logs" ("performedBy");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at"
  ON "audit_logs" ("createdAt");

-- ============================================================
-- subscription_requests: userId, athleteId, planId FKs + status filter
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_subscription_requests_user_id"
  ON "subscription_requests" ("userId");

CREATE INDEX IF NOT EXISTS "idx_subscription_requests_athlete_id"
  ON "subscription_requests" ("athleteId");

CREATE INDEX IF NOT EXISTS "idx_subscription_requests_plan_id"
  ON "subscription_requests" ("planId");

CREATE INDEX IF NOT EXISTS "idx_subscription_requests_status"
  ON "subscription_requests" ("status");

-- ============================================================
-- team_subscription_requests: teamId, adminId, planId FKs + status filter
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_team_subscription_requests_team_id"
  ON "team_subscription_requests" ("teamId");

CREATE INDEX IF NOT EXISTS "idx_team_subscription_requests_admin_id"
  ON "team_subscription_requests" ("adminId");

CREATE INDEX IF NOT EXISTS "idx_team_subscription_requests_plan_id"
  ON "team_subscription_requests" ("planId");

CREATE INDEX IF NOT EXISTS "idx_team_subscription_requests_status"
  ON "team_subscription_requests" ("status");

-- ============================================================
-- video_uploads: athleteId FK (4 queries)
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_video_uploads_athlete_id"
  ON "video_uploads" ("athleteId");

-- ============================================================
-- food_diary: athleteId + guardianId FKs, date filtering
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_food_diary_athlete_id"
  ON "food_diary" ("athleteId");

CREATE INDEX IF NOT EXISTS "idx_food_diary_guardian_id"
  ON "food_diary" ("guardianId");

CREATE INDEX IF NOT EXISTS "idx_food_diary_athlete_date"
  ON "food_diary" ("athleteId", "date");

-- ============================================================
-- availability_blocks: serviceTypeId FK
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_availability_blocks_service_type_id"
  ON "availability_blocks" ("serviceTypeId");

CREATE INDEX IF NOT EXISTS "idx_availability_blocks_starts_at"
  ON "availability_blocks" ("startsAt");

-- ============================================================
-- legal_acceptances: athleteId FK
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_legal_acceptances_athlete_id"
  ON "legal_acceptances" ("athleteId");

-- ============================================================
-- user_locations: userId FK + recordedAt ordering
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_user_locations_user_id"
  ON "user_locations" ("userId");

CREATE INDEX IF NOT EXISTS "idx_user_locations_user_recorded"
  ON "user_locations" ("userId", "recordedAt");

-- ============================================================
-- physio_refferals: athleteId FK
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_physio_refferals_athlete_id"
  ON "physio_refferals" ("athleteId");

-- ============================================================
-- program_section_contents: sectionType + programTier filtering
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_program_section_contents_section_type"
  ON "program_section_contents" ("sectionType");

CREATE INDEX IF NOT EXISTS "idx_program_section_contents_section_tier"
  ON "program_section_contents" ("sectionType", "programTier");

-- ============================================================
-- teams: adminId, planId FKs
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_teams_admin_id"
  ON "teams" ("adminId");

CREATE INDEX IF NOT EXISTS "idx_teams_plan_id"
  ON "teams" ("planId");

-- ============================================================
-- subscription_plans: isActive filter
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_subscription_plans_is_active"
  ON "subscription_plans" ("isActive");

-- ============================================================
-- tracking_goals: teamId FK (queried with scope/audience filters)
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_tracking_goals_team_id"
  ON "tracking_goals" ("teamId");
