---
name: expo-performance
description: Audit and optimize an Expo 55 app or screen for maximum performance — fix jank, reduce bundle size, eliminate bottlenecks. Use when the app feels slow or drops frames.
user-invokable: true
args:
  - name: target
    description: Screen, component, or 'app' for full audit (optional)
    required: false
---

Find and eliminate every performance bottleneck. The goal is 60fps on mid-range devices.

## RENDERING PERFORMANCE

### Lists (the #1 source of jank)
- **MANDATORY**: Use `FlashList` instead of `FlatList` for any list > 20 items
- FlashList v2: do NOT set `estimatedItemSize` (auto-calculated). Do NOT use `inverted`, `windowSize`, `maxToRenderPerBatch`, `initialNumToRender` (removed in v2). Use `maintainVisibleContentPosition.startRenderingFromBottom` instead of `inverted`. Refs use `FlashListRef<T>`, not `FlashList<T>`.
- Set `recyclingKey` on `expo-image` inside FlashList to prevent placeholder leaks
- Use `getItemType` when mixing item layouts (headers, items, footers)
- Use `overrideItemLayout` for variable-height items
- Wrap list items in `React.memo` with stable props
- Use `keyExtractor` with stable IDs (never array index for dynamic lists)
- Do NOT use `expo-image` inside FlashList on iOS — it causes frame drops (#45301). Use RN `Image` instead.
- Do NOT nest `ScrollView` inside `FlashList` — use sections instead

### Images
- Use `expo-image` everywhere EXCEPT inside FlashList on iOS
- Always set `contentFit` (don't rely on default)
- Use `placeholder` with blurhash for instant loading appearance
- Set `cachePolicy="memory-disk"` for frequently shown images
- Set `recyclingKey` in recycled views (FlashList, PagerView)
- Do NOT animate `expo-image` with Reanimated on iOS — it reloads on every frame (#24894)
- For animated images, use RN's built-in `Animated.Image`
- Preload critical images: `Image.prefetch(urls)`

### Animations
- ALL transforms must run on UI thread via Reanimated worklets
- Never read `.value` from shared values in component render body
- Use `useAnimatedStyle` for styles, `useAnimatedProps` for non-style props
- For long-running/ambient animations (shimmer, pulse, breathing): consider `react-native-ease` — uses Core Animation/ObjectAnimator, ~0.01ms UI thread cost vs Reanimated's ~11ms at 50 views
- Cancel animations on unmount: `cancelAnimation(sharedValue)` in useEffect cleanup
- Avoid `withRepeat` on many views simultaneously — batch them
- Use `Layout.springify()` instead of manual layout animations

### Re-renders
- Memoize components: `React.memo` for list items, cards, repeated elements
- Memoize callbacks: `useCallback` for event handlers passed to children
- Memoize expensive computations: `useMemo` for filtered/sorted lists
- Split context providers — don't put fast-changing state (scroll position) in the same context as slow-changing state (user preferences)
- Use Zustand/MMKV for high-frequency state instead of Redux (no Provider re-renders)
- Profile with React DevTools — look for yellow/red highlights on scroll

## DATA PERFORMANCE

### TanStack Query Optimization
- Set `staleTime: 5 * 60 * 1000` (5 min) for data that doesn't change often
- Set `gcTime: 30 * 60 * 1000` (30 min) for cached data lifetime
- Use `placeholderData` for instant UI with stale data
- Use `select` to transform/filter data in the query (prevents re-renders from unchanged selections)
- Use `keepPreviousData: true` for pagination
- Use `queryClient.setQueryData` for optimistic updates (don't wait for server)
- Prefetch next screen's data: `queryClient.prefetchQuery` on hover/focus
- Use `useInfiniteQuery` for paginated lists with `getNextPageParam`
- Cancel in-flight queries on screen unmount via `queryKey` + `AbortSignal`

### Storage
- MMKV for synchronous reads (theme, preferences, tokens) — 30x faster than AsyncStorage
- AsyncStorage only for TanStack Query persistence layer
- expo-secure-store for sensitive data (tokens, credentials)
- Never store large blobs in state — use file system references

### Network
- Compress request/response payloads
- Use `AbortController` for cancellable requests
- Implement request deduplication (TanStack Query does this automatically)
- Batch API calls where possible (fetch user + preferences in one call)

## BUNDLE & STARTUP

### Bundle Size
- Import only what you need: `import { Button } from 'heroui-native'` not `import * as HeroUI from 'heroui-native'`
- Check if heavy libraries have tree-shakeable exports
- Use `process.env.EXPO_OS` instead of `Platform.OS` — enables dead code elimination
- Lazy-load heavy screens: `React.lazy()` with `Suspense` boundary
- Remove unused dependencies from package.json regularly

### Startup Time
- Minimize work in `_layout.tsx` root — defer non-critical initialization
- Load fonts in parallel with `useFonts` (already done via expo-font)
- Defer analytics/tracking initialization to after first render
- Use `expo-splash-screen` to hide cold start (hold until fonts + critical data ready)
- Preload critical data in `_layout.tsx` before hiding splash screen

## KNOWN SDK 55 ISSUES TO AVOID

1. **expo-image + FlashList frame drops** (#45301) — Use RN Image inside FlashList on iOS
2. **expo-notifications Android ProGuard** (#45292) — Add ProGuard keep rule for release builds:
   ```json
   ["expo-build-properties", { "android": { "extraProguardRules": "-keep class expo.modules.notifications.** { *; }" }}]
   ```
3. **expo-image + Reanimated reload** (#24894) — Don't animate expo-image on iOS
4. **expo-image RAM crash** (#26781) — Limit concurrent image loads, use recyclingKey
5. **Stale deep links on Android** (#44879) — Test deep link → back → relaunch flow
6. **Hermes crash on iOS 26** (#44606) — Monitor for SDK patches
7. **headerSearchBarOptions memory leak** (#43651) — Watch for react-native-screens updates

## AUDIT PROCESS
1. Read the target file(s) completely
2. Check every item in the rendering, data, and bundle sections
3. Fix all violations immediately
4. If FlashList needs adding, also add `estimatedItemSize` measured from the design
5. Report what was fixed and expected perf impact
