# Attachment Content-Type Downgrade To Text

## Severity
Medium

## Risk
Non-image/non-video attachments are forced to `contentType: "text"`.

## Evidence
- `apps/mobile/hooks/messages/useMediaUpload.ts:48-55` maps all other MIME types to `"text"`.

## Impact
Documents/files can be misclassified, reducing correct rendering/preview behavior and breaking downstream assumptions.

## Recommendation
Introduce explicit `file`/`document` content type (or preserve MIME-derived type taxonomy end-to-end).
