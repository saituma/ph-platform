# Mobile Admin: Teams Management (List + Detail)

Date: 2026-04-10

## Goal

Add mobile parity for the existing web admin Teams workflow by exposing Teams management in the mobile app:

- Admin Home includes a **Teams** link.
- Admin can **list teams**, **create a team (name-only)**, **view a team**, and **assign an athlete** to a team.
- Admin can optionally **move an athlete from another team**, guarded by an explicit toggle and a typed confirmation (**MOVE**).

## Non-goals

- No subscription plan creation.
- No bulk team provisioning.
- No additional admin tabs.
- No new backend endpoints.

## Current State (Mobile)

- Mobile uses `apiRequest()` with Bearer token auth.
- Admin UI exists as tabs (Admin Home, Users, etc.) but there is no Teams screen.
- The `(tabs)` layout renders the tab screens directly and does not mount nested routes via `<Slot />`, so new screens should be created **outside** `(tabs)` when they need their own route.

## Current State (Backend)

The API already supports Teams admin operations (all behind auth + admin/coach/superAdmin role):

- `GET /admin/teams` list teams
- `POST /admin/teams` create team (name-only)
- `GET /admin/teams/:teamName` team detail (members)
- `POST /admin/teams/:teamName/athletes/:athleteId/attach` attach athlete
  - Body supports `{ allowMoveFromOtherTeam?: boolean }`

Additionally, mobile can reuse `GET /admin/users?q=...` to search athletes; this response includes `athleteId` and `athleteTeam` which is sufficient to power “unassigned vs other-team” selection.

## Proposed UX

### Entry point (Admin Home)

Add an Admin Home action/button labeled **Teams**.

- Tap navigates to `/admin-teams`.

### Screen 1: Teams list (`/admin-teams`)

**Primary content**

- List teams with name and member count.
- Pull-to-refresh.

**Actions**

- Create team: input for team name + submit.
  - Uses `POST /admin/teams` with `{ teamName }`.

**Navigation**

- Selecting a team navigates to `/admin-teams/[teamName]`.

**States**

- Loading skeletons while fetching.
- Inline error message on failure.

### Screen 2: Team detail (`/admin-teams/[teamName]`)

**Primary content**

- Team header (team name).
- List current members (athlete name + optional metadata already returned by API).

**Action: Assign member**

- Opens a modal/sheet that allows selecting an athlete to attach to the team.

**Athlete selection**

- Search input.
- Search uses `GET /admin/users?q=<term>`.
- From results, consider only rows where `athleteId` is present.

**Filtering rules**

- Default: show only athletes that are **unassigned** (no `athleteTeam` value).
- Optional toggle: **Include athletes from other teams (MOVE)**.
  - When enabled, include athletes with `athleteTeam` not empty and not equal to the current `teamName`.

**MOVE safety gate**
When the selected athlete is currently on a different team:

- Show a warning describing the move.
- Require the admin to type exactly `MOVE` to enable the final Assign action.
- If the toggle “Include athletes from other teams” is off, do not allow selecting/assigning those athletes.

**Attach call**

- If athlete is unassigned: `POST /admin/teams/:teamName/athletes/:athleteId/attach` with `{}`.
- If athlete is from another team:
  - Only if toggle is enabled AND typed confirmation is satisfied.
  - Call `POST /admin/teams/:teamName/athletes/:athleteId/attach` with `{ allowMoveFromOtherTeam: true }`.

**Post-success behavior**

- Close modal.
- Refresh the team detail to show the updated member list.

**States**

- Disable Assign while submitting.
- Inline error message for attach failure.

## Navigation / Routing

Create the new routes outside `(tabs)` so they are actually mounted:

- `app/admin-teams.tsx` (Teams list)
- `app/admin-teams/[teamName].tsx` (Team detail)

Admin Home (tab screen) links to `/admin-teams`.

## Data types (frontend)

Minimal shape needed from API:

- Teams list `GET /admin/teams`:
  - `teams: Array<{ team: string; memberCount: number; guardianCount?: number; createdAt?: string; updatedAt?: string }>`

- Team detail `GET /admin/teams/:teamName`:
  - `team: string`
  - `summary: { memberCount: number; guardianCount: number; createdAt?: string; updatedAt?: string }`
  - `members: Array<{ athleteId: number; athleteName: string; ... }>`

- User search `GET /admin/users?q=...`:
  - `users: Array<{ id: number; role?: string; athleteId?: number | null; athleteName?: string | null; athleteTeam?: string | null; ... }>`

## Error handling

- Treat 401/403 as “not authorized” and show a simple message.
- Surface server-provided error text when safe; otherwise show a generic fallback.
- Do not log sensitive tokens or request bodies.

## Acceptance Criteria

- Admin Home shows a Teams entry that navigates to Teams list.
- Teams list loads teams and supports creating a team with just a name.
- Team detail loads members.
- Assign member supports unassigned athletes.
- Assign member supports moving from other teams only when:
  - the include-other-teams toggle is enabled, AND
  - the admin types `MOVE`, AND
  - the request uses `{ allowMoveFromOtherTeam: true }`.

## Risks / Notes

- `teamName` is used in the URL; it must be URL-encoded/decoded consistently.
- If backend returns large user lists, the search UI should be careful to avoid rendering too many items at once (keep it minimal for now).
