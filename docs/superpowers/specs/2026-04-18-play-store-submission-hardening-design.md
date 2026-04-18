# Play Store Submission Hardening (Mobile) — Design

Date: 2026-04-18

Target: `apps/mobile`

## Goal

Reduce Google Play review friction and policy risk by:

1. Making **background location collection** explicitly user-initiated and clearly disclosed.
2. Making **OSRM routing (third-party location sharing)** explicitly user-controlled and disclosed.
3. **Pruning Android permissions** to the minimum required for the shipped feature set.
4. Ensuring the **in-app fallback privacy policy** is accurate even when offline / backend legal content is unavailable.

Non-goals:

- Replacing OSRM with a self-hosted routing backend.
- Removing background run tracking.
- Full Play Console setup (Data safety form, background location declarations) beyond providing an accurate mapping/checklist.

## Current State (Key Findings)

- App requests background location and foreground service permissions in `apps/mobile/app.json`.
- Background tracking is implemented with `expo-location` + `expo-task-manager` in `apps/mobile/lib/backgroundTask.ts`, including an in-app disclosure `Alert` before requesting background permissions.
- Run screen (`apps/mobile/app/(tabs)/tracking/active-run.tsx`) starts background updates automatically whenever run status is `"running"`.
- Route polyline fetching calls `router.project-osrm.org` with user coordinates in `apps/mobile/hooks/tracking/useRunTrackingEngine.ts`.
- In-app Terms/Privacy Policy surfaces exist and are linked from the “More” tab.

## Proposed Changes

### 1) Background Tracking Becomes an Explicit Run-Time Control

Add a run-time control: `Background tracking (locked phone)`.

Behavior:

- Default: **OFF** for new installs (and optionally remember last choice per user/device).
- When OFF:
  - Use foreground `watchPositionAsync` for live trail while app is open.
  - Do **not** request `ACCESS_BACKGROUND_LOCATION`.
  - Do **not** start the `TaskManager` background location task.
- When ON:
  - Show an explicit disclosure before requesting background permission (existing disclosure copy can be tightened).
  - Request background permission.
  - Start `startLocationUpdatesAsync(..., { foregroundService: ... })` so Android shows the ongoing notification during the active run.
- When toggled OFF mid-run:
  - Stop location updates task.
  - Keep foreground watch active (if app is open).

Policy intent:

- Background location is collected **only during an active run session the user starts manually**, and only after the user explicitly enables background tracking for that run.

### 2) OSRM Routing Becomes an Explicit Control + One-Time Consent

Add a run-time control: `Show suggested route (uses OSRM)`.

Behavior:

- Default: **OFF**.
- When OFF: never call `router.project-osrm.org`.
- When ON and a destination is set:
  - Show one-time disclosure stating that enabling this feature sends location (start/destination and/or current location depending on implementation) to the OSRM service to compute a route.
  - Store consent locally (AsyncStorage) so the user isn’t prompted repeatedly.
  - Fetch and render route polyline.

Implementation detail:

- Route fetching logic currently lives in `useRunTrackingEngine`. It should be gated by the toggle/consent state.

### 3) Android Permission Pruning

Update `apps/mobile/app.json` Android permissions list:

- Remove `android.permission.READ_EXTERNAL_STORAGE` unless a concrete requirement exists.
  - App already requests `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO` which cover modern Android media access.
- Keep permissions that are clearly used:
  - Location: `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`
  - Notifications: `POST_NOTIFICATIONS`
  - Camera/media: `CAMERA`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`
  - Audio capture: `RECORD_AUDIO` and (only if required by `expo-audio`) `MODIFY_AUDIO_SETTINGS`
  - Media playback service: keep `FOREGROUND_SERVICE_MEDIA_PLAYBACK` only if a true foreground media playback service is used.

Notes:

- Permission list should match shipped features. If a feature is optional or behind a flag, prefer removing its permission until the feature is ready to ship.

### 4) Offline Fallback Privacy Policy Must Mention Location + Third Parties

Update `fallbackContent` in `apps/mobile/app/privacy-policy.tsx` to explicitly include:

- Foreground location usage for live run tracking.
- Background location usage only during active runs when enabled by the user for locked-phone tracking.
- OSRM routing: when user enables “suggested route”, location is sent to OSRM to compute a route polyline.
- YouTube/Loom oEmbed: video URL previews may call those services.

Also ensure it still states account deletion path and user rights.

## UX Surfaces (Where Controls Live)

Primary surface: Active Run screen (`/(tabs)/tracking/active-run`).

Controls:

- A toggle or segmented control row in the run overlay/bottom bar:
  - `Background tracking`
  - `Suggested route`

States:

- Disabled state when GPS is not available / permissions denied.
- “Needs permission” state with a clear action to request permission.

## Technical Plan (High Level)

1. Introduce a small local preferences module (AsyncStorage-backed) for:
   - `backgroundTrackingEnabled` (per-run default and persisted last choice)
   - `osrmRoutingEnabled` and one-time consent
2. Update `active-run.tsx` to:
   - Start foreground watch on run start as it does today.
   - Only call `startLocationTracking()` when background tracking toggle is ON.
3. Update `backgroundTask.ts`:
   - Keep existing disclosure, but ensure it’s only presented when user explicitly enables background tracking.
4. Update `useRunTrackingEngine.ts`:
   - Gate OSRM route fetching behind routing toggle and consent.
5. Prune `android.permissions` in `apps/mobile/app.json`.
6. Update `privacy-policy.tsx` fallback content.

## Testing / Verification

Local (dev build):

- Start run with background tracking OFF:
  - No background permission prompt.
  - No foreground-service persistent notification.
  - Trail updates while app is open.
- Toggle background tracking ON during run:
  - Disclosure shown, then background permission requested.
  - Foreground service notification appears.
  - Lock phone: tracking continues.
- Toggle background tracking OFF:
  - Background task stops; notification disappears.
- OSRM routing OFF:
  - No OSRM requests.
- Enable OSRM routing:
  - One-time disclosure shown; consent stored.
  - Route renders; requests happen only while enabled.

Play Console mapping (manual step):

- Data safety:
  - Location collected and used for run tracking.
  - Location shared with OSRM for routing when user enables the feature.
- Background location declaration:
  - Justification: run tracking while phone locked during active sessions.
  - Confirmation of prominent disclosure + ongoing notification.

## Risks / Trade-offs

- Defaulting background tracking OFF adds one extra user step but reduces “surprise background location” and aligns with policy intent.
- OSRM gating may reduce perceived “magic” but reduces silent third-party location sharing.

