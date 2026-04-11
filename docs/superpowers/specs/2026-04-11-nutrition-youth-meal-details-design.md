# Nutrition Logs (Youth): Meal Details + 3 Snack Slots

Date: 2026-04-11

## Summary
Improve the Youth Nutrition/Welness tracking flow by letting athletes/guardians record *what was eaten* per meal, and by splitting snacks into three distinct time slots: morning, afternoon, and evening.

Adults already have a freeform **Food Diary** and will not receive this change.

## Goals
- Youth can optionally describe **what they ate** for:
  - Breakfast
  - Lunch
  - Dinner
- Youth snacks are split into **three slots**:
  - Morning snack
  - Afternoon snack
  - Evening snack
- The UI remains fast: toggles first, details only when the toggle is on.
- Backwards-compatible with existing stored logs and older app builds.

## Non-Goals
- Adult nutrition UI changes (keep Food Diary as-is).
- Advanced nutrition calculations (macros, meal photos, etc.).
- Multiple entries per meal (single text field per slot for now).

## Current State (Relevant)
- API endpoints:
  - `GET /nutrition/logs`
  - `POST /nutrition/logs` (upsert)
- DB table: `nutrition_logs`
  - Youth fields today: `breakfast`, `snacks`, `lunch`, `dinner` are `text` columns.
  - Mobile youth UI currently uses boolean toggles and does not collect per-meal details.

## Proposed Design

### Data Model
Reuse existing columns where possible, extend for snack slots.

1. **Breakfast/Lunch/Dinner**
- Keep using `nutrition_logs.breakfast`, `.lunch`, `.dinner` as `text`.
- Store values with this convention:
  - `""` (empty string): not eaten / not selected
  - `"yes"`: eaten/selected but no details entered
  - any other string: details of what they ate

2. **Snacks (new split fields)**
- Add three new `text` columns to `nutrition_logs`:
  - `snacksMorning`
  - `snacksAfternoon`
  - `snacksEvening`
- Same storage convention: `""` / `"yes"` / details string.

3. **Legacy `snacks` (existing column)**
- Keep `nutrition_logs.snacks` for backwards compatibility and older app builds.
- Migration behavior:
  - Do not delete/overwrite `snacks` automatically.
  - UI compatibility rule:
    - If `snacksMorning/snacksAfternoon/snacksEvening` are all empty, but legacy `snacks` has content, treat it as prefill for **Morning snack** in the UI (read-only indicator like “legacy value”) until the user saves.

### API

1. `POST /nutrition/logs`
- Extend request schema to accept (optional):
  - `snacksMorning`, `snacksAfternoon`, `snacksEvening`
- Continue accepting legacy `snacks` field to avoid breaking old builds.

2. `GET /nutrition/logs`
- No behavior change; response will include the new columns as part of the selected log rows.

### Mobile UI (Youth)

Replace the current youth checklist behavior:

1. Meals: Breakfast, Lunch, Dinner
- Each meal has a toggle.
- When toggled on, show a text input:
  - Label: “What did you eat?”
  - Placeholder: “e.g., eggs, bread, fruit”

2. Snacks
- Replace single “Snacks” toggle with three toggles:
  - Morning snack
  - Afternoon snack
  - Evening snack
- Each toggle reveals its own “What did you eat?” input.

3. Save behavior mapping
- Toggle OFF: send `""` (empty string)
- Toggle ON with empty details: send `"yes"`
- Toggle ON with details: send that details string

4. Load behavior mapping
- If stored value is `""`/`null`: toggle off, empty input.
- If stored value is `"yes"`: toggle on, empty input.
- If stored value is any other non-empty string: toggle on, input prefilled.

### Permissions / Roles
- The existing API behavior allows posting logs for `athleteId` from the mobile app (guardian/admin flows exist).
- No changes to authorization logic in this spec; the feature is purely data capture for existing allowed users.

## Error Handling
- If saving fails, keep the current in-memory UI state and show existing error/status feedback.
- Inputs should be trimmed before sending; if details become empty after trim, treat as `"yes"` when the toggle is on.

## Testing Plan

### Backend
- Unit test `logSchema` accepts new snack fields.
- Upsert creates/updates correctly with new columns.
- Legacy field remains accepted.

### Mobile
- Toggle on/off behavior shows/hides the correct inputs.
- Load mapping:
  - `""` => off
  - `"yes"` => on + empty details
  - `"oatmeal"` => on + “oatmeal”
- Legacy migration UI behavior:
  - Existing log with `snacks="chips"` and new snack fields empty shows “chips” under Morning snack (pre-filled) and toggled on.

## Rollout / Compatibility
- New app builds will use the new snack fields.
- Old app builds will continue using legacy `snacks`.
- Server must support both simultaneously.

