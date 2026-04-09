# Mobile Admin Teams (Admin Home → Teams List → Team Detail) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Teams management entrypoint on Mobile Admin Home that navigates to a Teams list screen, with team creation (name-only) and a team detail screen that supports assigning athletes and optionally moving athletes from other teams with typed `MOVE` confirmation.

**Architecture:** Implement two new Expo Router stack routes outside `(tabs)` (`/admin-teams` and `/admin-teams/[teamName]`). Admin Home adds an action that pushes to `/admin-teams`. Data fetching uses existing `apiRequest()` with Bearer token.

**Tech Stack:** Expo Router, React Native, TypeScript, `apiRequest()` wrapper, existing themed UI components.

---

## File Map

**Modify**

- `apps/mobile/app/(tabs)/admin-home.tsx` — add Teams link.

**Create**

- `apps/mobile/app/admin-teams.tsx` — Teams list + create team.
- `apps/mobile/app/admin-teams/[teamName].tsx` — Team detail + assign member modal.

**Fix (cleanup / correctness)**

- `apps/mobile/app/(tabs)/admin-ops.tsx` — import missing symbol and remove unused locals (if present).

## Task 1: Fix current TypeScript/lint breakage in Admin Ops

**Files:**

- Modify: `apps/mobile/app/(tabs)/admin-ops.tsx`

- [ ] **Step 1: Add missing import for `requestGlobalTabChange`**

```ts
import { requestGlobalTabChange } from "@/context/ActiveTabContext";
```

- [ ] **Step 2: Remove unused local(s) flagged by ESLint**

Example (if present):

```ts
// remove if never used
const busy = serviceEditBusyId === s.id;
```

- [ ] **Step 3: Validate**
      Run: `pnpm -C apps/mobile typecheck`
      Expected: no TS2304 for `requestGlobalTabChange`.

---

## Task 2: Admin Home adds Teams link

**Files:**

- Modify: `apps/mobile/app/(tabs)/admin-home.tsx`

- [ ] **Step 1: Add a new ActionButton for Teams**

Place alongside existing Admin actions. Use the router to navigate:

```tsx
import { useRouter } from "expo-router";

const router = useRouter();

<ActionButton
  icon="users"
  label="Teams"
  color="bg-accent"
  onPress={() => router.push("/admin-teams")}
/>;
```

- [ ] **Step 2: Validate**
      Run: `pnpm -C apps/mobile typecheck`

---

## Task 3: Implement Teams list route (`/admin-teams`)

**Files:**

- Create: `apps/mobile/app/admin-teams.tsx`

- [ ] **Step 1: Implement data fetch**
      Use `apiRequest("/admin/teams")` and render list.

- [ ] **Step 2: Implement create team (name-only)**
      POST `apiRequest("/admin/teams", { method: "POST", body: { teamName } })`.

- [ ] **Step 3: Implement navigation to team detail**
      `router.push({ pathname: "/admin-teams/[teamName]", params: { teamName } })`

- [ ] **Step 4: Validate**
      Run: `pnpm -C apps/mobile typecheck`

---

## Task 4: Implement Team detail route (`/admin-teams/[teamName]`)

**Files:**

- Create: `apps/mobile/app/admin-teams/[teamName].tsx`

- [ ] **Step 1: Load team detail**
      GET `/admin/teams/:teamName` and render members list.

- [ ] **Step 2: Assign member modal**
      Search athletes via `/admin/users?q=...`, filter to rows with `athleteId`.

- [ ] **Step 3: Optional move flow**
      Toggle “Include athletes from other teams (MOVE)”.
      If selected athlete has a different `athleteTeam`, require typing `MOVE`.

- [ ] **Step 4: Attach request**
      POST `/admin/teams/:teamName/athletes/:athleteId/attach`
- Unassigned: empty body
- Move: `{ allowMoveFromOtherTeam: true }`

- [ ] **Step 5: Validate**
      Run: `pnpm -C apps/mobile typecheck`

---

## Self-review checklist

- [ ] Admin Home has Teams link to `/admin-teams`.
- [ ] Teams list renders and can create a team with name only.
- [ ] Team detail renders members.
- [ ] Assign member supports unassigned athletes.
- [ ] Moving from other team requires toggle + typed `MOVE` and sends `allowMoveFromOtherTeam: true`.
