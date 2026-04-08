# Running Goal + Destination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional two-step pre-run flow to capture destination and/or distance goals, track them during the run, and notify when reached.

**Architecture:** Store optional goal state in `useRunStore`, trigger a two-step modal flow from Tracking Home before navigation, and evaluate goals during the active run loop to fire haptics/toasts/notifications once per goal.

**Tech Stack:** React Native, Expo Router, Zustand, Expo Notifications, react-native-maps (iOS) + OSM WebView (Android).

---

### Task 1: Extend Run Store With Goals

**Files:**
- Modify: `apps/mobile/store/useRunStore.ts`

- [ ] **Step 1: Add goal state + setters**

Add to `RunStore` interface:

```ts
goalKm: number | null;
destination: { latitude: number; longitude: number } | null;
goalReached: boolean;
destinationReached: boolean;
setGoalKm: (km: number | null) => void;
setDestination: (dest: { latitude: number; longitude: number } | null) => void;
markGoalReached: () => void;
markDestinationReached: () => void;
```

Add to store default state:

```ts
goalKm: null,
destination: null,
goalReached: false,
destinationReached: false,
```

Add setters:

```ts
setGoalKm: (km) => set({ goalKm: km }),
setDestination: (dest) => set({ destination: dest }),
markGoalReached: () => set({ goalReached: true }),
markDestinationReached: () => set({ destinationReached: true }),
```

Reset these in `startRun` and `resetRun`:

```ts
goalKm: null,
destination: null,
goalReached: false,
destinationReached: false,
```

---

### Task 2: Build Two-Step Pre-Run Modal

**Files:**
- Create: `apps/mobile/components/tracking/RunGoalSheet.tsx`
- Modify: `apps/mobile/app/(tabs)/tracking/index.tsx`

- [ ] **Step 1: Create `RunGoalSheet` component**

Implement a simple two-step modal with internal state:

```tsx
type RunGoalSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (goalKm: number | null, destination: { latitude: number; longitude: number } | null) => void;
};
```

Behavior:
- Step 1: “Do you have a destination?” → `Pick on map` or `Skip`
  - `Pick on map` opens a lightweight map picker (use `MapView` and `onPress` to set a pin).
- Step 2: “Any distance goal?” → numeric input + `Start Run`/`Skip`.

Return selected values via `onConfirm`.

- [ ] **Step 2: Wire sheet into Tracking Home**

In `apps/mobile/app/(tabs)/tracking/index.tsx`, replace the direct Start Run navigation with:

```ts
setShowGoalSheet(true);
```

When sheet confirms, call `setGoalKm` and `setDestination` in store, then navigate to `/(tabs)/tracking/active-run`.

---

### Task 3: Display Goals + Detect Reach

**Files:**
- Modify: `apps/mobile/app/(tabs)/tracking/active-run.tsx`

- [ ] **Step 1: Show goal chips in overlay**

Add a small row near the status chip:

```tsx
{goalKm ? <Chip text={`Goal: ${goalKm.toFixed(1)} km`} /> : null}
{destination ? <Chip text="Destination set" /> : null}
```

Use simple `View` + `Text` styling matching glass look.

- [ ] **Step 2: Render destination pin**

When `destination` exists, render a marker on the map:

```tsx
<Marker coordinate={destination}>...</Marker>
```

For OSM map, add a destination marker in `OsmMapView` HTML (add another circle marker).

- [ ] **Step 3: Detect goal reach**

Add a `useEffect` that checks:
- Distance: `distanceMeters >= goalKm * 1000`
- Destination: haversine distance to destination <= 40m

On first reach, set `goalReached` / `destinationReached` and trigger haptics + toast + push.

---

### Task 4: Notifications + Toast

**Files:**
- Modify: `apps/mobile/app/(tabs)/tracking/active-run.tsx`
- (Optional) Create: `apps/mobile/lib/notifications.ts`

- [ ] **Step 1: Request permission (lazy)**

When a goal is about to be reached, check permissions:

```ts
const { status } = await Notifications.getPermissionsAsync();
if (status !== "granted") await Notifications.requestPermissionsAsync();
```

- [ ] **Step 2: Send push notification**

```ts
await Notifications.scheduleNotificationAsync({
  content: { title: "Goal reached", body: "Nice work!" },
  trigger: null,
});
```

- [ ] **Step 3: Show in-app toast**

Use an in-screen toast (simple animated View) in `ActiveRunScreen` for feedback.

---

### Task 5: Manual Test

Run:
```bash
cd apps/mobile
npx expo start
```

Manual scenarios:
1. Destination only → destination reached notification.
2. Distance only → distance reached notification.
3. Both set → both notifications.
4. Skip both → no goal chips or notifications.

---

## Self-Review
- Spec coverage: two-step prompt, goal storage, map markers, notifications, and toasts covered.
- Placeholder scan: no TODOs.
- Type consistency: matches store and component contracts.
