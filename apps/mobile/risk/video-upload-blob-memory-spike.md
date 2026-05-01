# Video Upload Blob Memory Spike

## Severity
High

## Risk
Video upload reads the entire local file into a blob before sending.

## Evidence
- `apps/mobile/hooks/programs/useVideoUploadLogic.ts:19-20`:
  - `const fileRes = await fetch(fileUri);`
  - `const blob = await fileRes.blob();`

## Impact
Large videos can cause high memory pressure or crashes on lower-memory devices.

## Recommendation
Use true streaming/chunked upload or native file upload APIs that avoid full in-memory blob materialization.
