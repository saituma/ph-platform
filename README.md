# Fitness Coaching App

## Overview
A cross-platform mobile-first fitness coaching app for youth football athletes, their parents, and a coach-admin dashboard.  
- **Mobile App:** iOS & Android (React Native / Expo)  
- **Admin Dashboard:** Web-based (Next.js)  
- **Backend:** Express + TypeScript API

## Key Features
- Structured training programs (PHP, PHP Plus, PHP Premium)  
- One-to-one messaging with coach (priority for Premium)  
- Booking system for calls, group sessions, and premium coaching  
- Parent education content: articles, videos, and FAQs  
- Video uploads and feedback for Premium users  
- Admin portal to manage users, content, bookings, and programs  

## Design System (for AI agents)
This repo includes a Stitch-style `DESIGN.md` in the project root. Use it as the source of truth for UI look/feel when generating or refactoring screens.

## Folder Structure
```

apps/
├── mobile/      # React Native app
├── web/         # Next.js admin dashboard
└── api/         # Express + TypeScript backend
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── lib/
│   └── index.ts
packages/        # Shared libraries (optional)

```

## Getting Started
Install dependencies:
```bash
pnpm install
```

Run each app:

```bash
pnpm --filter mobile dev    # Mobile app
pnpm --filter web dev       # Admin dashboard
pnpm --filter api dev       # Backend API
pnpm db:migrate             # Run API DB migrations locally
```

## Database (API)
Create `apps/api/.env` with `DATABASE_URL=postgres://...`, then run `pnpm db:migrate`.
