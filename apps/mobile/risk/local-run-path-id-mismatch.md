# Local Run Path ID Mismatch

## Severity
High

## Risk
Tracking history routes local runs using UUID IDs, but run-path screen only accepts numeric IDs.

## Evidence
- `apps/mobile/app/(tabs)/tracking/index.tsx:444` and `:464` push `run.id` (local SQLite ID, UUID).
- `apps/mobile/app/(tabs)/tracking/run-path/[runLogId].tsx:40-43` parses route param with `Number(...)` and rejects non-numeric values.

## Impact
Opening many local runs from Tracking history can fail (invalid run path flow).

## Recommendation
Support both local UUID runs and server numeric runLog IDs in run-path, or route local runs to a dedicated local-detail screen.
