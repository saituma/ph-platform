# Adult Session Workout Logging (Per-Session) — Design

**Status:** Draft (approved direction: Option A)

## Goal

When an **adult athlete (age ≥ 18)** taps **Complete Session** on a training-content-v2 session, show a **low-stress optional logging sheet** to capture:

- weights used (free text)
- reps completed (free text)
- RPE (optional 1–10)

Then mark the session complete and store the workout log in the DB per user/athlete.

This must not stress users: logging is optional and completion must be possible without entering anything.

## Non-goals

- Per-exercise logging
- Complex structured sets/reps modeling
- Analytics dashboards / history UI
- Achievements integration (legacy program-section completion system)

## UX / Flow

### Trigger

- Only for **adult** athletes: `age >= 18`.
- Applies whether athlete has a team or not.

### Sheet content

A modal/sheet titled **“Log workout (optional)”** with:

- **Weights used** (optional, multiline text)
- **Reps completed** (optional, multiline text)
- **RPE** (optional, integer 1–10; can be picker/stepper)

### Actions

- **Primary:** `Save & Complete`
  - If at least one field is filled, submit log payload + complete session.
  - If all fields are empty, behave the same as “Complete without logging”.
- **Secondary:** `Complete without logging`
  - Complete session with no log payload.
- **Tertiary:** `Cancel`
  - Close sheet, do not complete.

### Success

- On success, navigate to the next session (existing `useSessionNavigation` behavior).

### Errors

- If the API call fails, keep the sheet open and show a simple error message with a retry action.

## Data model

Add a new table to persist per-session logs for training-content-v2 completions.

### Table: `athlete_training_session_workout_logs`

**Purpose:** store optional workout log fields keyed by athlete + session.

**Columns** (proposed):

- `id` (identity PK)
- `athlete_id` (FK → `athletes.id`, required)
- `session_id` (FK → `training_module_sessions.id`, required)
- `weights_used` (text, nullable)
- `reps_completed` (text, nullable)
- `rpe` (int, nullable, validated 1–10)
- `created_at`, `updated_at`

**Constraints / indexes**:

- Unique `(athlete_id, session_id)` so the log is upsertable.
- Indexes on `athlete_id` and `session_id` for lookups.

**Relationship with completion**:

- Completion continues to be tracked in `athlete_training_session_completions`.
- The workout log is optional and independent; it is typically written in the same request as completion.

## API contract

Reuse the existing completion endpoint:

### `POST /training-content-v2/mobile/sessions/:sessionId/finish`

**Auth:** same as today (requires logged-in user, resolved athlete).

**Request body (optional):**

```json
{
  "weightsUsed": "string (optional)",
  "repsCompleted": "string (optional)",
  "rpe": 7
}
```

**Validation:**

- `weightsUsed` and `repsCompleted`:
  - optional
  - trim
  - allow empty/omitted
  - cap length (e.g. 2000 chars) to prevent abuse
- `rpe`:
  - optional
  - integer 1–10

**Behavior:**

1. Confirm athlete exists + has age.
2. Confirm session exists and is unlocked (current logic).
3. If at least one of `{weightsUsed, repsCompleted, rpe}` is present after normalization:
   - upsert into `athlete_training_session_workout_logs` for `(athleteId, sessionId)`.
4. Insert completion row into `athlete_training_session_completions` if not already completed.
5. Return `201` with completion item (and optionally a `workoutLog` echo; not required for MVP).

**Idempotency:**

- Completion insert already behaves idempotently (unique athlete+session).
- Workout log upsert means repeated calls update the same record.

## Mobile implementation notes

- Session detail route already computes `activeAge`.
- Replace `onCompleteSession` handler:
  - if `activeAge >= 18`: open the workout logging modal
  - else: keep existing direct navigation behavior

### Networking

- Call `apiRequest` with `POST /training-content-v2/mobile/sessions/:sessionId/finish`.
- Send body only when logging fields are non-empty.
- Keep the existing “navigate to next session” after success.

## Edge cases

- Athlete age missing → backend returns error; mobile shows failure message.
- User completes without logging → completion is still recorded.
- User logs then completes again → workout log gets updated, completion remains completed.

## Testing

- API: add tests for
  - finish without body (existing behavior unchanged)
  - finish with log body persists row + returns 201
  - invalid rpe rejected (400)
  - locked session rejected (403) (existing)

- Mobile: basic manual verification
  - adult sees modal
  - youth does not
  - both can still complete and navigate

## Open questions (intentionally deferred)

- Display/edit previous logs in the session screen.
- Export logs or coach visibility.
