# Session Detail Inline Video Upload/Review (Mobile)

Date: 2026-04-11

## Goal

- Remove the **video review/upload tab or sheet** from **Program Detail**.
- Ensure the full flow happens **inline** in **Session Detail** (no modal/sheet for video):
  - upload (record/library)
  - preview
  - send to coach
  - coach response visible in Session Detail

## Non-goals

- Do not change/replace the **workout logging sheet** shown when completing an adult session.
- Do not redesign program content, training tabs, or backend API behavior.
- Do not remove the standalone `video-upload` route.

## Current State (Observed)

- Program Detail uses tab list from `trainingContentV2.tabs` (or `Modules`) and can include a "Video Upload" tab.
- Session Detail currently opens a **modal** containing `VideoUploadPanel` after an Alert choice.
- `VideoUploadPanel` provides upload + preview + send-to-coach + coach responses, but it uses internal modals.
- Session Detail already renders uploaded clips and feedback inline per section content item via `/videos?sectionContentId=...`.

## Proposed UX

### Program Detail

- Filter the Program Detail tab bar to **exclude** tabs labeled `Video Upload` and `Video Review`.
- If the user was on a removed tab, automatically switch to the first remaining tab.

### Session Detail (Inline)

Within each session item where `allowVideoUpload` is true (and the user has upload access):

- Inline controls directly in the item card:
  - A "Coach Notes" multi-line input (optional)
  - Buttons: "Record" and "Library"
- After selecting a video:
  - Inline preview player
  - Buttons: "Send to Coach" and "Cancel"
- During upload:
  - Inline status/progress indicator; disable controls
- After successful upload:
  - Clear selected video + notes
  - Refresh uploads for that section so the existing inline "Uploaded Video" + "Feedback" areas show updates

## Technical Approach

- Remove the modal flow from `ProgramSessionDetailScreen`.
- Move upload/pick/preview/send logic into the session item UI (the existing session block component).
  - Use existing `useVideoUploadLogic()` for the upload request + progress.
  - Use `expo-image-picker` and `expo-file-system/legacy` for selection + size validation.
  - Reuse existing `VideoPlayer` for preview.
- After upload, refresh via the existing `loadUploadsForSection(sectionContentId, true)`.

## Acceptance Criteria

- Program Detail no longer shows any "Video Upload" / "Video Review" tab.
- Session Detail supports record/library selection and upload **without opening any modal/sheet**.
- User can preview before sending.
- After sending, coach response appears inline on Session Detail when available.
- Adult workout logging sheet behavior remains unchanged.
