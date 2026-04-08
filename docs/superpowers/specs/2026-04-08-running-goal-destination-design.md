# Running Goal + Destination (Two-Step) Design

**Goal:** Add an optional pre-run flow to capture destination and/or distance goal, track progress during the run, and notify when reached.

## Context
Active Run is map-first. We want a lightweight, optional prompt before starting a run so users can set a destination pin and/or a distance goal. The route line continues to show the actual path. When a goal is reached, trigger haptic + in-app toast and (if permitted) a push notification.

## Flow Overview (Two-Step)
1) **Destination Prompt (Optional)**
   - Title: “Do you have a destination?”
   - Actions: `Pick on map` or `Skip`
   - If “Pick on map”: user drops a pin; we store the coordinate.

2) **Distance Goal Prompt (Optional)**
   - Title: “Any distance goal?”
   - Input: numeric km (e.g., 5.0)
   - Actions: `Start Run` or `Skip`

## UI Spec
### Tracking Home (Pre-Run)
- On “START RUN”, open the destination prompt.
- Step 1: map picker or skip.
- Step 2: distance goal input or skip.
- Explicitly label as optional (clear “Skip”).

### During Run
- Show goal chips in overlay:
  - “Goal: X km” if distance goal set.
  - “Destination set” if pin set.
- Map shows:
  - Actual path polyline (existing).
  - Destination marker (if set).

### Completion / Notifications
- When distance goal reached:
  - Haptic + toast “Goal reached!”
  - Push notification if permission granted.
- When destination reached (within threshold, e.g., 30–50m):
  - Haptic + toast “Destination reached!”
  - Push notification if permission granted.
- If notifications not allowed, only show toast + haptic.

## Data / State
- Store optional:
  - `goalKm?: number`
  - `destination?: { latitude: number; longitude: number }`
- Track:
  - `goalReached` (distance)
  - `destinationReached`
- Distance goal uses existing `distanceMeters`.

## Edge Cases
- No GPS lock: existing error state remains.
- Destination set but never reached: no notification.
- Goal set but distance never reached: no notification.
- If user cancels during prompt: default to no goal/destination.

## Files Likely Touched
- `apps/mobile/app/(tabs)/tracking/index.tsx` (intercept Start Run flow)
- `apps/mobile/app/(tabs)/tracking/active-run.tsx` (display goals + detect reach)
- `apps/mobile/store/useRunStore.ts` (store goal/destination state)
- `apps/mobile/components/tracking/...` (new prompt UI)
- `apps/mobile/lib/notifications` (if helper exists) or inline expo-notifications

## Testing
- Manual:
  - Start run with only distance goal.
  - Start run with only destination pin.
  - Start run with both.
  - Confirm toast + push when reached.
