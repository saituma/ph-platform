# Role-Based Messages Routing (Mobile) — Design

Date: 2026-04-10

## Goal

Make Messages fully role-based so each role (team/adult/youth/admin) has:

- Its own Messages “home” screen (inbox composition + sections)
- Its own thread detail screen (different controls/affordances per role)
- Push notifications that deep-link only into the current user’s role routes

At the same time, avoid duplicating large amounts of UI/business logic by extracting shared components/hooks.

## Current State (as of 2026-04-10)

- Tab navigation is custom (PagerView + custom `TabBar`), not Expo Router `<Tabs>`.
- `apps/mobile/app/(tabs)/_layout.tsx` selects a role layout (`AdminLayout`, `TeamLayout`, etc.).
- Role layouts render “tab screens” using `visibleTabs` + `tabComponents` (e.g. `SHARED_TAB_COMPONENTS` maps `messages` to `@/app/(tabs)/messages`).
- The current Messages home is `apps/mobile/app/(tabs)/messages/index.tsx`.
- Thread detail is `apps/mobile/app/messages/[id].tsx`, registered in `apps/mobile/app/_layout.tsx` as a Stack screen.

## Key Constraint

Expo Router route groups (folders like `(team)`) do **not** appear in the URL. Therefore, multiple files like:

- `app/(team)/messages/index.tsx`
- `app/(adult)/messages/index.tsx`

would all resolve to `/messages` and conflict.

Role-specific routes must use unique, visible path segments.

## Proposed Routing

Create unique, explicit role-prefixed routes:

- Team: `apps/mobile/app/team/messages/index.tsx` → path `/team/messages`
- Team thread: `apps/mobile/app/team/messages/[id].tsx` → path `/team/messages/:id`

- Adult: `apps/mobile/app/adult/messages/index.tsx` → `/adult/messages`
- Adult thread: `apps/mobile/app/adult/messages/[id].tsx` → `/adult/messages/:id`

- Youth: `apps/mobile/app/youth/messages/index.tsx` → `/youth/messages`
- Youth thread: `apps/mobile/app/youth/messages/[id].tsx` → `/youth/messages/:id`

- Admin: `apps/mobile/app/admin/messages/index.tsx` → `/admin/messages`
- Admin thread: `apps/mobile/app/admin/messages/[id].tsx` → `/admin/messages/:id`

Keep `/messages/[id]` only if needed as a legacy redirect; otherwise remove it to reduce confusion.

## Shared vs Role-Specific Code

Extract shared logic/UI out of route files:

- Shared Messages home component:
  - `apps/mobile/components/messages/MessagesHome.tsx`
  - Accepts `mode: "team" | "adult" | "youth" | "admin"`
  - Encapsulates: locked/upgrade UI, announcements preview, billing sync (or delegated hook), and rendering `InboxScreen`
  - Role differences are implemented as:
    - feature flags computed from `mode`
    - role-specific copy
    - role-specific “sections” (team inbox, admin tools, etc.)

- Shared thread detail component:
  - `apps/mobile/components/messages/ThreadScreen.tsx`
  - Accepts `mode` and the `threadId`
  - Shows/hides controls depending on role (admin moderation actions, group creation, etc.)

The role route files become thin wrappers that pass `mode` and delegate rendering to shared components.

## Role Requirements (High-Level)

- Team:
  - Team inbox
  - Direct athlete ↔ admin inbox (if applicable)
  - Coach/admin-created groups
  - Announcements

- Adult athlete:
  - Direct inbox
  - Coach-created groups
  - Announcements

- Youth athlete:
  - Direct inbox (with guardian constraints if needed)
  - Coach-created groups
  - Announcements

- Admin:
  - Announcements posting
  - Team inboxes
  - Direct inbox
  - Group creation
  - “More”/admin actions

Implementation will map these into per-role sections inside `MessagesHome` (or separate per-role section components).

## Tab Wiring Changes

Update role tab component mappings to point to role message routes/screens:

- `apps/mobile/app/_roles/shared/tabComponents.tsx` (and admin equivalents) should render role wrappers, not the old `@/app/(tabs)/messages`.
  - Alternatively, keep the key `messages` but swap the component per role layout (TeamLayout uses TeamMessages, etc.).

## Push Notifications / Deep Linking

Update the push-notification response handler to route based on the current user role:

- Determine role prefix: `team | adult | youth | admin`
- Navigate to `/${prefix}/messages/${threadId}`

This ensures notifications open only “their own” role routes (no cross-role navigation).

## Migration Plan

1. Create shared components (`MessagesHome`, `ThreadScreen`) and move current logic out of `app/(tabs)/messages/index.tsx` and `app/messages/[id].tsx`.
2. Add role routes under `app/team/messages/*`, `app/adult/messages/*`, `app/youth/messages/*`, `app/admin/messages/*`.
3. Update role `tabComponents` mapping to render the correct role Messages home.
4. Update any hard-coded navigation in messages UI (e.g. `/messages/[id]`, `/(tabs)/messages`) to use role-aware navigation.
5. Update push response handler to deep-link to role routes.
6. Optional: add legacy redirect from `/messages/[id]` to role route if external links exist.

## Testing / Validation

- Manual:
  - Switch roles and ensure tab “Messages” opens the correct role home.
  - Open a thread from each role and verify correct detail UI.
  - Trigger push notification navigation and verify it routes to `/${role}/messages/:id`.
  - Verify locked states (plan/age gating) per role.

- Typecheck:
  - `pnpm --filter mobile typecheck`

