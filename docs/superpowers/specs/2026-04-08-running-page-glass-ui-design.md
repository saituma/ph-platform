# Running Page Glass UI Design

**Goal:** Improve the Active Run screen UI with a minimal, glassy overlay while keeping the map full-screen.

## Context
Active Run is map-first. Overlays currently feel heavy and misaligned. We want a lighter, more premium overlay system optimized for the real (dev build) map.

## Approach
Use a “glass” bottom bar with time and distance, plus two floating pill buttons for Pause/Resume and Stop. Keep the status chip small and tucked top-left. All overlays respect safe area and avoid covering the route center.

## UI Spec
### Map
- Full-screen map remains the base layer.
- Map tone overlay stays subtle.

### Bottom Glass Bar
- Translucent surface (92–96% opacity).
- Thin border, soft shadow for separation.
- Left: TIME label + value.
- Right: DISTANCE label + value.
- Rounded corners (`radius.xl`).

### Floating Pills
- Two pill buttons above the bar.
- Left: Pause/Resume
  - Running: neutral glass surface, textPrimary.
  - Paused: lime filled, textInverse.
- Right: Stop
  - Coral glow background, coral border, coral text.
- Use compact height (52–56), padding for easy tap.

### Status Chip
- Top-left, small, glassy.
- Shows running/paused and GPS.
- Avoids overlapping map center.

## Behavior
- No behavior changes (same handlers).
- Overlays are touchable; map remains visible behind.

## Edge Cases
- No GPS: existing permission/empty screen remains unchanged.
- No coordinates: map default view; overlays still visible.

## Files Likely Touched
- `apps/mobile/app/(tabs)/tracking/active-run.tsx`

## Testing
- Manual: verify map full-screen, overlays feel light, text readable over map.
