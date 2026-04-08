# Mobile Admin Mode (Approach A) — Design

**Status:** Draft (awaiting review)

## Goal

Provide a dedicated **Admin Mode** in the Expo (SDK 55) mobile app for `admin` / `superAdmin` users to manage the same admin capabilities that exist on web, using a mobile-appropriate tab IA.

## Non-goals (for this spec)

- Rebuilding the web admin UI 1:1 (desktop patterns don’t translate directly to mobile).
- Adding new admin capabilities that don’t exist in the API/web today.
- Replacing the current `AppRole` system (we will extend role handling without breaking existing coach/athlete behavior).

## Current State (facts from repo)

- Mobile collapses backend `admin` / `superAdmin` into `AppRole = "coach"` via `resolveAppRole()` in `apps/mobile/lib/appRole.ts`.
- The main navigation is a custom tab system using `SwipeableTabLayout` in `apps/mobile/app/(tabs)/_layout.tsx`.
- Mobile has a centralized request helper `apiRequest()` in `apps/mobile/lib/api.ts` (token, refresh, caching, timeouts).
- Backend already has many admin endpoints under `/admin/*` guarded by `requireRole(["coach","admin","superAdmin"])`.

## Proposed State

### Roles

We will distinguish:

- **`apiUserRole`**: the raw role string from `/auth/me` (e.g. `"admin"`, `"superAdmin"`).
- **`appRole`**: the existing normalized role used for existing UX (`admin/superAdmin → coach`), unchanged.

**Admin Mode eligibility**

- Admin Mode is enabled when `apiUserRole` (lowercased) is `"admin"` or `"superadmin"`.

### Navigation

Admin Mode is implemented by swapping the tab configuration inside the existing `SwipeableTabLayout`.

**Admin tabs (5)**

1. **Admin Home** — “dashboard” + entry points to all modules
2. **Videos** — training video uploads + review + moderation actions (where supported)
3. **Users** — search/list users; role & access management (where supported)
4. **Content** — programs, exercises, training content v2 admin, etc.
5. **Ops** — bookings, billing/subscription requests, messaging admin, settings, and long-tail tools

**Rationale**

- Keeps the tab bar stable (no 15-tab explosion).
- Mirrors how web groups admin concerns while remaining thumb-friendly.

### Key UX behaviors

- Admin users see Admin Mode tabs automatically.
- Coach/athlete users keep current tabs unchanged.
- Each tab uses standard mobile patterns already present in the app (ScrollView/FlatList with `contentInsetAdjustmentBehavior="automatic"`, existing theme primitives, existing navigation helpers).

## Screen Inventory (Admin Mode)

This lists the _entry points_ Admin Mode must expose. Individual sub-screens are navigated from the tab root(s).

### 1) Admin Home

- Dashboard summary (high-level counts and recent items)
- Quick links to:
  - Users
  - Videos
  - Content
  - Subscription requests
  - Bookings
  - Messaging admin

### 2) Videos

- List/filter video uploads / training videos
- Video detail:
  - metadata
  - status
  - actions supported by API (approve/reject/flag/delete)

### 3) Users

- User list/search
- User detail:
  - role (read)
  - actions supported by API (block/unblock, delete, etc.)

### 4) Content

- Programs
- Exercise library
- Training content v2 admin tools

### 5) Ops

- Billing admin:
  - subscription plans
  - subscription requests (approve/reject)
- Bookings admin (view/manage)
- Messaging admin tooling
- Admin settings

## API Integration

### Networking primitives

All admin calls must use `apiRequest()` from `apps/mobile/lib/api.ts`.

### Endpoints

This feature depends on existing API endpoints. We will integrate the subset that maps to the screens above, primarily under:

- `/admin/*`
- `/billing/admin/*` (where present)
- `/training-content-v2/admin/*`

**Important:** The mobile app currently has no `/admin/*` usage; Admin Mode introduces new consumption of these endpoints.

### Error handling

- Use `apiRequest()` error messages directly for now (it already normalizes many network failure modes).
- For authorization failures:
  - If an Admin Mode screen receives 403, show an “Access denied” state and offer to return to Admin Home.

## State Management

### Redux additions

Add a new field to `apps/mobile/store/slices/userSlice.ts`:

- `apiUserRole: string | null`

### Auth hydration

Update `apps/mobile/store/AuthPersist.tsx` to:

- capture `/auth/me` → `user.role`
- dispatch `setApiUserRole(role)`
- keep dispatching `setAppRole(resolveAppRole(...))` unchanged

## Security

- Admin Mode must be _purely a UI convenience_. Server-side authorization remains the source of truth.
- Do not store elevated secrets on device; rely on standard JWT token already used.

## Testing

- Unit tests for role gating:
  - admin/superAdmin show admin tab set
  - non-admin do not
- Unit tests for reducers:
  - `setApiUserRole` stores raw role
- API request tests are already present; Admin Mode adds new call-sites but reuses the same request helper.

## Open Questions (need your decision)

1. **Coach access while admin:** In Admin Mode, do you want admins to _also_ have quick access to the existing coach tabs (Messages/Schedule/Tracking), or is Admin Mode the only tab set they should see on mobile?
   - Current design assumes: Admin Mode tabs replace the standard tabs.
   - If you want both, we should switch to a Hybrid approach (adds an Admin tab, keeps coach tabs).

## Rollout

- Feature is gated entirely by `apiUserRole`.
- No migration required for existing users.
