# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` + Turborepo monorepo.
- `apps/mobile`: Expo React Native app (route files under `app/`, shared logic in `lib/` and `components/`).
- `apps/web`: Next.js web client.
- `apps/api`: Express/TypeScript backend, scripts in `src/scripts/`, tests in `test/`.
- `apps/docs`, `apps/showcase`, `apps/onboarding`, `apps/superadmin`, `apps/worker`: supporting products and services.
- `e2e/`: Playwright end-to-end tests.
- `assets/`: shared static assets.
- `docs/`: project/product documentation.
- `patches/`: `pnpm` patched dependency fixes.

## Build, Test, and Development Commands
Run from repo root unless noted.
- `pnpm dev:web`: start the `web` app locally.
- `pnpm --filter mobile start`: run Expo dev server for mobile.
- `pnpm --filter api dev`: run API in watch mode.
- `pnpm build`: Turbo build for `web`.
- `pnpm build:all`: build all workspaces.
- `pnpm test`: run workspace test pipelines.
- `pnpm test:unit`: run unit tests across `api`, `web`, and `mobile`.
- `pnpm test:e2e` (after `pnpm test:e2e:install`): run Playwright specs in `e2e/`.
- `pnpm db:migrate`: run API migrations.

## Coding Style & Naming Conventions
- Primary language is TypeScript.
- Use 2-space indentation and keep files focused; run `pnpm check:max-lines` when touching large files.
- Biome is used in several apps (`api`, `onboarding`, `superadmin`) for lint/format (`pnpm --filter api lint`, `pnpm --filter api format`).
- Web uses ESLint (`pnpm --filter web lint`).
- Naming: React components `PascalCase`, hooks `useSomething`, route files aligned to framework conventions (e.g., Expo Router `app/**`, Next.js `app/**` or `pages/**`).

## Testing Guidelines
- Unit/integration: Jest (`apps/api`, `apps/web`), plus TypeScript checks.
- Additional app tests: Vitest in `onboarding` and `superadmin`.
- E2E: Playwright specs named `*.spec.ts` in `e2e/` (example: `e2e/login.spec.ts`).
- Add or update tests for behavioral changes; prioritize API contract paths and auth/subscription flows.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history: `fix(api): ...`, `chore(heroku): ...`.
- Keep subject lines imperative and scoped to one area/app.
- PRs should include: concise summary, impacted apps, test evidence (commands run), related issue, and screenshots/video for UI changes.
- Note config or migration impacts explicitly (env vars, DB changes, rollout order).
