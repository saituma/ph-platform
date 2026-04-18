# Tracking Social Tabs (Adult Athletes Only) — Design

Date: 2026-04-18

Target: `apps/mobile` + `apps/api`

## Goal

Add an adult-athlete-only Social experience under the Tracking tab:

- A header tab switch with two tabs: `Running` and `Social`
- Social includes:
  - Adult athlete directory list (adults only)
  - Leaderboard of top kms (adults only)
  - Public runs feed (adults only)
  - Comments on runs (adult athletes only)
  - Share run (native share sheet)

## Scope / Access Rules

1. **Only adult athletes** can access Tracking and Social.
2. No youth, no team, no coach/admin access to Tracking.
3. Social surfaces only adult athletes.

Implementation notes:

- Mobile gating: ensure the Tracking tab is visible for `adult_athlete` only.
- API gating: endpoints require auth and must only return adult athletes and adult runs.

## UX / Navigation

### Tracking Header Tabs

Within `apps/mobile/app/(tabs)/tracking`, add two top tabs implemented as a segmented header:

- `Running` navigates to `/(tabs)/tracking` (existing screen).
- `Social` navigates to `/(tabs)/tracking/social`.

No new navigation library: implement as a shared header component that uses `expo-router` navigation.

### Social Tab Layout

Social screen contains:

1. **Leaderboard** (top km) for last 7 days (default window), showing:
   - Athlete name
   - Total km in window
   - Rank number
2. **Adults directory** list (adults only) for discovery (minimal profile card):
   - Name + avatar (if present)
3. **Public runs feed** (adults only), showing:
   - Runner name + date
   - Distance + duration + pace
   - Actions: Comment, Share
4. **Comments**:
   - List comments for a run
   - Add a comment
   - Delete own comment
   - Report a comment

## Data Model / Backend

Existing schema already has:

- `run_logs` table with `visibility` (`public`/`private`)
- `run_comments` table for comments and replies (parentId)
- `audit_logs` table which can store report events

We will add API endpoints for leaderboard/feed/comments without changing DB schema.

### API Endpoints (New)

Under `apps/api/src/routes/social.routes.ts`:

- `GET /social/leaderboard?windowDays=7&limit=50`
  - Returns adult athletes sorted by total `distanceMeters` over the window.
- `GET /social/adults?limit=50&cursor=<userId>`
  - Returns adult athlete directory (paged).
- `GET /social/runs?limit=20&cursor=<runLogId>`
  - Returns public runs feed (adult athletes, visibility public).
- `GET /social/runs/:runLogId/comments`
  - Returns comments for a run (adult athletes only).
- `POST /social/runs/:runLogId/comments`
  - Create a comment (adult athletes only).
- `DELETE /social/comments/:commentId`
  - Delete own comment.
- `POST /social/comments/:commentId/report`
  - Record a report event in `audit_logs` (and return ok).

### API Response Shapes (Minimal)

Leaderboard item:

- `userId: number`
- `name: string`
- `avatarUrl: string | null`
- `kmTotal: number`
- `rank: number`

Run feed item:

- `runLogId: number`
- `userId: number`
- `name: string`
- `avatarUrl: string | null`
- `date: string` (ISO)
- `distanceMeters: number`
- `durationSeconds: number`
- `avgPace: number | null`
- `commentCount: number`

Comment item:

- `commentId: number`
- `runLogId: number`
- `userId: number`
- `name: string`
- `avatarUrl: string | null`
- `content: string`
- `createdAt: string`

## Google Play Policy Notes (UGC)

Comments are user-generated content. To keep this feature defensible for Play review, ship these minimum controls:

- Report comment (in-app)
- Delete own comment (in-app)

We are not implementing full moderation tooling in this iteration; reporting will write to `audit_logs` so the backend has an actionable trail.

## Non-Goals (This Iteration)

- Real-time updates (websocket) for leaderboard/feed/comments
- Full follow/friend graph
- Like/reactions
- Full moderation dashboard
- Replies (parentId exists but not surfaced yet)

## Testing / Verification

Mobile:

- Adult athletes see Tracking tab with Running/Social header tabs.
- Non-adult roles do not see Tracking at all.
- Social loads: leaderboard, directory, feed.
- Share action opens native share sheet.
- Comments: post, list, delete own, report.

API:

- Endpoints require auth.
- Only adult athletes and adult runs returned.
- Visibility respected (`public` only for feed).

