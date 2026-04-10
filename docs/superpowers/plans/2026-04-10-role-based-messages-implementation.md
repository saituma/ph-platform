# Role-Based Messages (Mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mobile Messages role-based (team/adult/youth/admin) with role-specific tab screens and role-specific thread-detail routes, while sharing most logic via reusable components.

**Architecture:** Keep the bottom tab bar under `/(tabs)` (custom PagerView tabs) and swap the “messages” tab component per role. Add explicit role-prefixed thread detail routes (`/team/messages/[id]`, etc.) and ensure push notifications/deep links navigate to the current user’s role route.

**Tech Stack:** Expo Router, React Native, Redux, nativewind, expo-notifications, react-native-reanimated.

---

## File Structure (Created/Modified)

**Create (shared):**
- `apps/mobile/lib/messages/roleMessageRoutes.ts` — resolve current role → route prefix + build hrefs
- `apps/mobile/components/messages/MessagesHome.tsx` — shared messages home UI/logic with `mode`

**Create (role message home wrappers):**
- `apps/mobile/app/_roles/team/screens/Messages.tsx`
- `apps/mobile/app/_roles/adult/screens/Messages.tsx`
- `apps/mobile/app/_roles/youth/screens/Messages.tsx`

**Create (role thread routes):**
- `apps/mobile/app/team/messages/[id].tsx`
- `apps/mobile/app/adult/messages/[id].tsx`
- `apps/mobile/app/youth/messages/[id].tsx`
- `apps/mobile/app/admin/messages/[id].tsx`

**Modify (wire role screens into tabs):**
- `apps/mobile/app/_roles/team/TeamLayout.tsx`
- `apps/mobile/app/_roles/adult/AdultLayout.tsx`
- `apps/mobile/app/_roles/youth/YouthLayout.tsx`

**Modify (shared route stays as deep-link entry):**
- `apps/mobile/app/(tabs)/messages/index.tsx` — become a thin shim that renders `MessagesHome` with derived `mode`

**Modify (navigation to role thread):**
- `apps/mobile/hooks/useMessagesController.ts` — push role thread route, not `/messages/[id]`
- `apps/mobile/hooks/navigation/usePushNotificationResponses.ts` — push role thread route, not `/messages/:id`

**Modify (stack screens for transitions):**
- `apps/mobile/app/_layout.tsx` — register new role routes for shared transition preset (optional but recommended)

---

### Task 1: Add role → messages route helpers

**Files:**
- Create: `apps/mobile/lib/messages/roleMessageRoutes.ts`

- [ ] **Step 1: Add role prefix resolver**

```ts
import { isAdminRole } from "@/lib/isAdminRole";

export type MessagesRolePrefix = "admin" | "team" | "adult" | "youth";

export function getMessagesRolePrefix(params: {
  appRole?: string | null;
  apiUserRole?: string | null;
}): MessagesRolePrefix {
  const { appRole, apiUserRole } = params;
  if (isAdminRole(apiUserRole) || appRole === "coach") return "admin";
  if (appRole === "adult_athlete") return "adult";
  if (
    appRole === "youth_athlete_team_guardian" ||
    appRole === "adult_athlete_team"
  )
    return "team";
  if (typeof appRole === "string" && appRole.startsWith("youth_")) return "youth";
  return "adult";
}

export function messagesThreadHref(prefix: MessagesRolePrefix, threadId: string) {
  return `/${prefix}/messages/${encodeURIComponent(threadId)}` as const;
}
```

- [ ] **Step 2: (Optional) add helper for tab href**

```ts
export const messagesTabHref = "/(tabs)/messages" as const;
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/messages/roleMessageRoutes.ts
git commit -m "feat(mobile): add role-based messages route helpers"
```

---

### Task 2: Extract shared Messages home into `MessagesHome`

**Files:**
- Create: `apps/mobile/components/messages/MessagesHome.tsx`
- Modify: `apps/mobile/app/(tabs)/messages/index.tsx`

- [ ] **Step 1: Create shared component signature**

```tsx
export type MessagesHomeMode = "team" | "adult" | "youth";

export function MessagesHome({ mode }: { mode: MessagesHomeMode }) {
  // move the current implementation from app/(tabs)/messages/index.tsx here
}
```

- [ ] **Step 2: Move existing code**
  - Cut/paste the entire body of the current `MessagesScreen` into `MessagesHome`
  - Replace `export default function MessagesScreen()` with `export function MessagesHome({ mode }: ...)`
  - Keep existing logic but allow role-specific copy/sections later via `mode`

- [ ] **Step 3: Make `app/(tabs)/messages/index.tsx` a thin shim**

```tsx
import { useAppSelector } from "@/store/hooks";
import { MessagesHome } from "@/components/messages/MessagesHome";

export default function MessagesTabScreen() {
  const { appRole } = useAppSelector((s) => s.user);
  const mode =
    appRole === "adult_athlete" ? "adult" : appRole?.startsWith("youth_") ? "youth" : "team";
  return <MessagesHome mode={mode} />;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/messages/MessagesHome.tsx apps/mobile/app/(tabs)/messages/index.tsx
git commit -m "refactor(mobile): extract MessagesHome shared screen"
```

---

### Task 3: Add role-specific “Messages” tab screens

**Files:**
- Create: `apps/mobile/app/_roles/team/screens/Messages.tsx`
- Create: `apps/mobile/app/_roles/adult/screens/Messages.tsx`
- Create: `apps/mobile/app/_roles/youth/screens/Messages.tsx`

- [ ] **Step 1: Create thin wrappers**

```tsx
import React from "react";
import { MessagesHome } from "@/components/messages/MessagesHome";

export default function TeamMessagesScreen() {
  return <MessagesHome mode="team" />;
}
```

Repeat for adult/youth with the correct `mode`.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/_roles/team/screens/Messages.tsx apps/mobile/app/_roles/adult/screens/Messages.tsx apps/mobile/app/_roles/youth/screens/Messages.tsx
git commit -m "feat(mobile): add role-specific messages tab screens"
```

---

### Task 4: Wire role messages screens into role tab layouts

**Files:**
- Modify: `apps/mobile/app/_roles/team/TeamLayout.tsx`
- Modify: `apps/mobile/app/_roles/adult/AdultLayout.tsx`
- Modify: `apps/mobile/app/_roles/youth/YouthLayout.tsx`

- [ ] **Step 1: Import each role messages screen**

Example (Team):
```ts
import TeamMessagesScreen from "./screens/Messages";
```

- [ ] **Step 2: Override tabComponents mapping**

Example:
```ts
const tabComponents = useMemo(
  () => ({ ...SHARED_TAB_COMPONENTS, messages: React.memo(TeamMessagesScreen) }),
  [],
);
const { initialIndex, handleIndexChange, screens } = useBaseLayoutLogic(visibleTabs, tabComponents);
```

Do the same for adult/youth using their respective screen.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/_roles/team/TeamLayout.tsx apps/mobile/app/_roles/adult/AdultLayout.tsx apps/mobile/app/_roles/youth/YouthLayout.tsx
git commit -m "feat(mobile): wire role messages screens into layouts"
```

---

### Task 5: Add role-specific thread detail routes

**Files:**
- Create: `apps/mobile/app/team/messages/[id].tsx`
- Create: `apps/mobile/app/adult/messages/[id].tsx`
- Create: `apps/mobile/app/youth/messages/[id].tsx`
- Create: `apps/mobile/app/admin/messages/[id].tsx`

- [ ] **Step 1: Re-export existing thread screen**

```tsx
export { default } from "@/app/messages/[id]";
```

This keeps UI identical initially but establishes distinct routes for role-based linking.

- [ ] **Step 2: (Optional but recommended) add Stack screens for animations**

In `apps/mobile/app/_layout.tsx`, add `Stack.Screen` entries for:
- `team/messages/[id]`
- `adult/messages/[id]`
- `youth/messages/[id]`
- `admin/messages/[id]`

Reuse the same `Transition.Presets.SharedAppleMusic` options as the legacy `messages/[id]`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/team/messages/[id].tsx apps/mobile/app/adult/messages/[id].tsx apps/mobile/app/youth/messages/[id].tsx apps/mobile/app/admin/messages/[id].tsx apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add role-prefixed thread detail routes"
```

---

### Task 6: Route all thread openings to the role-prefixed thread route

**Files:**
- Modify: `apps/mobile/hooks/useMessagesController.ts`
- Modify: `apps/mobile/hooks/navigation/usePushNotificationResponses.ts`

- [ ] **Step 1: Update `useMessagesController.openThread()`**
  - Read `appRole` + `apiUserRole` from `useAppSelector`
  - Use `getMessagesRolePrefix()` + `messagesThreadHref()` to build href
  - Replace `router.push({ pathname: "/messages/[id]", ... })` with role pathname like `"/team/messages/[id]"` and keep params

- [ ] **Step 2: Update fallback pushes**
  - In the notification listener in `useMessagesController`, replace `router.push(\`/messages/${threadId}\`)` with role href.

- [ ] **Step 3: Update push response handler**
  - In `usePushNotificationResponses`, when `data.threadId` exists, navigate to role href, not `/messages/:id`.
  - For `data.screen === "messages"`, keep `router.push("/(tabs)/messages")` (tab entry is shared).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/hooks/useMessagesController.ts apps/mobile/hooks/navigation/usePushNotificationResponses.ts
git commit -m "fix(mobile): open threads via role-based message routes"
```

---

### Task 7: Validate

**Files:**
- Test: N/A (manual)

- [ ] **Step 1: Typecheck**

Run: `pnpm --filter mobile typecheck`

Expected: PASS (or only pre-existing unrelated errors).

- [ ] **Step 2: Manual sanity (dev build)**
  - Open Messages tab as each role; confirm it renders.
  - Tap a thread; confirm URL uses `/<role>/messages/<id>`.
  - Tap a push notification (threadId); confirm it opens `/<role>/messages/<id>`.

- [ ] **Step 3: Commit (if any final fixes)**

```bash
git status
```

---

## Self-Review Checklist

- [ ] Every navigation path to a thread uses `/<role>/messages/:id`.
- [ ] Messages tab entry remains `/(tabs)/messages` so the bottom bar stays.
- [ ] Push notifications never open another role’s route.
- [ ] No duplicate `/messages` route conflicts introduced.

