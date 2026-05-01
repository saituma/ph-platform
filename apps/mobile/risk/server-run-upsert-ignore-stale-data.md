# Server Run Upsert Uses INSERT OR IGNORE

## Severity
Medium

## Risk
Server pulls do not update existing local rows with the same ID.

## Evidence
- `apps/mobile/lib/sqliteRuns.ts:246` uses `INSERT OR IGNORE` in `upsertRunFromServer`.

## Impact
If server-side run data changes later (feedback, notes, reconciliation), local state can remain stale indefinitely.

## Recommendation
Use an upsert strategy that updates mutable fields on conflict.
