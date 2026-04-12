# Metrics UI refresh (Session + Exercise detail)

Date: 2026-04-12

## Problem

In the mobile training UI, key prescription data (e.g. **Sets**, **Reps**, **Rest**, **Duration**, plus **Steps/Cues**) is visually “flat”:

- Metrics often appear as small, same-weight inline text (chips/lines).
- Labels and values do not have clear hierarchy.
- Session list cards and exercise detail pages do not share a consistent metric presentation.

This makes important training prescriptions harder to scan quickly.

## Goals

- Make key metrics **stand out** (clear label vs. big value).
- Use a **consistent** visual language across:
  - Programs → Modules → Session → **Session detail list**
  - Programs → Exercise → **Exercise detail**
  - Reusable exercise overview UI used elsewhere
- Improve readability of **Steps/Cues/Progression/Regression** sections (distinct headers + spacing).

## Non-goals

- Changing any data model, API, or business logic.
- Redesigning the entire session card layout.
- Adding new metrics; only re-present existing fields.

## Recommended approach (A): Metric tiles + section cards

### 1) Introduce reusable metric components

Create a shared component for a 2-column metric grid:

- `ProgramMetricTile`
  - Label: small caps (high letter spacing)
  - Value: large number/text (tabular when numeric)
  - Stronger background, clearer border
  - Optional accent strip (uses theme accent for high salience)
- `ProgramMetricGrid`
  - 2-column responsive layout (wraps)
  - Accepts a list of `{ label, value, unit?, accent? }`

Location:

- `apps/mobile/components/programs/metrics/ProgramMetricGrid.tsx`

### 2) Session detail list (SessionExerciseBlock)

Replace inline text chips such as:

- “3 sets”, “8 reps”, “Rest 60s”, “45s”

With the metric tile grid:

- Sets
- Reps
- Duration (s)
- Rest (s)
- Category (if present)
- Equipment (if present)

Location:

- `apps/mobile/components/programs/SessionExerciseBlock.tsx`

Also upgrade “Steps/Cues/Progression/Regression” blocks to a consistent **section card** style:

- Header row: icon + uppercase label
- Body: `MarkdownText` / plain `Text` with larger base font and line height

### 3) Exercise detail + ExerciseOverview

Replace the existing pill-shaped metric components with the same metric grid tiles, ensuring consistent hierarchy.

Locations:

- `apps/mobile/app/programs/exercise/[planExerciseId].tsx`
- `apps/mobile/components/programs/content-detail/ExerciseOverview.tsx`

## Visual spec (tokens / hierarchy)

Metric tile:

- Container:
  - Background: `colors.surfaceHigh` (or `colors.cardElevated` equivalent in this theme)
  - Border: `colors.borderSubtle` (or soft fallback)
  - Radius: `radius.xl` / `radius.lg` (match nearby cards)
  - Padding: ~14–16
- Label:
  - 10–11px, caps, tracking 1.4–2.0, `colors.textSecondary`
- Value:
  - 22–28px (depending on available space), `colors.textPrimary`
  - Numeric values use `fontVariant: ['tabular-nums']` when supported

Grid:

- 2-column layout: `flexDirection: 'row'`, `flexWrap: 'wrap'`
- Each tile `flexBasis: '48%'` with gap/padding consistent with existing screens.

Section cards (Steps/Cues/etc):

- Title: uppercase label + icon (Feather)
- Body: 15px base, 24px line height (align with existing Markdown patterns)

## Acceptance criteria

- On **Session detail**:
  - Sets/Reps/Rest/Duration appear as metric tiles (not tiny inline text).
  - Steps/Cues/Progression/Regression look clearly separated and readable.
- On **Exercise detail**:
  - The same metric tiles are used for consistency.
- No functional regressions: navigation, uploads, and existing content rendering still work.

## Test plan (manual)

- Open a session with multiple items:
  - Items with: sets/reps/rest, duration-only, and missing fields.
  - Verify the grid gracefully omits missing metrics.
- Open an exercise detail page:
  - Verify metrics match the same values as before (no formatting changes except presentation).
- Dark + light themes:
  - Verify contrast and borders remain clear.

