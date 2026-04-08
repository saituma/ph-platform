# Running Page Map-First Overlay Design

**Goal:** Make the Active Run screen map-first (100% map) with compact overlay controls on top of the map.

## Context
The Active Run screen currently uses a mixed layout (hero stats + map). We want the map to fill the screen and place the essential controls on top of it. Android uses OSM tiles, iOS uses Apple Maps.

## Approach
Use a full-screen map and overlay UI layers:
- A compact bottom “glass” bar with time + distance.
- Two floating action buttons (FABs) for Pause/Resume and Stop.
- A small GPS/status chip in the top-left.
All overlays float above the map without blocking the route line.

## UI Spec
### Layout
- Map occupies 100% of the screen.
- Bottom overlay bar sits above the map with a translucent background and rounded corners.
- Two FABs float above the map near the bottom corners.
- Top-left status chip remains (Running/Paused + GPS).

### Elements
1) **Bottom Bar**
   - Shows `TIME` and `DISTANCE` with large numerals.
   - Semi-transparent surface using theme colors.
   - No scrolling; fixed to bottom safe area.

2) **Pause/Resume FAB**
   - Left side above the bottom bar.
   - Color indicates state (running vs paused).
   - Label and icon match current semantics.

3) **Stop FAB**
   - Right side above the bottom bar.
   - Uses coral/stop styling consistent with current UI.

4) **Top-left Status Chip**
   - Retain Running/Paused + GPS indicator.
   - Compact to avoid obscuring map.

### Behavior
- Map stays interactive (pan/zoom) behind overlays.
- Pause/Resume and Stop behaviors unchanged.
- The bottom bar updates time/distance in real-time.

## Edge Cases
- No GPS fix: keep existing GPS error/empty-state screen unchanged.
- No coordinates yet: map shows default view; overlays still visible.
- Android continues using OSM tiles; iOS continues using Apple Maps.

## Files Likely Touched
- `apps/mobile/app/(tabs)/tracking/active-run.tsx` (layout refactor + overlay UI)
- `apps/mobile/components/tracking/OsmMapView.tsx` (no change expected)

## Testing
- Manual: run Active Run screen, verify map is full-screen and overlays are correctly positioned.
- Verify Pause/Resume and Stop still function.
