# Nutrition Daily Habits (Adult) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add adult “Daily Habits” (Water/Steps/Sleep) numeric inputs with auto-ticks, persist Steps/Sleep to DB + API, and keep Nutrition Targets coach-posted (athlete read-only).

**Architecture:** Persist `steps` and `sleepHours` on the existing `nutrition_logs` row keyed by (`userId`, `dateKey`). UI derives ticks from numeric values (`> 0`), without additional booleans.

**Tech Stack:** Drizzle SQL migrations, Drizzle ORM schema, Express controllers + Zod validation, Expo/React Native + TypeScript.

---

## Files to Touch

**Create**
- [ ] `api/drizzle/0076_nutrition_daily_habits_steps_sleep.sql`

**Modify**
- [ ] `api/src/db/schema.ts`
- [ ] `api/src/controllers/nutrition.controller.ts`
- [ ] `mobile/components/programs/panels/NutritionPanel.tsx`
- [ ] `mobile/app/nutrition/log/[dateKey].tsx`
- [ ] `mobile/app/admin-nutrition.tsx` (coach/admin log viewer)

---

### Task 1: Database migration (add Steps + Sleep)

**Files:**
- Create: `api/drizzle/0076_nutrition_daily_habits_steps_sleep.sql`

- [ ] Step 1: Add migration SQL

```sql
ALTER TABLE "nutrition_logs" ADD COLUMN "steps" integer DEFAULT 0;
ALTER TABLE "nutrition_logs" ADD COLUMN "sleepHours" integer DEFAULT 0;
```

- [ ] Step 2: Run migrations locally (when a dev DB is available)

Run:
- `pnpm -C apps/api db:migrate`

Expected:
- Migration applies cleanly; no errors.

---

### Task 2: Drizzle schema update

**Files:**
- Modify: `api/src/db/schema.ts`

- [ ] Step 1: Add columns to `nutritionLogsTable`

Add alongside `waterIntake`:

```ts
steps: integer().default(0),
sleepHours: integer().default(0),
```

- [ ] Step 2: Typecheck API

Run:
- `pnpm -C apps/api typecheck`

Expected:
- PASS.

---

### Task 3: API validation + persistence

**Files:**
- Modify: `api/src/controllers/nutrition.controller.ts`

- [ ] Step 1: Extend `logSchema` to accept steps/sleepHours

```ts
steps: z.number().int().min(0).optional().nullable(),
sleepHours: z.number().int().min(0).optional().nullable(),
```

- [ ] Step 2: Verify `upsertLog` persists new fields

Notes:
- Existing implementation spreads `...input` into insert/update, so once columns exist and Zod allows fields, persistence is automatic.

- [ ] Step 3: (Optional) quick smoke via unit/integration test

Run:
- `pnpm -C apps/api test:types`

Expected:
- PASS.

---

### Task 4: Mobile NutritionPanel — add Daily Habits UI + wire save/fetch

**Files:**
- Modify: `mobile/components/programs/panels/NutritionPanel.tsx`

- [ ] Step 1: Add local state

```ts
const [steps, setSteps] = useState(0);
const [sleepHours, setSleepHours] = useState(0);
```

- [ ] Step 2: Populate on fetch

When a log exists:

```ts
setSteps(typeof currentLog.steps === "number" ? currentLog.steps : 0);
setSleepHours(typeof currentLog.sleepHours === "number" ? currentLog.sleepHours : 0);
```

When clearing/resetting state (no log):

```ts
setSteps(0);
setSleepHours(0);
```

- [ ] Step 3: Include in save payload

```ts
steps,
sleepHours,
```

- [ ] Step 4: Render “Daily Habits” card under the log

Requirements:
- Water uses existing `waterIntake` value (already numeric).
- Steps/Sleep are numeric with `>= 0`.
- Ticks are derived:
  - `waterIntake > 0`, `steps > 0`, `sleepHours > 0`

- [ ] Step 5: Targets copy + read-only athlete UX

Requirements:
- Athlete: show targets read-only with copy “Targets set by your coach.”
- Coach/admin: show editable fields with copy “Set targets for this athlete.”

- [ ] Step 6: Mobile typecheck (best-effort)

Run:
- `pnpm -C apps/mobile typecheck`

Expected:
- PASS (or at least no new errors from touched files).

---

### Task 5: Log detail views — display Steps/Sleep

**Files:**
- Modify: `mobile/app/nutrition/log/[dateKey].tsx`
- Modify: `mobile/app/admin-nutrition.tsx`

- [ ] Step 1: Read steps/sleepHours from `log` with safe defaults

```ts
const steps = typeof log?.steps === "number" ? log.steps : 0;
const sleepHours = typeof log?.sleepHours === "number" ? log.sleepHours : 0;
```

- [ ] Step 2: Render in the existing “Habits”/summary section

Keep formatting consistent with water and other numeric fields.

---

## Self-review checklist (spec coverage)

- [ ] Athlete cannot edit targets (UI + backend enforced)
- [ ] Daily Habits section exists under adult log
- [ ] Water/Steps/Sleep show numeric value + auto tick when value > 0
- [ ] Steps/Sleep persist (save → reload)
- [ ] Log detail screens render steps/sleepHours
