# Play Store Submission Hardening (Mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make background location and OSRM routing explicitly user-controlled, prune Android permissions, and align offline privacy policy text with actual behavior.

**Architecture:** Add a tiny AsyncStorage-backed preferences layer, a consent prompt helper for OSRM, and a small run-screen control overlay. Gate background location tracking and OSRM route fetches on those preferences, without changing core run tracking logic.

**Tech Stack:** Expo SDK 55, React Native, Expo Location/TaskManager, Jest (jest-expo), AsyncStorage.

---

## File/Module Map (Locked In)

**Create**
- `apps/mobile/lib/runTrackingPreferences.ts`: AsyncStorage-backed booleans for run-time defaults (background tracking, OSRM routing, OSRM consent).
- `apps/mobile/lib/osrmRoutingConsent.ts`: One-time OSRM consent prompt flow (Alert + AsyncStorage).
- `apps/mobile/components/tracking/active-run/RunPrivacyControls.tsx`: UI overlay with two toggles (Background tracking, Suggested route).
- `apps/mobile/test/runTrackingPreferences.test.ts`: unit tests for preferences/consen state.

**Modify**
- `apps/mobile/app/(tabs)/tracking/active-run.tsx`: load persisted defaults, show controls, and gate `startLocationTracking()` + OSRM routing enable.
- `apps/mobile/hooks/tracking/useRunTrackingEngine.ts`: accept `osrmRoutingEnabled` and hard-gate OSRM route fetching + metric exposure.
- `apps/mobile/app/privacy-policy.tsx`: update offline fallback policy text to mention background location + OSRM + oEmbed.
- `apps/mobile/app.json`: prune Android permissions.

---

### Task 1: Add AsyncStorage Preferences For Run Controls

**Files:**
- Create: `apps/mobile/lib/runTrackingPreferences.ts`
- Test: `apps/mobile/test/runTrackingPreferences.test.ts`

- [ ] **Step 1: Write failing unit test for preference roundtrip**

Create `apps/mobile/test/runTrackingPreferences.test.ts`:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getRunBackgroundTrackingDefault,
  setRunBackgroundTrackingDefault,
  getOsrmRoutingDefault,
  setOsrmRoutingDefault,
  getOsrmRoutingConsentState,
  setOsrmRoutingConsentState,
  type OsrmConsentState,
} from "@/lib/runTrackingPreferences";

describe("runTrackingPreferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("defaults background tracking to false when unset", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    await expect(getRunBackgroundTrackingDefault()).resolves.toBe(false);
  });

  it("roundtrips background tracking default", async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);
    await setRunBackgroundTrackingDefault(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "ph:run:bg_tracking_default:v1",
      "1",
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("1");
    await expect(getRunBackgroundTrackingDefault()).resolves.toBe(true);
  });

  it("roundtrips OSRM routing default", async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);
    await setOsrmRoutingDefault(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "ph:run:osrm_routing_default:v1",
      "1",
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("1");
    await expect(getOsrmRoutingDefault()).resolves.toBe(true);
  });

  it("roundtrips OSRM consent state", async () => {
    const state: OsrmConsentState = "accepted";
    (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);
    await setOsrmRoutingConsentState(state);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "ph:run:osrm_consent:v1",
      "accepted",
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("accepted");
    await expect(getOsrmRoutingConsentState()).resolves.toBe("accepted");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter mobile test -- runTrackingPreferences.test.ts
```

Expected: FAIL with module not found `@/lib/runTrackingPreferences` (or missing exports).

- [ ] **Step 3: Implement preferences module**

Create `apps/mobile/lib/runTrackingPreferences.ts`:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_BG_DEFAULT = "ph:run:bg_tracking_default:v1";
const KEY_OSRM_DEFAULT = "ph:run:osrm_routing_default:v1";
const KEY_OSRM_CONSENT = "ph:run:osrm_consent:v1";

function parseBool(raw: string | null): boolean | null {
  if (raw == null) return null;
  if (raw === "1") return true;
  if (raw === "0") return false;
  return null;
}

async function getBool(key: string): Promise<boolean | null> {
  const raw = await AsyncStorage.getItem(key);
  return parseBool(raw);
}

async function setBool(key: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key, value ? "1" : "0");
}

export type OsrmConsentState = "accepted" | "declined";

export async function getRunBackgroundTrackingDefault(): Promise<boolean> {
  const v = await getBool(KEY_BG_DEFAULT);
  return v ?? false;
}

export async function setRunBackgroundTrackingDefault(enabled: boolean): Promise<void> {
  await setBool(KEY_BG_DEFAULT, enabled);
}

export async function getOsrmRoutingDefault(): Promise<boolean> {
  const v = await getBool(KEY_OSRM_DEFAULT);
  return v ?? false;
}

export async function setOsrmRoutingDefault(enabled: boolean): Promise<void> {
  await setBool(KEY_OSRM_DEFAULT, enabled);
}

export async function getOsrmRoutingConsentState(): Promise<OsrmConsentState | null> {
  const raw = await AsyncStorage.getItem(KEY_OSRM_CONSENT);
  if (raw === "accepted" || raw === "declined") return raw;
  return null;
}

export async function setOsrmRoutingConsentState(state: OsrmConsentState): Promise<void> {
  await AsyncStorage.setItem(KEY_OSRM_CONSENT, state);
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
pnpm --filter mobile test -- runTrackingPreferences.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/runTrackingPreferences.ts apps/mobile/test/runTrackingPreferences.test.ts
git commit -m "feat(mobile): add run tracking preferences"
```

---

### Task 2: Add One-Time OSRM Consent Prompt Helper

**Files:**
- Create: `apps/mobile/lib/osrmRoutingConsent.ts`
- Modify: `apps/mobile/test/runTrackingPreferences.test.ts`

- [ ] **Step 1: Extend tests to cover consent prompt behavior**

Append to `apps/mobile/test/runTrackingPreferences.test.ts`:

```ts
import { Alert } from "react-native";
import { ensureOsrmConsentOrExplain } from "@/lib/osrmRoutingConsent";

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return {
    ...actual,
    Alert: { alert: jest.fn() },
  };
});

it("returns true immediately when OSRM consent already accepted", async () => {
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key === "ph:run:osrm_consent:v1") return "accepted";
    return null;
  });
  await expect(ensureOsrmConsentOrExplain()).resolves.toBe(true);
  expect((Alert.alert as jest.Mock)).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter mobile test -- runTrackingPreferences.test.ts
```

Expected: FAIL with module not found `@/lib/osrmRoutingConsent` (or missing export).

- [ ] **Step 3: Implement consent helper**

Create `apps/mobile/lib/osrmRoutingConsent.ts`:

```ts
import { Alert } from "react-native";
import {
  getOsrmRoutingConsentState,
  setOsrmRoutingConsentState,
} from "@/lib/runTrackingPreferences";

/**
 * OSRM is a third-party service. This prompt creates a clear user action + disclosure
 * before we send coordinates to `router.project-osrm.org`.
 */
export async function ensureOsrmConsentOrExplain(): Promise<boolean> {
  const existing = await getOsrmRoutingConsentState();
  if (existing === "accepted") return true;
  if (existing === "declined") return false;

  const ok = await new Promise<boolean>((resolve) => {
    Alert.alert(
      "Suggested route (OSRM)",
      "When enabled, this feature sends your start/destination location to our routing provider (OSRM) to calculate a suggested route. You can keep the live GPS trail without this.",
      [
        {
          text: "Not now",
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: "Enable",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true },
    );
  });

  await setOsrmRoutingConsentState(ok ? "accepted" : "declined");
  return ok;
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
pnpm --filter mobile test -- runTrackingPreferences.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/osrmRoutingConsent.ts apps/mobile/test/runTrackingPreferences.test.ts
git commit -m "feat(mobile): add OSRM routing consent prompt"
```

---

### Task 3: Add Run Screen Controls UI (2 Toggles)

**Files:**
- Create: `apps/mobile/components/tracking/active-run/RunPrivacyControls.tsx`

- [ ] **Step 1: Add the component**

Create `apps/mobile/components/tracking/active-run/RunPrivacyControls.tsx`:

```tsx
import React from "react";
import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, radius } from "@/constants/theme";

type Props = {
  colors: Record<string, string>;
  glassBg: string;
  glassBorder: string;
  glassShadow: Record<string, unknown>;
  mainTabBarOverlap: number;
  bottomOffsetFromTabBar: number;
  backgroundTrackingEnabled: boolean;
  onToggleBackgroundTracking: () => void;
  osrmRoutingEnabled: boolean;
  onToggleOsrmRouting: () => void;
};

function Chip({
  active,
  label,
  icon,
  onPress,
  colors,
  glassBg,
  glassBorder,
  glassShadow,
}: {
  active: boolean;
  label: string;
  icon: any;
  onPress: () => void;
  colors: Record<string, string>;
  glassBg: string;
  glassBorder: string;
  glassShadow: Record<string, unknown>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        height: 40,
        borderRadius: radius.pill,
        backgroundColor: active ? `${colors.lime}22` : glassBg,
        borderWidth: 1,
        borderColor: active ? `${colors.lime}55` : glassBorder,
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
        ...glassShadow,
      })}
    >
      <Ionicons name={icon} size={16} color={active ? colors.lime : colors.textSecondary} />
      <Text
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 13,
          color: active ? colors.textPrimary : colors.textSecondary,
        }}
      >
        {label}
      </Text>
      <View style={{ flex: 1 }} />
      <Text
        style={{
          fontFamily: fonts.labelCaps,
          fontSize: 10,
          letterSpacing: 1.8,
          color: active ? colors.lime : colors.textSecondary,
        }}
      >
        {active ? "ON" : "OFF"}
      </Text>
    </Pressable>
  );
}

export function RunPrivacyControls({
  colors,
  glassBg,
  glassBorder,
  glassShadow,
  mainTabBarOverlap,
  bottomOffsetFromTabBar,
  backgroundTrackingEnabled,
  onToggleBackgroundTracking,
  osrmRoutingEnabled,
  onToggleOsrmRouting,
}: Props) {
  return (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: mainTabBarOverlap + bottomOffsetFromTabBar,
        flexDirection: "row",
        gap: 10,
        zIndex: 6,
      }}
    >
      <View style={{ flex: 1 }}>
        <Chip
          active={backgroundTrackingEnabled}
          label="Locked phone"
          icon={backgroundTrackingEnabled ? "lock-closed" : "lock-open-outline"}
          onPress={onToggleBackgroundTracking}
          colors={colors}
          glassBg={glassBg}
          glassBorder={glassBorder}
          glassShadow={glassShadow}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Chip
          active={osrmRoutingEnabled}
          label="Suggested route"
          icon={osrmRoutingEnabled ? "navigate" : "navigate-outline"}
          onPress={onToggleOsrmRouting}
          colors={colors}
          glassBg={glassBg}
          glassBorder={glassBorder}
          glassShadow={glassShadow}
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run:

```bash
pnpm --filter mobile typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/tracking/active-run/RunPrivacyControls.tsx
git commit -m "feat(mobile): add run privacy controls UI"
```

---

### Task 4: Gate Background Tracking In Active Run Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/tracking/active-run.tsx`

- [ ] **Step 1: Update ActiveRunScreen to load defaults and gate background tracking**

Modify `apps/mobile/app/(tabs)/tracking/active-run.tsx`:

1) Add imports:

```ts
import { RunPrivacyControls } from "../../../components/tracking/active-run/RunPrivacyControls";
import {
  getRunBackgroundTrackingDefault,
  setRunBackgroundTrackingDefault,
  getOsrmRoutingDefault,
  setOsrmRoutingDefault,
} from "../../../lib/runTrackingPreferences";
import { ensureOsrmConsentOrExplain } from "../../../lib/osrmRoutingConsent";
```

2) Add state + load persisted defaults near the top of the component:

```ts
const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] = useState(false);
const [osrmRoutingEnabled, setOsrmRoutingEnabled] = useState(false);

useEffect(() => {
  let active = true;
  (async () => {
    const [bg, osrm] = await Promise.all([
      getRunBackgroundTrackingDefault(),
      getOsrmRoutingDefault(),
    ]);
    if (!active) return;
    setBackgroundTrackingEnabled(bg);
    setOsrmRoutingEnabled(osrm);
  })().catch(() => {});
  return () => {
    active = false;
  };
}, []);
```

3) Pass `osrmRoutingEnabled` into the hook (after Task 5 changes the signature):

```ts
} = useRunTrackingEngine(toastTranslateY, insets.top, { osrmRoutingEnabled });
```

4) Update the effect that starts location tracking to only start background task when enabled:

```ts
useEffect(() => {
  if (!hasGps) return;
  if (status === "running") {
    startForegroundWatch().catch(() => null);
    if (backgroundTrackingEnabled) {
      startLocationTracking().catch(() => null);
    } else {
      stopLocationTracking().catch(() => null);
    }
  } else {
    stopForegroundWatch();
    stopLocationTracking().catch(() => null);
  }
}, [
  backgroundTrackingEnabled,
  hasGps,
  startForegroundWatch,
  status,
  stopForegroundWatch,
]);
```

5) Render the controls overlay (place it above the action row):

```tsx
<RunPrivacyControls
  colors={colors}
  glassBg={glassBg}
  glassBorder={glassBorder}
  glassShadow={glassShadow}
  mainTabBarOverlap={mainTabBarOverlap}
  bottomOffsetFromTabBar={bottomBarHeight + overlayGap + 8 + actionRowHeight + 12}
  backgroundTrackingEnabled={backgroundTrackingEnabled}
  onToggleBackgroundTracking={() => {
    const next = !backgroundTrackingEnabled;
    setBackgroundTrackingEnabled(next);
    void setRunBackgroundTrackingDefault(next);
    // When enabling, the next effect tick will call startLocationTracking() which shows disclosure+permission if needed.
  }}
  osrmRoutingEnabled={osrmRoutingEnabled}
  onToggleOsrmRouting={async () => {
    if (osrmRoutingEnabled) {
      setOsrmRoutingEnabled(false);
      void setOsrmRoutingDefault(false);
      return;
    }
    const ok = await ensureOsrmConsentOrExplain();
    if (!ok) return;
    setOsrmRoutingEnabled(true);
    void setOsrmRoutingDefault(true);
  }}
/>
```

6) Gate the route metrics pill on the toggle:

```tsx
{osrmRoutingEnabled && destination && (isFetchingRoute || routeMetrics) ? ( /* ... */ ) : null}
```

- [ ] **Step 2: Typecheck**

Run:

```bash
pnpm --filter mobile typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile/app/(tabs)/tracking/active-run.tsx"
git commit -m "feat(mobile): gate background tracking and OSRM behind user controls"
```

---

### Task 5: Gate OSRM Fetching In `useRunTrackingEngine`

**Files:**
- Modify: `apps/mobile/hooks/tracking/useRunTrackingEngine.ts`

- [ ] **Step 1: Adjust hook signature**

Change export signature to accept options:

```ts
export function useRunTrackingEngine(
  toastTranslateY: SharedValue<number>,
  insetsTop: number,
  opts?: { osrmRoutingEnabled?: boolean },
) {
  const osrmRoutingEnabled = Boolean(opts?.osrmRoutingEnabled);
  // ...
}
```

- [ ] **Step 2: Hard-gate OSRM route fetching**

In `fetchRoute`, early-return when disabled:

```ts
const fetchRoute = useCallback(async (startLat: number, startLng: number, destLat: number, destLng: number) => {
  if (!osrmRoutingEnabled) return;
  // existing implementation...
}, [isFetchingRoute, osrmRoutingEnabled]);
```

Also clear route polyline/metrics when routing is turned off:

```ts
useEffect(() => {
  if (!osrmRoutingEnabled) {
    setRoutePolyline(null);
    setRouteMetrics(null);
  }
}, [osrmRoutingEnabled]);
```

And in the destination effect, keep existing reset logic.

- [ ] **Step 3: Ensure route polling effect doesn’t run when disabled**

In the destination/liveCoordinate effect, wrap OSRM-related work:

```ts
if (destination && osrmRoutingEnabled && !destinationReached && liveCoordinate) {
  // existing route off-track detection + fetchRoute calls
}
```

- [ ] **Step 4: Typecheck**

Run:

```bash
pnpm --filter mobile typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/hooks/tracking/useRunTrackingEngine.ts
git commit -m "feat(mobile): gate OSRM routing behind explicit toggle"
```

---

### Task 6: Update Offline Fallback Privacy Policy Text

**Files:**
- Modify: `apps/mobile/app/privacy-policy.tsx`

- [ ] **Step 1: Update `fallbackContent`**

Replace the fallback text with an explicit version (keep it concise but accurate):

```ts
const fallbackContent = useMemo(
  () =>
    [
      "1. Data We Collect",
      "We collect account information (such as name and email) and usage data needed to provide coaching features. During runs, we collect location data to track distance, pace, and your GPS trail.",
      "",
      "2. Background Location During Runs",
      "If you enable locked-phone tracking during an active run, the app may collect location in the background so your run continues to track when the app is closed or your phone is locked. Location is only collected during an active run session that you start manually.",
      "",
      "3. Suggested Routes (OSRM)",
      "If you enable Suggested Route, the app sends your start/destination location to a routing provider (OSRM) to calculate and display a suggested route. You can keep the live GPS trail without enabling this feature.",
      "",
      "4. Video Previews",
      "If you paste a YouTube or Loom link, the app may contact those services to fetch preview metadata (oEmbed).",
      "",
      "5. Storage & Security",
      "We implement industry-standard security measures to protect your data. Sensitive tokens are stored securely on your device.",
      "",
      "6. Your Rights",
      "You can access, correct, or delete your personal data through the Privacy & Security settings or by contacting support.",
      "",
      "7. Policy Updates",
      "We may update this policy occasionally. Continued use of the app after changes constitutes acceptance of the updated policy.",
    ].join(\"\\n\"),
  []
);
```

- [ ] **Step 2: Run tests + typecheck**

Run:

```bash
pnpm --filter mobile test
pnpm --filter mobile typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/privacy-policy.tsx
git commit -m "docs(mobile): align offline privacy policy fallback with run tracking behavior"
```

---

### Task 7: Prune Android Permissions

**Files:**
- Modify: `apps/mobile/app.json`

- [ ] **Step 1: Remove deprecated/unneeded permissions**

Edit `apps/mobile/app.json` Android permissions array:

- Remove: `"android.permission.READ_EXTERNAL_STORAGE"`
- Remove: `"android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"`

Keep:
- Location + FGS location
- Camera/media read
- Audio recording + audio settings (used by voice recording)
- Notifications

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app.json
git commit -m "chore(mobile): prune android permissions for play submission"
```

---

### Task 8: Verification Pass (Dev Build + Unit Tests)

**Files:**
- None

- [ ] **Step 1: Unit tests**

Run:

```bash
pnpm --filter mobile test
```

Expected: PASS.

- [ ] **Step 2: Typecheck**

Run:

```bash
pnpm --filter mobile typecheck
```

Expected: PASS.

- [ ] **Step 3: Manual smoke test (Android dev build)**

Run:

```bash
pnpm --filter mobile android
```

Manual checks:
- Start run: app tracks trail without any background permission prompt.
- Toggle “Locked phone” ON: disclosure appears, then permission prompt (if not granted); foreground service notification appears.
- Lock phone: run continues updating distance/time.
- Toggle “Suggested route” ON: OSRM consent prompt appears once; route appears; turning it OFF removes route overlay and stops OSRM requests.

---

## Plan Self-Review

Spec coverage:
- Background location gating: Task 4.
- OSRM gating + consent: Tasks 2, 4, 5.
- Permission pruning: Task 7.
- Privacy policy fallback: Task 6.
- Verification: Task 8.

Placeholder scan:
- No TODO/TBD; all file paths, code blocks, and commands are explicit.

Type consistency:
- Preferences keys and exports used consistently between tests and implementation.

