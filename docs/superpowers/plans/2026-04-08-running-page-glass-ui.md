# Running Page Glass UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the Active Run screen with a minimal, glassy overlay while keeping the map full-screen.

**Architecture:** Keep the map as the base layer and refine overlay styles (bottom glass bar, floating pill buttons, status chip). No behavioral changes; reuse existing handlers and state.

**Tech Stack:** React Native, Expo Router, react-native-maps (iOS) + OSM WebView (Android), Reanimated, React Native Safe Area.

---

### Task 1: Polish Overlay UI

**Files:**
- Modify: `apps/mobile/app/(tabs)/tracking/active-run.tsx`
- Test: Manual smoke test (no automated test)

- [ ] **Step 1: Add glass styling tokens**

Near `bottomBarHeight`/`overlayGap`, add shared glass tokens:

```tsx
const glassBg = isDark ? "rgba(20,20,20,0.55)" : "rgba(255,255,255,0.72)";
const glassBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
const glassShadow = isDark
  ? { shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 }
  : { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 };
```

- [ ] **Step 2: Apply glass styles to bottom bar**

Replace bottom bar styles to use `glassBg`, `glassBorder`, and `glassShadow`, and slightly increase padding:

```tsx
backgroundColor: glassBg,
borderColor: glassBorder,
borderWidth: 1,
...glassShadow,
paddingHorizontal: 20,
paddingVertical: 14,
```

- [ ] **Step 3: Refine floating pills**

Use glass styles for Pause/Resume when running:

```tsx
backgroundColor: status === "paused" ? colors.lime : glassBg,
borderColor: status === "paused" ? colors.borderLime : glassBorder,
borderWidth: 1,
...glassShadow,
```

Keep Stop button coral, but soften background and add subtle shadow:

```tsx
backgroundColor: colors.coralGlow,
borderColor: colors.borderCoral,
borderWidth: 1,
...glassShadow,
```

- [ ] **Step 4: Soften status chip**

Apply `glassBg` + `glassBorder` and reduce padding slightly:

```tsx
backgroundColor: glassBg,
borderColor: glassBorder,
paddingHorizontal: 10,
paddingVertical: 5,
```

- [ ] **Step 5: Manual test**

Run the app and verify:
1. Map stays full-screen.
2. Glass overlays look light and readable.
3. Buttons remain tappable and visible on bright map tiles.

Run:
```bash
cd apps/mobile
npx expo start
```

---

## Self-Review
- Spec coverage: bottom bar, pills, and status chip glass styling included.
- Placeholder scan: no TODOs or vague steps.
- Type consistency: uses existing `status`, `colors`, `isDark`, `insets`.
