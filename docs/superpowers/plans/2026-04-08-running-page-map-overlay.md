# Running Page Map Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Active Run screen map-first (100% map) with overlay controls (time/distance bar + pause/resume + stop FABs).

**Architecture:** Refactor `ActiveRunScreen` layout to render the map as the full-screen base layer and position control overlays using absolute positioning and safe-area insets. Reuse existing state and handlers; do not change behavior or data flow.

**Tech Stack:** React Native, Expo Router, react-native-maps (iOS) + OSM WebView (Android), Reanimated, React Native Safe Area.

---

### Task 1: Refactor Active Run Layout (Map Full Screen)

**Files:**
- Modify: `apps/mobile/app/(tabs)/tracking/active-run.tsx`
- Test: Manual smoke test (no automated test)

- [ ] **Step 1: Add layout constants and safe-area offsets**

Add these near existing hooks (after `useSafeAreaInsets` is available in the file).

```tsx
const insets = useSafeAreaInsets();
const bottomBarHeight = 88;
const overlayGap = 16;
```

- [ ] **Step 2: Move map container to full-screen**

Replace the existing map section container with a full-screen wrapper and make it the base layer:

```tsx
<View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
  <View style={{ flex: 1 }}>
    {/* existing map content (OSM/MapView) stays here */}
  </View>
</View>
```

Keep the existing `OsmMapView` vs `MapView` branching intact.

- [ ] **Step 3: Add bottom overlay bar**

Place a bottom overlay after the map container:

```tsx
<View
  style={{
    position: "absolute",
    left: 16,
    right: 16,
    bottom: insets.bottom + 16,
    height: bottomBarHeight,
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    opacity: 0.96,
  }}
>
  <View>
    <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textSecondary, letterSpacing: 2 }}>TIME</Text>
    <Text style={{ fontFamily: fonts.statLabel, fontSize: 20, color: colors.textPrimary }}>
      {formatDurationClock(elapsedSeconds)}
    </Text>
  </View>
  <View>
    <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textSecondary, letterSpacing: 2 }}>DISTANCE</Text>
    <Text style={{ fontFamily: fonts.statLabel, fontSize: 20, color: colors.textPrimary }}>
      {distanceMeters === 0 && elapsedSeconds < 2 ? "--" : formatDistanceKm(distanceMeters, 2)} km
    </Text>
  </View>
</View>
```

- [ ] **Step 4: Add Pause/Resume and Stop FABs**

Add two buttons above the bottom bar:

```tsx
<View
  style={{
    position: "absolute",
    left: 16,
    right: 16,
    bottom: insets.bottom + bottomBarHeight + overlayGap + 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  }}
>
  <Pressable /* pause/resume */>...</Pressable>
  <Pressable /* stop */>...</Pressable>
</View>
```

Reuse the existing button handlers and styling, but reduce width to `72` and roundness to `radius.pill`. Keep the labels (RESUME/PAUSE and STOP) visible.

- [ ] **Step 5: Keep status chip on top-left**

Move the existing top bar/status chip into an absolute top-left overlay. Keep `Time` text if desired, but ensure it doesn’t overlap the map center:

```tsx
<View style={{ position: "absolute", top: insets.top + 12, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" }}>
  {/* status chip */}
  {/* optional time readout */}
</View>
```

- [ ] **Step 6: Remove old hero/secondary sections**

Delete the old “Hero section”, “Mid controls”, and “Secondary stats row” blocks to avoid duplicate UI and free space for full-screen map.

- [ ] **Step 7: Manual test**

Run the app and verify:
1. Map fills screen.
2. Controls overlay correctly on map.
3. Pause/Resume and Stop still work.

Run:
```bash
cd apps/mobile
npx expo start
```
Expected: Active Run shows full-screen map with overlays.

---

## Self-Review
- Spec coverage: All overlay requirements and map-first layout addressed in Task 1 steps 1–6.
- Placeholder scan: No “TODO/TBD”; all steps include exact code or guidance.
- Type consistency: Uses existing `elapsedSeconds`, `distanceMeters`, `formatDurationClock`, `formatDistanceKm`.
