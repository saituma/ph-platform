# Session Detail Video Upload (Athletes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Program Detail “Video Upload” tab for athletes and complete the upload/preview/send/coach-response flow inside the Session Detail screen.

**Architecture:** Keep upload state inside `app/programs/session/[sessionId].tsx`, keyed by `sectionContentId` (session item id). Render pending preview + actions inside `SessionExerciseBlock` so it appears inline with the session item UI.

**Tech Stack:** Expo Router, React Native, `expo-image-picker`, `expo-file-system`, existing `/media/presign` + `/videos` APIs.

---

### Task 1: Hide “Video Upload” tab for athletes

**Files:**
- Modify: `apps/mobile/components/programs/ProgramDetailPanel.tsx`

- [ ] **Step 1: Filter tabs for athlete-facing roles**

Implement a filter so tabs equal to `"Video Upload"` are removed when `appRole !== "coach"`.

- [ ] **Step 2: Manual verify**

Run: `pnpm --filter mobile start`

Expected: Program detail tab bar no longer shows “Video Upload” for athletes/guardians.

---

### Task 2: Replace Session Detail video-review modal with inline pending preview

**Files:**
- Modify: `apps/mobile/app/programs/session/[sessionId].tsx`
- Modify: `apps/mobile/components/programs/SessionExerciseBlock.tsx`

- [ ] **Step 1: Add pending selection state to Session Detail**

Add state keyed by `sectionContentId` with:
- selected video (uri, name, contentType, sizeBytes)
- notes string
- progress + error for UI

- [ ] **Step 2: Add “Record/Library” picker that populates pending state**

Use `expo-image-picker` + `expo-file-system/legacy` like the existing `VideoUploadPanel`:
- request permissions
- pick/record video
- size check (e.g. 200MB guard)
- set pending entry

- [ ] **Step 3: Add “Send to coach” using existing upload logic**

Use `useVideoUploadLogic(token, athleteUserId)`:

```ts
await uploadVideo({
  video: pending.video,
  notes: pending.notes,
  sectionContentId,
  onProgress: (p) => set progress for that sectionContentId,
});
```

On success:
- clear pending for that section
- `loadUploadsForSection(sectionContentId, true)`
- `load(true)` to refresh session data

- [ ] **Step 4: Render pending preview UI inline per item**

In `SessionExerciseBlock`, when a pending entry exists for `item.id`:
- show `VideoPlayer` preview
- show notes `TextInput`
- show buttons: **Remove**, **Send to coach**
- show uploading spinner/progress and show errors near the preview

- [ ] **Step 5: Manual verify**

Run: `pnpm --filter mobile start`

Expected:
- Tapping upload -> record/library -> returns to session item
- Pending preview appears with Remove + Send to coach
- Remove clears preview
- Send uploads and then uploaded clip shows inline
- Coach feedback (when present) shows inline under uploaded clip

