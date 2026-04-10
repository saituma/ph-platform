# Mobile Admin Response Video (Admin → Videos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Mobile Admin role, allow the admin to upload/record a “coach response video” directly from Admin → Videos (video detail modal), send it to the athlete as an admin DM (so the athlete gets the existing push notification), and auto-mark the upload as reviewed after sending.

**Constraints (per approved design):**

- Response video is sent from the Videos tab/modal (not from the Messages tab).
- On successful send, auto-mark the upload as reviewed.
- Push notification text/redirect is handled by existing backend behavior when sending an admin DM with `contentType: "video"` and `videoUploadId`.

**Architecture:**

- UI lives inside the existing Admin Videos detail modal.
- Video picking/recording uses existing Expo Image Picker patterns.
- Upload uses existing presigned upload flow via `useMediaUpload()`.
- Message send uses backend route `POST /admin/messages/:userId` with `{ contentType: "video", mediaUrl, videoUploadId }`.
- Review uses existing `POST /videos/review` flow (same as current feedback submit), with a simple feedback fallback.

---

## File Map

**Modify**

- `apps/mobile/app/_roles/admin/screens/Videos.tsx` — add “Coach Response Video” section; fix refresh callback typing.
- `apps/mobile/hooks/admin/useAdminDms.ts` — fix `sendDm` to call `POST /admin/messages/:userId`.
- `apps/mobile/app/programs/session/[sessionId].tsx` — fix refresh callback typing.
- `apps/mobile/components/programs/ProgramPanels.tsx` (or related) — ensure panel exports resolve.

**Create**

- `apps/mobile/components/programs/panels/FoodDiaryPanel.tsx` — thin wrapper around existing nutrition panel to satisfy imports.

---

## Task 1: Fix current TypeScript breakage (blocking typecheck)

- [ ] **Step 1: Fix pull-to-refresh callback return types**

`ThemedScrollView` expects `onRefresh?: () => void | Promise<void>`. If `load(true)` returns a non-void promise, wrap it:

```ts
onRefresh={() => {
  void load(true);
}}
```

Apply in:

- `apps/mobile/app/programs/session/[sessionId].tsx`
- `apps/mobile/app/_roles/admin/screens/Videos.tsx`

- [ ] **Step 2: Restore missing `FoodDiaryPanel` module**

Create `apps/mobile/components/programs/panels/FoodDiaryPanel.tsx` that exports a component compatible with existing usage by delegating to the existing nutrition panel.

- [ ] **Step 3: Validate**

Run: `pnpm -C apps/mobile typecheck`

---

## Task 2: Fix admin DM send endpoint mismatch

- [ ] **Step 1: Update `sendDm` to hit backend route**

Change from `POST /admin/messages` to `POST /admin/messages/:userId`.

Expected call shape:

```ts
apiRequest(`/admin/messages/${userId}`, {
  method: "POST",
  body: {
    content,
    contentType,
    mediaUrl,
    videoUploadId,
  },
});
```

- [ ] **Step 2: Validate**

Run: `pnpm -C apps/mobile typecheck`

---

## Task 3: Implement “Coach Response Video” inside Admin Videos modal

- [ ] **Step 1: Add UI section in modal**

Inside the existing selected-video modal (beneath current actions):

- Buttons: “Choose video” and “Record video”
- A small “Selected: …” row (filename or last path segment)
- Button: “Send response video”

- [ ] **Step 2: Pick/record video and keep it in local state**

Use expo-image-picker to pick or record a single video. Store:

- `uri`
- `fileName` (if available)
- `mimeType`

- [ ] **Step 3: Upload then send DM**

Flow:

1. upload via `useMediaUpload()` to get `mediaUrl`
2. call `sendDm(athleteUserId, { contentType: "video", mediaUrl, videoUploadId })`

- [ ] **Step 4: Auto-mark reviewed**

After DM send succeeds, call existing review endpoint:

- `POST /videos/review` with `{ videoUploadId, reviewed: true, feedback }`
- Use existing typed feedback if available, else fallback: `"Coach sent a response video."`

- [ ] **Step 5: Update local list state**

Update the `items` list entry for that upload so it reflects `reviewedAt` (and feedback if returned) and closes the modal.

- [ ] **Step 6: Validate**

Run: `pnpm -C apps/mobile typecheck`

---

## Self-review checklist

- [ ] Admin can choose or record a response video from Admin → Videos detail modal.
- [ ] Tapping “Send response video” uploads media, sends admin DM to the athlete, and triggers the existing push notification behavior.
- [ ] The upload is auto-marked reviewed after sending.
- [ ] `pnpm -C apps/mobile typecheck` passes.
