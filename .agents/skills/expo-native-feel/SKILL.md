---
name: expo-native-feel
description: Audit and fix a screen or component to feel truly native — fast interactions, platform-correct patterns, zero AI-slop UI. Use when a screen feels slow, janky, or web-like.
user-invokable: true
args:
  - name: target
    description: The screen or component path to fix (optional — audits current screen if omitted)
    required: false
---

Make a React Native / Expo 55 screen feel indistinguishable from a native app. Kill slowness, jank, and web-like patterns.

## AUDIT CHECKLIST

Run through every item. Fix violations immediately — don't just report them.

### 1. REPLACE SLOW COMPONENTS
- `FlatList` → `FlashList` from `@shopify/flash-list` (mandatory for lists > 20 items)
- `Image` from react-native → `Image` from `expo-image` (EXCEPT inside FlashList where it causes frame drops — use RN Image there)
- `ScrollView` wrapping long lists → `FlashList` with `estimatedItemSize`
- `Pressable` with `onPressIn`/`onPressOut` scale → `Gesture.Tap()` from gesture-handler (native thread, 1-frame response vs 16-32ms bridge delay)
- `KeyboardAvoidingView` from RN → `KeyboardAvoidingView` from `react-native-keyboard-controller` (frame-synced with native keyboard)
- `ActivityIndicator` alone → Skeleton shimmer screens that mirror the actual layout
- `SafeAreaView` from RN → `useSafeAreaInsets()` from `react-native-safe-area-context`

### 2. PLATFORM-CORRECT PATTERNS
- Use `process.env.EXPO_OS` instead of `Platform.OS` (tree-shakes unused platform code)
- iOS: blur backgrounds (`BlurView` intensity 60-80), large titles, swipe-back gestures
- Android: ripple effects (`android_ripple`), Material transitions, edge-to-edge
- Tab bar: use native tabs (`expo-router/unstable-native-tabs`) or blur tab bar on iOS
- Headers: use native `Stack.Header` with `blurEffect` on iOS, not custom headers
- Date pickers: use native `DatePicker` from `@expo/ui/swift-ui` on iOS
- Form sheets: use `presentation: "formSheet"` with `sheetAllowedDetents` on iOS

### 3. ANIMATION RULES
- ALL animations must use Reanimated worklets (UI thread) — never `Animated` from RN
- Use `withSpring` for user-initiated actions (buttons, drags) — feels alive
- Use `withTiming` for system animations (shimmer, auto-dismiss) — predictable
- Every pressable element needs scale feedback: `withSpring(0.96)` on press, `withSpring(1)` on release
- List items: staggered `FadeInDown.delay(Math.min(index, 10) * 50)` entering animation
- Never animate `expo-image` with Reanimated on iOS (causes reload every frame)
- For ambient/long-running animations: use `react-native-ease` (near-zero UI thread cost) instead of Reanimated
- Respect `useReducedMotion()` — skip entering animations when enabled

### 4. HAPTIC FEEDBACK (mandatory for native feel)
- Button tap: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
- Tab switch: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
- Toggle: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
- Pull-to-refresh trigger: `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`
- Long press activate: `Haptics.impactAsync(ImpactFeedbackStyle.Heavy)`
- Drag reorder position: `Haptics.selectionAsync()`
- Error: `Haptics.notificationAsync(NotificationFeedbackType.Error)`
- Success: `Haptics.notificationAsync(NotificationFeedbackType.Success)`
- Destructive confirm: `Haptics.notificationAsync(NotificationFeedbackType.Warning)`

### 5. PERFORMANCE NON-NEGOTIABLES
- FlashList v2: do NOT set `estimatedItemSize` (auto-calculated), do NOT use `inverted`/`windowSize`/`maxToRenderPerBatch` (removed in v2). Use `maintainVisibleContentPosition.startRenderingFromBottom` instead of `inverted`. Use `FlashListRef<T>` for refs, not `FlashList<T>`.
- expo-image in FlashList: always set `recyclingKey` to prevent placeholder leaks
- Never read `.value` from shared values in render — only in `useAnimatedStyle`/`useAnimatedProps`
- Reanimated v4: `runOnJS` is deprecated — gesture handler callbacks are auto-workletized, call JS functions directly from gesture callbacks. Only use `runOnJS` if you get a worklet error.
- Cancel animations on unmount: `cancelAnimation(sharedValue)` in cleanup
- `interpolate` must use `Extrapolation.CLAMP` for scroll-driven values
- Avoid `setTimeout`/`setInterval` for animations — use Reanimated timing
- Memoize list items with `React.memo` + stable keys
- Use MMKV for synchronous storage reads, not AsyncStorage

### 6. SPRING CONFIGS (use consistently across the app)
```typescript
const Springs = {
  snappy: { damping: 15, stiffness: 400, mass: 0.3 },    // buttons, toggles
  responsive: { damping: 20, stiffness: 300, mass: 0.4 }, // cards, modals
  gentle: { damping: 20, stiffness: 120, mass: 0.5 },     // page transitions
  bouncy: { damping: 8, stiffness: 200, mass: 0.5 },      // celebrations
  stiff: { damping: 30, stiffness: 500, mass: 0.3 },      // snap-back
};
```

### 7. ANTI-PATTERNS (immediate red flags)
- Inline `new Date()` or heavy computation in render
- `useEffect` fetching data without TanStack Query
- Unthrottled `onScroll` callbacks (must use `useAnimatedScrollHandler`)
- `opacity: 0` to hide elements (use conditional rendering or `display: 'none'`)
- Nested `ScrollView` components (use `SectionList` or `FlashList` with sections)
- Missing `key` props or using array index as key for dynamic lists

## PROCESS
1. Read the target file completely
2. Identify every violation from the checklist above
3. Fix all violations in a single pass
4. Verify the screen renders and interacts correctly
5. Report what was fixed in 2-3 bullet points
