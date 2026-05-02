---
name: expo-micro-interactions
description: Add Instagram/Apple-level micro-interactions to a screen — press animations, haptics, gesture feedback, loading states, scroll effects. Use when UI feels flat or lifeless.
user-invokable: true
args:
  - name: target
    description: The screen or component to enhance (optional)
    required: false
---

Add production-level micro-interactions that make the app feel alive. Every interaction should have visual + haptic feedback.

## REQUIRED IMPORTS
```typescript
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, withDelay, withRepeat, interpolate, runOnJS,
  Extrapolation, FadeIn, FadeInDown, FadeOut, SlideInRight,
  Layout, Easing, useAnimatedScrollHandler, cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
```

## MICRO-INTERACTION CATALOG

Apply ALL relevant patterns to the target screen:

### BUTTONS & PRESSABLES
Every tappable element must have:
1. Scale-down on press: `Gesture.Tap().onBegin(() => scale.value = withSpring(0.96, Springs.snappy))`
2. Scale-up on release: `.onFinalize(() => scale.value = withSpring(1, Springs.responsive))`
3. Haptic on tap: `runOnJS(Haptics.impactAsync)(ImpactFeedbackStyle.Light)`
4. Use `GestureDetector` + `Gesture.Tap()` instead of `Pressable` — runs on native thread
5. Android: add `android_ripple={{ color: 'rgba(0,0,0,0.12)' }}` as alternative

### LIST ITEMS
- Staggered appear: `entering={FadeInDown.delay(Math.min(index, 10) * 50).springify().damping(15)}`
- Layout animation: `layout={Layout.springify()}` for reorder/filter animations
- Swipe actions: `ReanimatedSwipeable` from gesture-handler for archive/delete
- Press feedback: scale to 0.98 on press (subtler than buttons)

### SCROLL EFFECTS
- Parallax header: `useAnimatedScrollHandler` → interpolate scroll to header transform
- Collapsing header: interpolate height from HEADER_MAX to HEADER_MIN with CLAMP
- Sticky header blur: `BlurView` with opacity interpolated from scroll position
- Hide/show tab bar: detect scroll direction, `withTiming` translateY the tab bar
- Pull-to-refresh: custom spinner with rotation interpolated from pull distance

### LOADING STATES
- Skeleton shimmer: `withRepeat(withTiming(width, { duration: 1200 }), -1, false)` translating a `LinearGradient`
- Skeleton shapes must mirror the actual layout (not generic rectangles)
- Stagger skeleton appearance per row
- Transition from skeleton to content with `FadeIn.duration(300)`

### CONTENT INTERACTIONS
- Double-tap to like: `Gesture.Tap().numberOfTaps(2)` → heart burst with `withSpring(1.2, Springs.bouncy)` → `withDelay(600, withTiming(0))`
- Pinch-to-zoom: `Gesture.Simultaneous(Gesture.Pinch(), Gesture.Pan())` with bounce-back to scale 1
- Expandable sections: animate height with `interpolate(progress, [0,1], [0, contentHeight])` + chevron rotation
- Long-press context menu: `Gesture.LongPress().minDuration(300)` with scale-down + haptic progression

### FORMS & INPUTS
- Floating labels: translateY + scale interpolation on focus/blur
- Shake on error: `withSequence(withTiming(-10, 50), withRepeat(withTiming(10, 100), 3, true), withTiming(0, 50))` + `Haptics.notificationAsync(Error)`
- Success checkmark: `withSpring(1, Springs.bouncy)` scale from 0 + `Haptics.notificationAsync(Success)`
- Toggle switch: spring-animated translateX thumb + interpolateColor track

### NAVIGATION
- Tab icon bounce: `withSpring(1.15, { damping: 12 })` scale on active + translateY -2
- Screen transitions: `animation: 'slide_from_right'` or `'fade_from_bottom'` in Stack.Screen options
- Shared elements: `sharedTransitionTag` on matching `Animated.View` components between screens

### TOASTS & NOTIFICATIONS
- Slide in from top: `withSpring(0, Springs.responsive)` translateY from -100
- Swipe up to dismiss: `Gesture.Pan()` with velocity check
- Auto-dismiss: setTimeout → `withTiming(-100)` translateY
- Type-specific haptic: Success/Warning/Error via `Haptics.notificationAsync`

### FITNESS-SPECIFIC
- Progress rings: `useAnimatedProps` driving SVG `strokeDashoffset` with `withSpring`
- Stat counters: animate from 0 to value with `withTiming(value, { duration: 1000, easing: Easing.out(Easing.cubic) })`
- Timer pulse: `withRepeat(withSequence(withTiming(1.15, 800), withTiming(1, 800)), -1, true)` scale ring
- Achievement unlock: pop-in with `Springs.bouncy` + star wiggle + auto-dismiss after 4s

## SPRING CONFIGS
```typescript
const Springs = {
  snappy: { damping: 15, stiffness: 400, mass: 0.3 },
  responsive: { damping: 20, stiffness: 300, mass: 0.4 },
  gentle: { damping: 20, stiffness: 120, mass: 0.5 },
  bouncy: { damping: 8, stiffness: 200, mass: 0.5 },
  stiff: { damping: 30, stiffness: 500, mass: 0.3 },
};
```

## HAPTIC MAP
| Action | Method | Style |
|--------|--------|-------|
| Button tap | impactAsync | Light |
| Tab switch | impactAsync | Light |
| Toggle | impactAsync | Light |
| Pull refresh | impactAsync | Medium |
| Drag position | selectionAsync | — |
| Long press | impactAsync | Heavy |
| Error | notificationAsync | Error |
| Success | notificationAsync | Success |
| Destructive | notificationAsync | Warning |
| Swipe threshold | impactAsync | Heavy |

## RULES
- ALL animations run on UI thread via worklets — never cross the bridge for transforms
- `runOnJS` only for haptics, navigation, state updates
- Cancel animations on unmount
- Respect `useReducedMotion()` — skip entering animations
- `withSpring` for user actions, `withTiming` for system animations
- Always `Extrapolation.CLAMP` on scroll-driven interpolations
