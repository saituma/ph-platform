# Global Run Sync Watermark

## Severity
High

## Risk
Run pull watermark is global for the app, not scoped per user.

## Evidence
- `apps/mobile/lib/runSync.ts:12` defines a single key: `run_sync_last_pull`.
- `apps/mobile/lib/runSync.ts:98-99` reads this global key for pull filtering.

## Impact
On shared devices or account switches, one user's watermark can cause another user to miss historical pulls.

## Recommendation
Namespace watermark key by user ID (and optionally team/workspace context).
