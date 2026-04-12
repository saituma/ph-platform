# Metrics UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace small inline “sets/reps/rest/steps” text with consistent, high-contrast metric tiles and section cards across Session detail and Exercise detail screens.

**Architecture:** Add a reusable `ProgramMetricGrid`/`ProgramMetricTile` component and reuse it in session and exercise views. Upgrade long-form text sections (Steps/Cues/Progression/Regression) to consistent card sections with clear headings.

**Tech Stack:** React Native (Expo), Tailwind className styling + theme tokens via `useAppTheme`, Feather icons.

---

## File structure

**Create**
- `apps/mobile/components/programs/metrics/ProgramMetricGrid.tsx` — reusable metric tiles (2-column grid) + tile UI.

**Modify**
- `apps/mobile/components/programs/SessionExerciseBlock.tsx` — use metric grid instead of tiny text chips; introduce section cards.
- `apps/mobile/components/programs/content-detail/ExerciseOverview.tsx` — replace local pill Metric with metric tiles.
- `apps/mobile/app/programs/exercise/[planExerciseId].tsx` — replace local pill Metric with metric tiles.

---

### Task 1: Add shared metric tile components

**Files:**
- Create: `apps/mobile/components/programs/metrics/ProgramMetricGrid.tsx`

- [ ] **Step 1: Create `ProgramMetricGrid` + `ProgramMetricTile`**

```tsx
import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { radius } from "@/constants/theme";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

export type ProgramMetricItem = {
  key: string;
  label: string;
  value: string;
  unit?: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
  accent?: boolean;
};

export function ProgramMetricTile({ item }: { item: ProgramMetricItem }) {
  const { colors, isDark } = useAppTheme();
  const borderSoft =
    colors.borderSubtle ?? (isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)");
  const background = colors.surfaceHigh ?? colors.cardElevated ?? colors.card;

  return (
    <View
      style={{
        flexBasis: "48%",
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: borderSoft,
        backgroundColor: background,
        padding: 14,
        paddingLeft: item.accent ? 18 : 14,
        overflow: "hidden",
      }}
    >
      {item.accent ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 14,
            bottom: 14,
            width: 3,
            backgroundColor: colors.accent,
            borderTopRightRadius: radius.pill,
            borderBottomRightRadius: radius.pill,
          }}
        />
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {item.icon ? (
          <View
            style={{
              height: 30,
              width: 30,
              borderRadius: radius.lg,
              backgroundColor: colors.accentLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name={item.icon} size={14} color={colors.accent} />
          </View>
        ) : null}

        <Text
          style={{
            fontSize: 10,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            color: colors.textSecondary,
            fontFamily: "Outfit_700Bold",
          }}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 8 }}>
        <Text
          style={{
            fontSize: 26,
            color: colors.textPrimary ?? colors.text,
            fontFamily: "ClashDisplay_700Bold",
            fontVariant: ["tabular-nums"],
          }}
          numberOfLines={1}
        >
          {item.value}
        </Text>
        {item.unit ? (
          <Text
            style={{
              marginLeft: 6,
              fontSize: 12,
              color: colors.textSecondary,
              fontFamily: "Outfit_500Medium",
            }}
          >
            {item.unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function ProgramMetricGrid({ items }: { items: ProgramMetricItem[] }) {
  const filtered = items.filter((i) => i.value.trim().length > 0);
  if (filtered.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {filtered.map((item) => (
        <ProgramMetricTile key={item.key} item={item} />
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Typecheck mobile**

Run: `pnpm --filter mobile typecheck`
Expected: PASS

---

### Task 2: Update ExerciseOverview to use metric tiles

**Files:**
- Modify: `apps/mobile/components/programs/content-detail/ExerciseOverview.tsx`

- [ ] **Step 1: Replace local `Metric` with `ProgramMetricGrid`**

```tsx
import { ProgramMetricGrid } from "@/components/programs/metrics/ProgramMetricGrid";
```

Use:

```tsx
<ProgramMetricGrid
  items={[
    meta.sets != null ? { key: "sets", label: "Sets", value: String(meta.sets), icon: "hash", accent: true } : null,
    meta.reps != null ? { key: "reps", label: "Reps", value: String(meta.reps), icon: "repeat" } : null,
    meta.duration != null ? { key: "duration", label: "Duration", value: String(meta.duration), unit: "s", icon: "clock" } : null,
    meta.restSeconds != null ? { key: "rest", label: "Rest", value: String(meta.restSeconds), unit: "s", icon: "pause-circle" } : null,
    meta.category ? { key: "category", label: "Category", value: String(meta.category), icon: "tag" } : null,
    meta.equipment ? { key: "equipment", label: "Equipment", value: String(meta.equipment), icon: "tool" } : null,
  ].filter(Boolean) as any}
/>
```

- [ ] **Step 2: Typecheck mobile**

Run: `pnpm --filter mobile typecheck`
Expected: PASS

---

### Task 3: Update Exercise detail page to use metric tiles

**Files:**
- Modify: `apps/mobile/app/programs/exercise/[planExerciseId].tsx`

- [ ] **Step 1: Import and replace `Metric` usage with `ProgramMetricGrid`**

```tsx
import { ProgramMetricGrid } from "@/components/programs/metrics/ProgramMetricGrid";
```

Replace the current metric pills block with the grid:

```tsx
<ProgramMetricGrid
  items={[
    displaySets != null ? { key: "sets", label: "Sets", value: String(displaySets), icon: "hash", accent: true } : null,
    displayReps != null ? { key: "reps", label: "Reps", value: String(displayReps), icon: "repeat" } : null,
    displayDuration != null ? { key: "duration", label: "Duration", value: String(displayDuration), unit: "s", icon: "clock" } : null,
    displayRest != null ? { key: "rest", label: "Rest", value: String(displayRest), unit: "s", icon: "pause-circle" } : null,
    (meta.category ?? item.exercise?.category) ? { key: "category", label: "Category", value: String(meta.category ?? item.exercise?.category), icon: "tag" } : null,
    meta.equipment ? { key: "equipment", label: "Equipment", value: String(meta.equipment), icon: "tool" } : null,
  ].filter(Boolean) as any}
/>
```

- [ ] **Step 2: Typecheck mobile**

Run: `pnpm --filter mobile typecheck`
Expected: PASS

---

### Task 4: Update Session detail list (SessionExerciseBlock)

**Files:**
- Modify: `apps/mobile/components/programs/SessionExerciseBlock.tsx`

- [ ] **Step 1: Import `ProgramMetricGrid`**

```tsx
import { ProgramMetricGrid } from "@/components/programs/metrics/ProgramMetricGrid";
```

- [ ] **Step 2: Replace inline metric chips with metric tile grid**

Replace:

```tsx
<View className="flex-row flex-wrap gap-2">
  ...
</View>
```

With:

```tsx
<View className="mt-4">
  <ProgramMetricGrid
    items={[
      item.metadata.sets != null ? { key: `sets-${item.id}`, label: "Sets", value: String(item.metadata.sets), icon: "hash", accent: true } : null,
      item.metadata.reps != null ? { key: `reps-${item.id}`, label: "Reps", value: String(item.metadata.reps), icon: "repeat" } : null,
      item.metadata.duration != null ? { key: `duration-${item.id}`, label: "Duration", value: String(item.metadata.duration), unit: "s", icon: "clock" } : null,
      item.metadata.restSeconds != null ? { key: `rest-${item.id}`, label: "Rest", value: String(item.metadata.restSeconds), unit: "s", icon: "pause-circle" } : null,
      item.metadata.category?.trim() ? { key: `category-${item.id}`, label: "Category", value: item.metadata.category.trim(), icon: "tag" } : null,
      item.metadata.equipment?.trim() ? { key: `equipment-${item.id}`, label: "Equipment", value: item.metadata.equipment.trim(), icon: "tool" } : null,
    ].filter(Boolean) as any}
  />
</View>
```

- [ ] **Step 3: Upgrade Steps/Cues/Progression/Regression into section cards**

Add a small local `SectionCard` helper in the file that renders:

- Icon bubble
- Uppercase title
- Body text (15px / 24px line-height)

Then replace repeated blocks for `steps`, `cues`, `progression`, `regression` with `SectionCard`.

- [ ] **Step 4: Typecheck mobile**

Run: `pnpm --filter mobile typecheck`
Expected: PASS

---

### Task 5: Manual QA checklist

- [ ] Open **Programs → Modules → Session → Session detail**
  - Verify each exercise shows a clear metric grid (when metadata exists).
  - Verify Steps/Cues/Progression/Regression are readable and visually distinct.
- [ ] Open **Exercise detail**
  - Verify the same metric tile styling is used.
  - Verify values match the previous data.
- [ ] Test dark + light themes for contrast.

