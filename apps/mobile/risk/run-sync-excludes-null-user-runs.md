# Run Sync Excludes Null-User Runs

## Severity
Medium

## Risk
Sync query only loads unsynced runs for the current user ID, excluding `user_id IS NULL` runs created before auth is attached.

## Evidence
- `apps/mobile/lib/runSync.ts:42` calls `getUnsyncedRuns(userId)`.
- `apps/mobile/lib/sqliteRuns.ts:198-203` returns either `user_id = ?` OR `user_id IS NULL`, not both when `userId` exists.

## Impact
Pre-auth or orphaned local runs may never sync after login.

## Recommendation
When logged in, include both current user runs and null-user unsynced runs, then backfill ownership before sync.
