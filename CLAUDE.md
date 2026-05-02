# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PH Performance — a cross-platform fitness coaching app for youth athletes, adult atheltes ,teams which have two types of teams which is youth teams and adult teams and each team have team manager and team athelets and coach-admins. Monorepo managed with pnpm workspaces + Turborepo.
If i give a screenshot match that screenshot by matching and creating my code screenshot and by comparing them
I dont want to be vague but in the apps/web it is admin portal and admin is capable of

1.  creating and managing users
2.  creating and managing teams
3.  creating and managing plans , tiers and thier prices
4.  chat with athletes, teams and post announcemnt
5.  create a programs
6.  assign programs to adult tiers but sometimes for youth tiers but it will be based on tier for youth athelets
7.  manage the athelets running history and post goals
8.  create a schedule service type for athletes and teams
9.  create and manage teams nutrition logs
10. and if anything i forget here is you will find it in apps/web sidebar list

in apps/mobile 1. i will provide you the screenshot and you will match the screenshot by creating and matching the screenshot different version incrementally and store each screenshot matches 2. make the mobile app interaction with the user as native as fast as possible 3. insure the mobile app ui not fall in ai slop vibe code ui list 4. make sure each screen works and each micro interaction works with the server before saying i completed the working on the current file 5. each role in the mobile gets thier desired ui and eac hown ui and layout 6. and each role in the mobile can access screen based on thier roles and plans so if they are not in that plan they wont see that screen from the list 7. admin can do everything that he can do in apps/web so make sure teh current implementation supports that 8. their is small plans with no tiers created in the billing section in apps/web and make sure that plan users assigned can only see the plan and progrms they are assigned on 9. adult athelts only see programs they assigned on they wont see another programs 10. team managers can control thier own team atheltes

in apps/onboarding 1. it is used as not only onbaoridng but the ph performace offical website , user portal access and alternatively the can acces the same feature they get in the mobile 2. athelets only see programs they assigned 3. they can control their billing on their status 4. team manager can use it to register their players

in apps/api 1. the main core of the server lies in here so if this notworking well have some defects the whole software collapses so make sure this is top tier level server

## Apps

| App               | Stack                                                                | Port/Runtime                                                                  |
| ----------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/api`        | Express 5, TypeScript, Drizzle ORM, PostgreSQL, Socket.IO, BullMQ    | Node                                                                          |
| `apps/mobile`     | React Native / Expo SDK 55, Expo Router (file-based), TanStack Query | iOS/Android                                                                   |
| `apps/web`        | Next.js 16, React 19, Tailwind v4, Redux Toolkit                     | Admin dashboard                                                               |
| `apps/onboarding` | TanStack Start + Router, Vite, better-auth, Neon DB                  | Athlete/parent signup and web alternative to access the sofwtare and contents |
| `apps/worker`     | Hono on Cloudflare Workers, Neon, better-auth                        | Edge auth worker                                                              |
| `apps/docs`       | Documentation site                                                   |                                                                               |
| `apps/superadmin` | Super-admin panel                                                    |                                                                               |

## Commands

```bash
# Install
pnpm install

# Dev servers
pnpm --filter api dev          # API (nodemon)
pnpm --filter web dev          # Admin dashboard (Next.js)
pnpm --filter mobile start     # Expo dev server
pnpm --filter onboarding dev   # Onboarding app (Vite)

# Build
pnpm build                     # Builds web only (heroku-build target)
pnpm build:all                 # Builds all apps via turbo

# Test
pnpm test                      # All tests via turbo
pnpm --filter api test         # API: typecheck + jest
pnpm --filter web test         # Web: jest
pnpm --filter mobile test      # Mobile: jest
pnpm test:e2e                  # Playwright (chromium)

# Single test file
pnpm --filter api -- jest path/to/file.test.ts
pnpm --filter api -- jest --watch path/to/file.test.ts

# Integration tests (require real DB)
API_INTEGRATION=1 pnpm --filter api test

# Type checking
pnpm --filter api typecheck
pnpm --filter web typecheck
pnpm --filter mobile typecheck

# Linting/formatting (API uses Biome)
pnpm --filter api lint         # biome check src test
pnpm --filter api format       # biome format --write

# Database
pnpm db:migrate                # Run migrations (via tsx script)
pnpm --filter api db:generate  # Generate new migration with drizzle-kit
pnpm --filter api db:psql      # Connect psql using .env DATABASE_URL

# Mobile native builds
pnpm --filter mobile ios
pnpm --filter mobile android
```

## Architecture Notes

### API (`apps/api`)

- Entry: `src/index.ts` → `src/server.ts` (HTTP + Socket.IO) → `src/app.ts` (Express app factory)
- Routes mounted under `/api` prefix via `src/routes/index.ts`
- DB schema in `src/db/schema.ts`, migrations in `./drizzle/` directory
- Drizzle config: `drizzle.config.ts` (PostgreSQL, schema-based migrations)
- Real-time: Socket.IO initialized in `src/socket.ts`, hub pattern in `src/socket-hub.ts`
- Background jobs: BullMQ processors in `src/jobs/`
- Services layer in `src/services/` (business logic, called by controllers)
- Auth: JWT (jose library), Firebase Admin for push notifications
- Rate limiting: Upstash Redis (`src/lib/rateLimiter.ts`)
- Object storage: MinIO (`src/lib/` or services)

### Mobile (`apps/mobile`)

- Expo Router file-based routing in `app/` directory
- Tab navigation: `app/(tabs)/` — home, programs, schedule, messages, more
- State: TanStack Query for server state, Redux Toolkit for local state
- Query keys centralized in `lib/queryKeys.ts`
- Hooks pattern: feature hooks in `hooks/` and `components/*/hooks.ts`

### Web Admin (`apps/web`)

- Next.js 16 App Router
- UI: Tailwind v4, Radix UI primitives, Lucide icons, shadcn-style components
- Charts: Recharts + Chart.js
- Real-time: socket.io-client

### Onboarding (`apps/onboarding`)

- TanStack Start (SSR) with TanStack Router
- Auth via better-auth library
- DB: Neon serverless PostgreSQL + Drizzle

## Conventions

- Package manager: pnpm 10 (strict, no npm/yarn)
- API formatter/linter: Biome (double quotes, semicolons, 2-space indent, 120 line width)
- Web/Mobile linter: ESLint
- DB ORM: Drizzle everywhere (no Prisma, no raw SQL in app code)
- Deployment: API on Render, Web on Heroku, Mobile via EAS Build, Worker on Cloudflare
- Environment: `.env` files per app (never committed), validated in `src/config/env.ts`
