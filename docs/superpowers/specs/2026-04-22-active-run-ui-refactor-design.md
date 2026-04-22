# Active Run UI Refactor (Tracking Tab)

Date: 2026-04-22
Scope: `apps/mobile/app/(tabs)/tracking/active-run.tsx` (live map while recording)

## Goal

Refactor the Active Run experience to match the attached reference UI:

- Full-screen map background (dark look)
- Minimal top-left exit control
- Right-side vertical map controls (layers / 3D / recenter)
- Bottom “stats” card (Time, Split avg (/km), Distance (km))
- Bottom “action dock” with a large center play/pause button, plus left “Run” and right “Add Route”
- Swipe-up bottom sheet containing settings items and **Finish run** inside the sheet

Constraints:

- No payment, trials, locks, or gated UI.
- “Share live location” is **team** functionality; for now it navigates to `/(tabs)/tracking/social`.

Non-goals (for this refactor):

- Implementing actual team live-location sharing.
- Implementing map “3D” camera (UI only).
- Building full route discovery/search UX (no Nominatim).

## Current State (baseline)

`active-run.tsx` currently composes the screen using:

- `LiveMap` (map + overlays + map style switcher + recenter)
- `RunStatusOverlay` (chips top-left)
- `RunPrivacyControls` (chips row near bottom)
- `RunActionButtons` (pause/stop)
- `RunBottomBar` (time + distance)
- `RunStopSheet` (stop confirmation)

## Proposed Approach (Recommended)

Re-compose the screen using new “chrome” components while preserving tracking logic and the existing `LiveMap` rendering:

1) Keep all data/engine logic in `active-run.tsx`:
   - `useRunStore` state (status, coords, elapsed, distance)
   - `useRunTrackingEngine` (GPS, follow-user, polylines)
   - background tracking toggles + OSRM consent flow remain available (but moved to the sheet)

2) Replace the current overlay components with:
   - **Top-left**: a round “chevron-down” button to exit/back
   - **Right controls**: a stacked set of circular buttons:
     - “Layers” (opens sheet to Map section)
     - “3D” (no-op, visual only)
     - “Recenter” (sets `followUser=true`)
   - **Bottom Stats Card**:
     - Time: `formatDurationClock(elapsedSeconds)`
     - Split avg (/km): derived from `elapsedSeconds` and `distanceMeters` (guard against 0)
     - Distance (km): `formatDistanceKm(distanceMeters, 2)` (or `--` early)
   - **Bottom Action Dock**:
     - Left: “Run” (context action; for now opens sheet)
     - Center: big Play/Pause
     - Right: “Add Route” (starts a simple “tap map to set destination” flow later; for now navigates to existing destination flow or opens a placeholder)

3) Add a swipe-up **ActiveRunSheet**:
   - Top handle bar
   - Menu items (tap rows):
     - Share live location → `router.push("/(tabs)/tracking/social")`
     - Track laps (toggle placeholder stored in component state for now)
     - Add a sensor (placeholder)
     - Settings (placeholder)
   - **Finish run** primary action:
     - Calls `stopRun()`
     - Navigates to `/(tabs)/tracking/summary`

4) Remove the separate stop confirmation sheet (`RunStopSheet`) in favor of the sheet’s Finish action.

## Interaction Details

- Play/Pause:
  - If `status === "running"` → pause
  - If `status === "paused"` → resume
  - If `status === "idle"` → start (reuse existing behavior; ensure GPS watch starts as today)

- Exit/back:
  - If running, it should not silently discard. For now:
    - Open the sheet (prompt user to Finish or keep running), or
    - Navigate back only when paused.
  - Decision: default to opening the sheet when the run is active; otherwise `router.replace("/(tabs)/tracking")`.

- Recenter:
  - `setFollowUser(true)`

## Visual Tokens

- Use existing theme tokens from `useAppTheme()`:
  - dark glass backgrounds, borders, and subtle shadows consistent with current code.
- Use circular buttons + soft shadows similar to the reference.
- No lock icons or “premium” markers anywhere.

## Files to Change

- `apps/mobile/app/(tabs)/tracking/active-run.tsx` (recompose layout)
- Add new components under `apps/mobile/components/tracking/active-run/`:
  - `ActiveRunActionDock.tsx`
  - `ActiveRunStatsCard.tsx`
  - `ActiveRunSheet.tsx`
  - `ActiveRunMapControls.tsx`

Optional adjustments:
- `apps/mobile/components/tracking/active-run/LiveMap.tsx` (expose any needed hooks/props for recenter + right controls)

## Verification

- iOS + Android:
  - Start run → map renders and tracks path
  - Pause/resume updates state correctly
  - Bottom stats update live
  - Swipe up sheet opens/closes smoothly
  - “Finish run” ends run and navigates to summary
  - “Share live location” navigates to `/(tabs)/tracking/social`
  - No Nominatim/search calls are made
  - No payment/trial UI appears

