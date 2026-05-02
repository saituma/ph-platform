---
name: expo-known-issues
description: SDK 55 known issues, workarounds, and gotchas that cause crashes, silent failures, or jank. Consult before shipping or when debugging unexplained behavior.
user-invokable: true
---

## CRITICAL — Silent failures or crashes

### expo-notifications Android ProGuard breakage (#45292)
R8 obfuscates notification classes in release builds. Scheduled notifications silently disappear.
**Fix:** Add to app.json plugins:
```json
["expo-build-properties", {
  "android": { "extraProguardRules": "-keep class expo.modules.notifications.** { *; }" }
}]
```

### Hermes crash on iOS 26 (#44606)
Hermes crashes within 400ms of launch on iOS 26. Virtual memory layout changed.
**Status:** Open. Monitor for SDK patches. Test on iOS 26 beta devices.

### expo-image + FlashList frame drops (#45301)
expo-image causes visible frame drops during scroll inside FlashList on iOS.
**Fix:** Use RN `Image` from react-native inside FlashList. Keep expo-image for non-list contexts.

### expo-image RAM crash with many images (#26781)
RAM exceeds 2GB and app crashes when rendering many images.
**Fix:** Use `recyclingKey` on FlashList, limit concurrent image loads, implement pagination.

## HIGH — Broken UX or build failures

### expo-image reloads on Reanimated animation (#24894)
Wrapping expo-image in `Animated.createAnimatedComponent()` causes image reload on every animation frame on iOS.
**Fix:** Use RN's `Animated.Image` for any animated image components. Never animate expo-image directly.

### Stale deep linking on Android (#44879)
expo-router reuses stale navigation state when Android recreates activity but JS process survives. User opens via deep link, backs out, relaunches — sees deep link destination instead of home.
**Status:** Open, accepted. Test deep link flows on Android 12+.

### expo-image thumbhash placeholder leaks in FlashList (#44254)
Thumbhash/blurhash placeholders persist across recycled cells despite `recyclingKey`.
**Fix:** Set `recyclingKey` and test with real data. Consider plain `Image` if visible.

### react-native-screens headerSearchBarOptions memory leak (#43651)
UISearchController leaks during Apple Zoom transition dismissal on iOS 26.
**Status:** Open. Monitor react-native-screens updates.

### expo-background-task breaks static frameworks (#45274)
`expo-background-task@55.0.17` breaks `useFrameworks: "static"` iOS builds.
**Fix:** Pin to `expo-background-task@55.0.8`.

## MODERATE — Edge cases and platform quirks

### Screen orientation lockAsync unresponsive (#43802)
iOS rotation fails when react-native-screens is installed.

### expo-router tab flickering (#35116)
Screen flickering on tab change with expo-router/ui. Long-standing, accepted.

### Suspended siblings React state update error (#41271)
"Can't perform a React state update on a component that hasn't mounted yet" with React Navigation 7 + expo-router.

### expo-sqlite web worker truncation (#45186)
Sync worker truncates result-envelope length to one byte on web.

### expo-camera crashes on low-RAM Android (#43913)
`launchCameraAsync()` crashes when OS terminates app to free memory.
**Mitigation:** Handle camera errors gracefully, save state before launching camera.

## BUILD ISSUES

### iOS build from source fails on Xcode 26.4 (#44229)
SDK 55 cannot build from source on latest Xcode. Accepted, upstream RN issue.

### EXReactRootViewFactory.h missing forward declaration (#45298)
Build failures on fresh Expo 55 + RN 0.83 installations.

## PREVENTIVE MEASURES

1. **Pin Expo module versions** — Use exact versions, not `~` ranges, for modules with known regressions
2. **Test release builds on physical devices** — Many issues only manifest in production builds (ProGuard, memory, Hermes)
3. **Test deep linking flow** — Open deep link → back out → relaunch from launcher
4. **Test on mid-range devices** — Frame drops invisible on flagship phones
5. **Run `npx expo-doctor`** regularly to catch compatibility issues
6. **Monitor expo/expo GitHub issues** for your SDK version
