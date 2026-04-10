# Mobile Admin: Coach Response Video (from Videos tab)

## Summary

Enable Admin (coach) users to send a response/reply video to an athlete directly from the Admin → Videos upload detail modal, mirroring the web “Coach Response Video” workflow.

The response video is sent as an admin DM message with `contentType: "video"` and includes `videoUploadId` so:

- The athlete receives the push notification (“Coach sent a response to {session name}”).
- Tapping the notification deep-links to the relevant session/video context (existing push/deep link behavior).

After a response video is sent, the upload is marked reviewed so it leaves the review queue.

## Goals

- Allow Admin to attach/record a video response inside the Admin Videos detail modal.
- Upload that video to storage, then send it as an admin DM to the athlete.
- Auto-mark the upload as reviewed after sending (using fallback feedback if needed).
- Keep the admin workflow inside the Videos tab (no requirement to navigate to the Messages tab).

## Non-goals

- Building a new messaging UI or thread view.
- Adding additional review filters, queue views, or new screens.
- Changing the athlete-side UX beyond existing message rendering + existing notification deep-link behavior.

## Current Context (existing code)

- Mobile Admin Videos screen already supports:
  - Listing pending uploads (`GET /admin/videos?limit=50`).
  - Viewing upload details in a modal.
  - Submitting written feedback (`POST /videos/review`), which marks reviewed.
  - “Reply in Messages” handoff exists, but this feature must work without requiring it.
- Mobile already has an upload pipeline used for chat/admin messaging:
  - `useMediaUpload(token)` uses `POST /media/presign` then `PUT` to the presigned URL.
  - Attachment picking is done via `expo-image-picker`.
- Backend admin message endpoint expects `POST /admin/messages/:userId`.

## Proposed UX (Admin → Videos detail modal)

### New section: “Coach Response Video”

Displayed within the existing upload detail modal.

**States**

1. **Empty**

- Buttons:
  - “Choose video” (media library)
  - “Record video” (camera)

2. **Selected**

- Show: “1 video selected” (with file name if available)
- Actions:
  - “Remove”
  - Primary: “Send response”

3. **Busy (uploading/sending/reviewing)**

- Disable all actions
- Show a compact spinner + status text (e.g., “Uploading…” / “Sending…”)

4. **Error**

- Inline error text near the section (e.g., “Failed to upload video.”)

### Behavior on “Send response”

1. Validate prerequisites:
   - `athleteUserId` must exist on upload.
   - `uploadId` must exist.
   - A pending attachment must exist.
2. Upload attachment → obtain `mediaUrl`.
3. Send admin DM with video:
   - Endpoint: `POST /admin/messages/:userId`
   - Body:
     - `content: ""`
     - `contentType: "video"`
     - `mediaUrl`
     - `videoUploadId: uploadId`
4. Mark reviewed:
   - Endpoint: `POST /videos/review`
   - Body:
     - `uploadId`
     - `feedback`: use the existing feedback draft if non-empty, else fallback `"Coach sent a response video."`
5. Update local list state:
   - Set `reviewedAt` and `feedback` for this upload so it leaves the pending queue.
6. Clear pending attachment and show a lightweight success confirmation (either a toast/alert or subtle inline status depending on existing patterns).

## API Contract

### Upload

- `POST /media/presign` (existing)
- `PUT {uploadUrl}` (existing)

### Send DM (must match backend routes)

- `POST /admin/messages/:userId`
- Request body:
  - `content?: string` (can be empty)
  - `contentType: "video"`
  - `mediaUrl: string` (required for video)
  - `videoUploadId: number` (required for response-video notifications)

### Review

- `POST /videos/review`
- Request body:
  - `uploadId: number`
  - `feedback: string`

## Implementation Notes

- Reuse `useMediaUpload(token)` for upload.
- Add minimal attachment state to Admin Videos modal:
  - `pendingResponseVideo: PendingAttachment | null`
  - `isSendingResponseVideo: boolean`
  - `responseVideoError: string | null`
- Prefer keeping this implementation local to the Admin Videos screen/modal to avoid introducing new global flows.

### Known mismatch to fix

Mobile admin DM hook currently posts to `/admin/messages` (without `/:userId`). Backend expects `/admin/messages/:userId`.

- Update the mobile admin DM sender to call the correct route.

## Error Handling

- Missing athlete user id or upload id → show blocking alert and do not attempt send.
- Upload fails → inline error, keep attachment selected for retry.
- Send fails → inline error, keep attachment selected for retry.
- Review fails after send succeeds → show inline error but do not rollback the message; allow manual retry of “Mark reviewed” via existing feedback submit or reattempt send flow.

## Acceptance Criteria

- Admin can choose/record a video in the Admin Videos detail modal.
- Admin can send the response; the athlete receives the DM video and the push notification flow triggers (server-side).
- The upload is marked reviewed after send and leaves the pending queue.
- No navigation to the Messages tab is required to send.

## Validation Plan

- Mobile typecheck passes.
- Manual smoke test:
  - Pick video → send → confirm reviewed state updates.
  - Record video → send → confirm reviewed state updates.
  - Simulate failures (no network) → see actionable error and retry works.
- Optional: add a focused unit test where patterns already exist (only if the repo already has similar tests for hooks/utilities).
