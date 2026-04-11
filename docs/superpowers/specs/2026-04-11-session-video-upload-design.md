# Session Detail Video Upload (Athletes) — Design

**Date:** 2026-04-11

## Goal

Move the entire “video upload / preview / send to coach / coach response” flow into the **Session Detail** screen for athletes, and remove the separate “Video Upload” surface from the Program Detail page.

## Non-goals

- Deleting already-uploaded videos from the server.
- Changing coach/admin review tooling.

## Requirements

### Program Detail (athlete-facing)

- Hide/remove the **“Video Upload”** tab for athlete/guardian roles.

### Session Detail (athlete-facing, per session item with `allowVideoUpload`)

- **Upload entry point:** “Upload video” action supports **Record** and **Library**.
- **Pending preview (before submit):**
  - After selecting a video, show an inline **Preview** card in the session item.
  - Allow **Remove** to clear the pending selection.
  - Allow entering **Notes to coach**.
  - Allow **Send to coach** to upload + create the video upload record with notes.
- **After submit:**
  - Show the uploaded clip inline in the session item.
  - If/when coach feedback exists, show it in a **Coach response** section in that same item.

## UX Notes

- Only one upload should run at a time (simple global upload state is acceptable).
- Errors should be visible near the pending preview.

