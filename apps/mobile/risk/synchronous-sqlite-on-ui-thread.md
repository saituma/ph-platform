# Synchronous SQLite On UI Thread

## Severity
Medium

## Risk
Tracking DB operations use synchronous SQLite APIs from UI-driven paths.

## Evidence
- DB opened synchronously:
  - `apps/mobile/lib/sqliteRuns.ts:23` (`openDatabaseSync`)
- Write/read paths use sync APIs (`runSync`, `getAllSync`, `getFirstSync`) throughout the module.

## Impact
Under larger local history, this can add jank/stalls during navigation and run screen updates.

## Recommendation
Move heavy read/write paths to async DB access or schedule work off critical UI interactions.
