# Application Boundaries

This is the P0 production-safety decision for app ownership.

## Target Ownership

- `apps/onboarding` owns public marketing, signup, onboarding flows, and normal authenticated user dashboard routes under `apps/onboarding/src/routes/portal/*`.
- `apps/parent` owns the parent and guardian portal.
- `apps/web` owns the admin and internal operations dashboard.
- `apps/mobile` owns the native mobile user experience.
- `apps/api` owns backend business logic, authorization, persistence, and integrations.
- `apps/worker` owns edge/background worker logic and must not bypass API security rules.

## Portal Decision

There is intentionally no `apps/portal` workspace. Do not migrate portal routes out of `apps/onboarding` unless the product architecture changes explicitly.

## apps/web URL Naming Convention

`apps/web` uses two namespaces for parent-related pages — they are both admin-only and fully protected by `isAdminPortalRole` middleware:

- `/parent/*` (singular) — **Admin management section** for parent-related configuration. These pages use `AdminShell` and admin APIs. They are NOT the parent portal runtime.
  - `/parent/` — Admin dashboard: parent content and onboarding stats
  - `/parent/content/` — Manage parent education courses/modules
  - `/parent/completed/` — View guardians who completed onboarding
  - `/parent/athlete/` — Overview of athletes linked to guardian accounts
  - `/parent/onboarding/` — Guardian onboarding configuration
  - `/parent/php-plus/` — PHP Plus tier management
  - `/parent/progress/` — Athlete training progress overview (admin view)
  - `/parent/schedule/` — Admin's own session schedule (admin-side only; see comment in file)
  - `/parent/settings/` — Admin profile settings
  - `/parent/messages/` — Message thread overview (links to /messaging)
  - `/parent/support/` — App feedback panel
  - `/parent/billing/` — Redirects to `/billing`

- `/parents/*` (plural) — **Admin guardian management**. Listed in the admin sidebar.
  - `/parents/` — Guardian list with search and stats
  - `/parents/[parentId]/` — Individual guardian detail

## Parent Portal Runtime

The real parent/guardian portal runtime lives in `apps/parent`. Do not add parent-facing authenticated flows to `apps/web`. All `/parent/*` and `/parents/*` routes in apps/web require an admin-level JWT (`isAdminPortalRole` check in middleware) and redirect non-admin roles to `/login`.
