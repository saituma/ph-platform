# Nutrition Logs (Youth): Meal Details + 3 Snack Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let youth nutrition logs capture “what they ate” for meals and split snacks into morning/afternoon/evening, without changing adult food diary.

**Architecture:** Extend `nutrition_logs` with 3 snack columns, extend the nutrition log upsert schema/controller to accept them (and still accept legacy `snacks`), then update the mobile `NutritionPanel` youth UI to show conditional text inputs for meals/snacks and map toggles <-> stored strings.

**Tech Stack:** Drizzle migrations + drizzle schema (`apps/api`), Express controllers with Zod validation (`apps/api`), Expo Router + React Native (`apps/mobile`).

---

## File Map

**Backend**
- Modify: `apps/api/src/db/schema.ts`
- Create: `apps/api/drizzle/0074_nutrition_snack_slots.sql` (migration number may differ; pick next available)
- Modify: `apps/api/drizzle/meta/_journal.json` (auto-updated by drizzle workflow if you use existing patterns)
- Modify: `apps/api/src/controllers/nutrition.controller.ts`

**Mobile**
- Modify: `apps/mobile/components/programs/panels/NutritionPanel.tsx`

**Docs**
- (Already done) Spec: `docs/superpowers/specs/2026-04-11-nutrition-youth-meal-details-design.md`

---

### Task 1: DB Migration + Schema Columns

**Files:**
- Create: `apps/api/drizzle/0074_nutrition_snack_slots.sql`
- Modify: `apps/api/src/db/schema.ts`

- [ ] **Step 1: Create SQL migration**

Add three nullable text columns:

```sql
ALTER TABLE "nutrition_logs" ADD COLUMN "snacksMorning" text;
ALTER TABLE "nutrition_logs" ADD COLUMN "snacksAfternoon" text;
ALTER TABLE "nutrition_logs" ADD COLUMN "snacksEvening" text;
```

- [ ] **Step 2: Update Drizzle schema**

In `nutritionLogsTable`, add:

```ts
snacksMorning: text(),
snacksAfternoon: text(),
snacksEvening: text(),
```

- [ ] **Step 3: Typecheck backend**

Run: `pnpm -C apps/api typecheck`
Expected: success

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/drizzle/0074_nutrition_snack_slots.sql
git commit -m "feat(api): add nutrition snack slot columns"
```

---

### Task 2: API Validation + Upsert Support (Backwards Compatible)

**Files:**
- Modify: `apps/api/src/controllers/nutrition.controller.ts`

- [ ] **Step 1: Extend `logSchema`**

Add optional nullable strings:

```ts
snacksMorning: z.string().optional().nullable(),
snacksAfternoon: z.string().optional().nullable(),
snacksEvening: z.string().optional().nullable(),
```

Keep legacy `snacks` as-is.

- [ ] **Step 2: Ensure upsert writes the new fields**

Because `upsertLog` spreads `input` into the DB update/insert, ensuring `logSchema` includes the fields is sufficient.

- [ ] **Step 3: Run backend typecheck**

Run: `pnpm -C apps/api typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/controllers/nutrition.controller.ts
git commit -m "feat(api): accept nutrition snack slot fields"
```

---

### Task 3: Mobile Youth UI (Dynamic Meal Detail Inputs)

**Files:**
- Modify: `apps/mobile/components/programs/panels/NutritionPanel.tsx`

- [ ] **Step 1: Replace youth meal state model**

Current youth uses:
- `breakfast/lunch/dinner/snacks` as booleans

New youth state should track per-slot:
- toggle boolean + details string

Suggested mapping helpers (local functions in the component):

```ts
const parseSlot = (value: unknown) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return { checked: false, details: "" };
  if (raw.toLowerCase() === "yes") return { checked: true, details: "" };
  return { checked: true, details: raw };
};

const serializeSlot = (checked: boolean, details: string) => {
  if (!checked) return "";
  const d = details.trim();
  return d.length ? d : "yes";
};
```

- [ ] **Step 2: Load behavior**

When loading a log:
- For breakfast/lunch/dinner: parse from `currentLog.breakfast/lunch/dinner`
- For snacks:
  - Prefer `snacksMorning/snacksAfternoon/snacksEvening`
  - If all three are empty AND legacy `currentLog.snacks` has content:
    - Parse legacy snacks into morning slot (UI-only prefill) until next Save.

- [ ] **Step 3: UI behavior**

For each slot:
- show toggle
- if toggle on, show `TextInput` (“What did you eat?”)

Snacks section should have 3 toggles + 3 conditional inputs.

- [ ] **Step 4: Save behavior**

On save, send youth fields:
- `breakfast/lunch/dinner` as serialized strings
- `snacksMorning/snacksAfternoon/snacksEvening` as serialized strings

Do NOT send adult-only fields (keep existing adult Food Diary behavior).

- [ ] **Step 5: Mobile typecheck**

Run: `pnpm -C apps/mobile typecheck`

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/components/programs/panels/NutritionPanel.tsx
git commit -m "feat(mobile): youth meal details and snack slots in nutrition panel"
```

---

### Task 4: Quick Manual Verification Checklist

- [ ] Youth user:
  - Toggle breakfast on + enter details; Save; refresh; details persist.
  - Toggle breakfast on + leave details empty; Save; refresh; toggle stays on, details empty.
  - Toggle off; Save; refresh; toggle off.
  - Snacks: morning/afternoon/evening behave independently.
- [ ] Adult user:
  - Food Diary unchanged.
- [ ] Legacy log:
  - If server returns legacy `snacks` and new snack fields empty, UI pre-fills morning snack from legacy.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-11-nutrition-youth-meal-details-implementation.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session, batch execution with checkpoints for review

Which approach?

