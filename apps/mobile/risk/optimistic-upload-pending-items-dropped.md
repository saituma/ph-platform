# Optimistic Upload Pending Items Dropped

## Severity
Medium

## Risk
Optimistic upload persistence only stores entries that already have `publicUrl`, dropping in-progress/pending items.

## Evidence
- `apps/mobile/hooks/programs/useOptimisticVideos.ts:33` filters to `optimisticUploads.filter(u => u.publicUrl)` before persisting.

## Impact
If the app is closed during upload, pending optimistic items can disappear on restart, causing confusing UI state loss.

## Recommendation
Persist pending entries with phase/progress metadata, not only completed ones.
