# Media Upload Lacks Retry Policy

## Severity
Medium

## Risk
Attachment upload performs a single `uploadAsync` attempt with no retry/backoff strategy.

## Evidence
- `apps/mobile/hooks/messages/useMediaUpload.ts:33-43` performs one `FileSystem.uploadAsync(...)` call.

## Impact
Transient network errors can cause avoidable message attachment failures.

## Recommendation
Add bounded retry with exponential backoff and explicit retryable error classification.
