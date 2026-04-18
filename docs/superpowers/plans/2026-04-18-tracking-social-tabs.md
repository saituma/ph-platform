# Tracking Social Tabs (Adult Athletes Only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Tracking header tab switch (Running/Social) for adult athletes only, and implement Social leaderboard/feed/comments/share backed by new API endpoints with basic UGC controls (report + delete own comment).

**Architecture:** Keep navigation simple (expo-router routes under `/(tabs)/tracking`). Social fetches via `apiRequest` from new `/social/*` endpoints. API uses drizzle queries over existing `run_logs` + `run_comments` + `athletes` + `users`, with strict “adult athlete only” gating and public-run visibility.

**Tech Stack:** Expo Router, React Native, Async fetch via `apiRequest`, Express, Drizzle ORM, Postgres schema already includes `run_logs` and `run_comments`.

---

## File/Module Map

**Mobile (create)**
- `apps/mobile/app/(tabs)/tracking/social.tsx` (new Social screen)
- `apps/mobile/components/tracking/TrackingHeaderTabs.tsx` (Running/Social segmented header)
- `apps/mobile/services/tracking/socialService.ts` (API wrappers + types)
- `apps/mobile/components/tracking/social/CommentsSheet.tsx` (modal for list/add/delete/report comments)

**Mobile (modify)**
- `apps/mobile/app/(tabs)/tracking/index.tsx` (render header tabs)
- `apps/mobile/roles/shared/tabs.ts` (remove Tracking from base routes)
- `apps/mobile/roles/adult/tabs.ts` (add Tracking for adults)

**API (create)**
- `apps/api/src/controllers/social.controller.ts`
- `apps/api/src/routes/social.routes.ts`
- `apps/api/src/services/social.service.ts`

**API (modify)**
- `apps/api/src/routes/index.ts` (mount social routes)

**Tests**
- `apps/api/src/services/social.service.test.ts` (or controller tests if project has pattern; otherwise minimal unit tests for gating/queries)
- `apps/mobile/test/socialService.test.ts` (optional; only if quick)

---

## Task 1: Make Tracking Tab Adult-Only (Mobile Tabs)

**Files:**
- Modify: `apps/mobile/roles/shared/tabs.ts`
- Modify: `apps/mobile/roles/adult/tabs.ts`

- [ ] Remove the `tracking` entry from `BASE_TEAM_TAB_ROUTES` in `apps/mobile/roles/shared/tabs.ts`.
- [ ] In `apps/mobile/roles/adult/tabs.ts`, define `ADULT_TAB_ROUTES` as `BASE_TEAM_TAB_ROUTES` plus a `tracking` tab item inserted (same icon/label as before).
- [ ] Run: `pnpm --filter mobile typecheck`
- [ ] Commit:

```bash
git add apps/mobile/roles/shared/tabs.ts apps/mobile/roles/adult/tabs.ts
git commit -m "feat(mobile): make tracking tab adult-only"
```

---

## Task 2: Add Tracking Header Tabs Component (Running/Social)

**Files:**
- Create: `apps/mobile/components/tracking/TrackingHeaderTabs.tsx`

- [ ] Implement a segmented control header with two options:
  - Running -> `router.replace("/(tabs)/tracking")`
  - Social -> `router.replace("/(tabs)/tracking/social")`
- [ ] Component props: `active: "running" | "social"`, `colors`, `isDark`, optional `topInset`.
- [ ] Run: `pnpm --filter mobile typecheck`
- [ ] Commit:

```bash
git add apps/mobile/components/tracking/TrackingHeaderTabs.tsx
git commit -m "feat(mobile): add tracking header tabs"
```

---

## Task 3: Wire Header Tabs Into Running Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/tracking/index.tsx`

- [ ] Render `TrackingHeaderTabs active="running"` at the top of the screen (inside the scroll view with adequate padding so it doesn’t overlap content).
- [ ] Ensure Start Run flow unchanged.
- [ ] Run: `pnpm --filter mobile typecheck`
- [ ] Commit:

```bash
git add "apps/mobile/app/(tabs)/tracking/index.tsx"
git commit -m "feat(mobile): show header tabs in tracking running screen"
```

---

## Task 4: Add Social Service (Mobile)

**Files:**
- Create: `apps/mobile/services/tracking/socialService.ts`

- [ ] Add typed wrappers:
  - `fetchLeaderboard(token, windowDays=7, limit=50)`
  - `fetchAdultDirectory(token, limit=50, cursor?)`
  - `fetchRunFeed(token, limit=20, cursor?)`
  - `fetchRunComments(token, runLogId)`
  - `postRunComment(token, runLogId, content)`
  - `deleteComment(token, commentId)`
  - `reportComment(token, commentId, reason?)`
- [ ] Run: `pnpm --filter mobile typecheck`
- [ ] Commit:

```bash
git add apps/mobile/services/tracking/socialService.ts
git commit -m "feat(mobile): add tracking social service"
```

---

## Task 5: Social Screen (Leaderboard + Feed + Share + Comments)

**Files:**
- Create: `apps/mobile/app/(tabs)/tracking/social.tsx`
- Create: `apps/mobile/components/tracking/social/CommentsSheet.tsx`

- [ ] Social screen:
  - Renders `TrackingHeaderTabs active="social"`.
  - Loads leaderboard + feed on mount (and pull-to-refresh).
  - Each feed item shows distance/time/pace + comment count.
  - Share button uses `Share.share({ message })`.
  - Comment button opens `CommentsSheet` for that `runLogId`.
- [ ] CommentsSheet:
  - Lists comments.
  - Add comment text input + submit.
  - For own comment: Delete.
  - For others: Report.
- [ ] Run: `pnpm --filter mobile test` and `pnpm --filter mobile typecheck`
- [ ] Commit:

```bash
git add "apps/mobile/app/(tabs)/tracking/social.tsx" apps/mobile/components/tracking/social/CommentsSheet.tsx
git commit -m "feat(mobile): add tracking social screen"
```

---

## Task 6: Social API (Adult-Only) + UGC Controls

**Files:**
- Create: `apps/api/src/services/social.service.ts`
- Create: `apps/api/src/controllers/social.controller.ts`
- Create: `apps/api/src/routes/social.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] Implement an internal guard `assertAdultAthlete(userId)`:
  - Query `athletes` by `userId`, require `athleteType = "adult"`.
  - Throw a typed error or return null -> controller returns 403.
- [ ] Implement:
  - Leaderboard query: sum distanceMeters over windowDays for public runs and adult athletes.
  - Adult directory: list adult athletes (name + profilePicture), paginated by userId cursor.
  - Runs feed: list `run_logs` where `visibility="public"` and user is adult athlete; include commentCount.
  - Comments list/create/delete/report.
    - Delete: only comment owner.
    - Report: insert an `audit_logs` record with action `"run_comment_reported"`, include target table/id.
- [ ] Mount routes at `/social`.
- [ ] Run API tests (if present) or at minimum `pnpm --filter api test` / typecheck as appropriate for repo.
- [ ] Commit:

```bash
git add apps/api/src/services/social.service.ts apps/api/src/controllers/social.controller.ts apps/api/src/routes/social.routes.ts apps/api/src/routes/index.ts
git commit -m "feat(api): add social leaderboard and run comments"
```

---

## Task 7: End-to-End Smoke

- [ ] Mobile: `pnpm --filter mobile typecheck` + `pnpm --filter mobile test`
- [ ] API: run existing test suite or quick local call once server is up.
- [ ] Manual: login as adult athlete, open Tracking -> Social, verify:
  - Leaderboard loads
  - Feed loads
  - Share opens
  - Comment add/delete/report works
  - Non-adult roles do not see Tracking tab

