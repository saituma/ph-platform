# Pulled Runs Missing User Binding

## Severity
High

## Risk
Runs pulled from server are inserted without `user_id`, but local queries for logged-in users require `user_id = ?`.

## Evidence
- Pull mapper omits `user_id` in `upsertRunFromServer` input:
  - `apps/mobile/lib/runSync.ts:110-122`
- User-scoped reads require explicit user ID:
  - `apps/mobile/lib/sqliteRuns.ts:101-107`
- Upsert defaults to `user_id ?? null`:
  - `apps/mobile/lib/sqliteRuns.ts:260-262`

## Impact
Pulled runs can be effectively invisible in logged-in views.

## Recommendation
Populate `user_id` during pull (current authenticated user ID or server-provided owner ID).
