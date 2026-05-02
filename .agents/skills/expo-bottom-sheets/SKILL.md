---
name: expo-bottom-sheets
description: Implement production-grade bottom sheets, drag sheets, and modal sheets with native feel — snap points, keyboard handling, blur backdrops, liquid glass. Use when adding any sheet/drawer/modal interaction.
user-invokable: true
args:
  - name: approach
    description: "Which approach: 'gorhom' (feature-rich), 'formsheet' (native iOS), 'expo-ui' (SwiftUI), or 'auto' (pick best for context)"
    required: false
---

Build bottom sheets that feel indistinguishable from native iOS/Android sheets.

## THREE APPROACHES — PICK THE RIGHT ONE

### 1. `@gorhom/bottom-sheet` v5 (already installed)
**Use for:** Complex sheets with custom content, scrollable lists, keyboard inputs, stacked modals.
**Pros:** Most flexible, great gesture handling, keyboard-aware, backdrop customization.

```typescript
import BottomSheet, { BottomSheetView, BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput, BottomSheetScrollView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';

// ESSENTIAL PROPS — always set these:
<BottomSheet
  enableDynamicSizing              // Let content determine height (preferred over fixed snapPoints)
  enablePanDownToClose             // Swipe down to dismiss
  backgroundStyle={{ backgroundColor: bgColor, borderRadius: 24 }}
  handleIndicatorStyle={{ backgroundColor: handleColor, width: 36 }}
  android_keyboardInputMode="adjustResize"  // Android keyboard handling
  keyboardBehavior="interactive"   // Sheet follows keyboard frame-by-frame
  keyboardBlurBehavior="restore"   // Returns to snap point on keyboard blur
>
  <BottomSheetView>{content}</BottomSheetView>
</BottomSheet>
```

**Keyboard-aware sheet (chat, search, forms):**
```typescript
// MUST use BottomSheetTextInput — regular TextInput won't work
<BottomSheet keyboardBehavior="interactive" keyboardBlurBehavior="restore">
  <BottomSheetTextInput placeholder="Type..." style={styles.input} />
</BottomSheet>
```

**Blur backdrop (Instagram-style):**
```typescript
const renderBackdrop = useCallback((props) => (
  <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="close">
    <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
  </BottomSheetBackdrop>
), []);

<BottomSheet backdropComponent={renderBackdrop}>
```

**Scrollable content:**
```typescript
// Use BottomSheetScrollView or BottomSheetFlatList — not regular ScrollView/FlatList
<BottomSheet snapPoints={['50%', '90%']}>
  <BottomSheetScrollView>{longContent}</BottomSheetScrollView>
</BottomSheet>
```

**Stacked modals:**
```typescript
// BottomSheetModalProvider must wrap the parent (already in your _layout.tsx)
const firstRef = useRef<BottomSheetModal>(null);
const secondRef = useRef<BottomSheetModal>(null);

<BottomSheetModal ref={firstRef} snapPoints={['50%']}>
  <Button onPress={() => secondRef.current?.present()} title="Open Sub-Sheet" />
</BottomSheetModal>
<BottomSheetModal ref={secondRef} snapPoints={['40%']}>
  <Text>Sub-sheet content</Text>
</BottomSheetModal>
```

### 2. Expo Router `formSheet` (native iOS presentation)
**Use for:** Simple native-feeling modals on iOS. Zero extra dependencies.
**Pros:** True native sheet, automatic gestures, zero JS overhead.
**Cons:** iOS-only native sheet (Android falls back to modal).

```typescript
// In _layout.tsx or screen-specific layout:
<Stack.Screen
  name="my-sheet"
  options={{
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.25, 0.5, 1.0],      // 25%, 50%, full
    sheetInitialDetentIndex: 0,                    // Start at 25%
    sheetLargestUndimmedDetentIndex: 0,            // Keep content interactive behind sheet at 25%
    sheetCornerRadius: 24,
    contentStyle: { backgroundColor: 'transparent' },
    headerShown: false,
  }}
/>
```

**Liquid glass (iOS 26+):**
```typescript
<Stack.Screen
  name="glass-sheet"
  options={{
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.1, 0.5, 1],
    contentStyle: { backgroundColor: 'transparent' },
  }}
/>
// In the screen component, use GlassView from expo-glass-effect:
import { GlassView } from 'expo-glass-effect';
<GlassView style={{ flex: 1, borderRadius: 24, padding: 16 }}>{content}</GlassView>
```

### 3. `@expo/ui` BottomSheet (SwiftUI native, beta)
**Use for:** iOS-first apps wanting the absolute most native sheet behavior.
**Pros:** 100% native SwiftUI sheet, liquid glass built-in, detent configuration.
**Cons:** Beta, iOS-only, limited customization.

```typescript
import { BottomSheet, Host } from '@expo/ui/swift-ui';

<Host style={{ position: 'absolute', width: '100%' }}>
  <BottomSheet
    isOpened={isOpen}
    presentationDragIndicator="visible"
    presentationDetents={[0.1, 0.5, 1]}
    onIsOpenedChange={(e) => setIsOpen(e)}
  >
    <Text>Native SwiftUI content</Text>
  </BottomSheet>
</Host>
```

## DECISION MATRIX

| Need | Use |
|------|-----|
| Scrollable list inside sheet | gorhom |
| Text input / search in sheet | gorhom (BottomSheetTextInput) |
| Simple modal with detents (iOS) | formSheet |
| Stacked / nested sheets | gorhom (BottomSheetModal) |
| Liquid glass (iOS 26) | formSheet + GlassView OR @expo/ui |
| Cross-platform consistency | gorhom |
| Zero-JS native sheet | formSheet or @expo/ui |
| Custom backdrop (blur, dim) | gorhom |
| Sheet with footer actions | formSheet (Stack.Screen footer) or gorhom |

## ALWAYS DO
1. Handle indicator: visible, 36px wide, rounded, contrast with background
2. Background: theme-aware color, borderRadius 24 top corners
3. Backdrop: semi-transparent (0.5 opacity) or blur on iOS
4. Pan-down-to-close: always enabled
5. Haptic on snap: `Haptics.impactAsync(Light)` when sheet reaches a snap point
6. Safe area: respect bottom safe area inside sheet content
7. Keyboard: use `keyboardBehavior="interactive"` if sheet has any text inputs
