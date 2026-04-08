# Mobile Admin Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Admin Mode tab set for `admin` / `superAdmin` users in the mobile app, driven by raw API role, with initial Admin screens and basic data fetching from existing `/admin/*` endpoints.

**Architecture:** Extend auth hydration to store `apiUserRole` (raw string) in Redux while preserving existing `appRole` normalization. Update the existing `SwipeableTabLayout` tab config to swap to a 5-tab Admin set when `apiUserRole` indicates admin. Admin screens are lightweight list/detail starters that use the existing `apiRequest()` helper.

**Tech Stack:** Expo Router (SDK 55), React Native, Redux Toolkit, existing `apiRequest()` (`apps/mobile/lib/api.ts`), Jest.

---

## Scope + Assumptions

- Assumption (per approved design): Admin Mode **replaces** the standard tab set for admin users.
- This plan implements Admin Mode foundation + initial screens wired to core endpoints; it does not attempt to replicate the entire web admin console in one pass.

## File Map

**Modify**

- `apps/mobile/store/slices/userSlice.ts` — store `apiUserRole`, add reducer
- `apps/mobile/store/AuthPersist.tsx` — capture `/auth/me` role and dispatch `setApiUserRole`
- `apps/mobile/app/(tabs)/_layout.tsx` — swap tab set when `apiUserRole` is admin
- `apps/mobile/test/store-slices.test.ts` — add coverage for `apiUserRole`

**Create**

- `apps/mobile/app/(tabs)/admin-home.tsx`
- `apps/mobile/app/(tabs)/admin-videos.tsx`
- `apps/mobile/app/(tabs)/admin-users.tsx`
- `apps/mobile/app/(tabs)/admin-content.tsx`
- `apps/mobile/app/(tabs)/admin-ops.tsx`
- `apps/mobile/lib/isAdminRole.ts` — small helper
- `apps/mobile/test/isAdminRole.test.ts` — helper unit tests

---

### Task 1: Add raw role to Redux

**Files:**

- Modify: `apps/mobile/store/slices/userSlice.ts`
- Test: `apps/mobile/test/store-slices.test.ts`

- [ ] **Step 1: Add `apiUserRole` to `UserState` + `initialState`**

- [ ] **Step 2: Add action `setApiUserRole(role: string | null)`**

- [ ] **Step 3: Reset `apiUserRole` to null on `logout`**

- [ ] **Step 4: Extend reducer tests**
  - Assert `setApiUserRole("admin")` stores role
  - Assert `logout()` resets it

- [ ] **Step 5: Run tests**

Run: `pnpm -C apps/mobile test`

- [ ] **Step 6: Commit**

`git add apps/mobile/store/slices/userSlice.ts apps/mobile/test/store-slices.test.ts`

---

### Task 2: Hydrate `apiUserRole` from `/auth/me`

**Files:**

- Modify: `apps/mobile/store/AuthPersist.tsx`

- [ ] **Step 1: Import and dispatch `setApiUserRole`** in `syncProfile()` after `latestUserRole` is captured
- [ ] **Step 2: Keep `setAppRole(resolveAppRole(...))` unchanged**
- [ ] **Step 3: Run tests**

Run: `pnpm -C apps/mobile test`

- [ ] **Step 4: Commit**

`git add apps/mobile/store/AuthPersist.tsx`

---

### Task 3: Add `isAdminRole()` helper

**Files:**

- Create: `apps/mobile/lib/isAdminRole.ts`
- Test: `apps/mobile/test/isAdminRole.test.ts`

- [ ] **Step 1: Implement helper**
  - input: `string | null | undefined`
  - output: boolean (true only for `admin` or `superadmin` case-insensitive)

- [ ] **Step 2: Add unit tests**

- [ ] **Step 3: Run tests**

Run: `pnpm -C apps/mobile test`

- [ ] **Step 4: Commit**

`git add apps/mobile/lib/isAdminRole.ts apps/mobile/test/isAdminRole.test.ts`

---

### Task 4: Swap tab set for admins

**Files:**

- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Add `ADMIN_TAB_ROUTES`**
  - keys: `admin-home`, `admin-videos`, `admin-users`, `admin-content`, `admin-ops`

- [ ] **Step 2: Import new Admin tab root components** and add to `TAB_COMPONENTS`

- [ ] **Step 3: Compute `isAdmin` from redux `apiUserRole` using `isAdminRole()`**

- [ ] **Step 4: Use `ADMIN_TAB_ROUTES` when `isAdmin`**
  - Ensure `initialIndex` doesn’t try to restore to a non-existent `lastTabKey`

- [ ] **Step 5: Run tests**

Run: `pnpm -C apps/mobile test`

- [ ] **Step 6: Commit**

`git add apps/mobile/app/(tabs)/_layout.tsx`

---

### Task 5: Implement Admin tab root screens (initial)

**Files:**

- Create:
  - `apps/mobile/app/(tabs)/admin-home.tsx`
  - `apps/mobile/app/(tabs)/admin-videos.tsx`
  - `apps/mobile/app/(tabs)/admin-users.tsx`
  - `apps/mobile/app/(tabs)/admin-content.tsx`
  - `apps/mobile/app/(tabs)/admin-ops.tsx`

- [ ] **Step 1: Admin Home**
  - fetch `/admin/dashboard` via `apiRequest()`
  - show a small summary + quick links

- [ ] **Step 2: Users**
  - fetch `/admin/users?limit=50`
  - render a simple list (name/email/role)

- [ ] **Step 3: Videos**
  - fetch `/admin/videos?limit=50`
  - render list of items (best-effort fields)

- [ ] **Step 4: Content/Ops**
  - initial: quick-link lists (wiring to deeper screens can be next iteration)

- [ ] **Step 5: Run tests**

Run: `pnpm -C apps/mobile test`

- [ ] **Step 6: Commit**

`git add apps/mobile/app/(tabs)/admin-*.tsx`

---

## Validation checklist

- Admin user (`apiUserRole=admin|superAdmin`) sees the 5 Admin tabs.
- Non-admin sees existing tabs unchanged.
- No crashes when `apiUserRole` is null/unknown.
- Admin screens render offline/error states without logging the user out.
