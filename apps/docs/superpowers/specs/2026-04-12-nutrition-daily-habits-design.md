# Nutrition: Adult Daily Habits + Coach Targets (Auto Ticks)

Date: 2026-04-12

## Context

- Mobile (Expo / React Native) adult athlete nutrition log was converted to the youth-style interactive checklist.
- Adult logs already support meal slots + snack slots + `waterIntake` + 1–5 metrics (`mood`, `energy`, `pain`) and legacy `foodDiary`.
- Adult “Nutrition Targets” already exist in the UI and are editable only for `coach|admin|superAdmin` when a valid `athleteUserId` is selected.
- Backend already enforces targets updates as coach/admin only.

## Goals

1. Targets are treated as **coach-posted goals**; athletes can **view but not edit**.
2. Add a new section under the nutrition log: **Daily Habits**
   - Habits: **Water intake**, **Steps**, **Sleep**
   - Includes **numeric entry** for each
   - Includes a **tick-based consistency indicator**
3. Ticks should be **automatic** (no manual toggles).

## Non-goals

- No new pages, modals, filters, or analytics.
- No automatic health integrations (Apple Health / Google Fit).
- No coach-set goals for steps/sleep in this iteration (ticks are derived from numeric presence only).

## Product / UX

### Nutrition Targets (adult)

- Athlete view is read-only.
- Coach/admin view remains editable (existing `canEditTargets` gating).
- Copy should communicate clearly:
  - Athlete: “Targets set by your coach.”
  - Coach/admin: “Set targets for this athlete.”

### Daily Habits section (adult log tab)

Three rows: Water, Steps, Sleep.

Each row includes:

- A left-side **auto tick indicator**
- A label
- A numeric input

Auto-tick rule (Option A):

- Water tick = `waterIntake > 0`
- Steps tick = `steps > 0`
- Sleep tick = `sleepHours > 0`

Input behavior:

- Empty input is treated as 0.
- Only non-negative integers allowed.

## Data model

### Existing

- `nutrition_logs.waterIntake` already exists as `integer`.

### New

Add to `nutrition_logs`:

- `steps integer default 0`
- `sleepHours integer default 0`

Rationale:

- Keeps habits stored alongside the daily nutrition log.
- Minimal schema / API surface.

## API changes

### `POST /nutrition/logs`

- Accept optional `steps` and `sleepHours`.
- Validate as `int >= 0`.
- Upsert into `nutrition_logs` along with existing fields.

### `GET /nutrition/logs`

- No behavioral change; returned log objects now include `steps` and `sleepHours`.

## Mobile changes

### `NutritionPanel` (adult log tab)

- Add local state for `steps` and `sleepHours`.
- On fetch: populate from returned log (`currentLog.steps`, `currentLog.sleepHours`).
- On save: include `steps`, `sleepHours` in the POST body.
- Render new “Daily Habits” card below the existing log checklist.
- Tick UI is derived from numeric values (no separate persisted boolean).

### Log detail view

- Display steps + sleep if present (or 0), consistent with other interactive fields.

## Permission model

- Targets updates:
  - Backend already restricts `PUT /nutrition/targets/:userId` to `coach|admin|superAdmin`.
  - Mobile UI continues to hide editing unless coach/admin and a real athlete is selected.
- Habits are part of the athlete’s daily log and are editable by the logging user, same as the rest of the log.

## Acceptance criteria

- Adult nutrition log shows a Daily Habits section with numeric inputs for water/steps/sleep.
- Ticks automatically reflect whether the corresponding number is > 0.
- Saving and reloading the day persists steps + sleep values.
- Athletes cannot edit Nutrition Targets; coaches/admins can.

## Edge cases

- If an older log row has null/undefined steps/sleep (before migration), UI treats as 0.
- If user clears a value, it becomes 0 and the tick turns off.
