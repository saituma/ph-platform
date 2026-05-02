---
name: expo-gestures
description: Implement production-grade gesture interactions — swipe actions, drag-to-reorder, pinch-to-zoom, pull-to-dismiss, double-tap. Use when adding any touch-driven interaction.
user-invokable: true
args:
  - name: gesture
    description: "Which gesture: 'swipe-actions', 'drag-reorder', 'pinch-zoom', 'pull-dismiss', 'double-tap', 'pull-refresh', or 'all'"
    required: false
---

Build gesture interactions that run entirely on the native UI thread at 120fps.

## CORE RULES
- ALL gesture callbacks run as worklets on the UI thread
- Use `Gesture.*` from `react-native-gesture-handler` — never RN's `PanResponder`
- Bridge to JS via `runOnJS` only for haptics, navigation, state updates
- Compose gestures: `Simultaneous` (both active), `Exclusive` (first wins), `Race` (first to activate cancels others)
- Always add `failOffsetY` on horizontal gestures inside vertical scrolls (prevents conflicts)

## GESTURE PATTERNS

### SWIPE-TO-REVEAL ACTIONS (messages, notifications, list items)
```typescript
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

// Use ReanimatedSwipeable (NOT legacy Swipeable) — runs on UI thread
<ReanimatedSwipeable
  renderRightActions={(progress, dragX) => {
    const style = useAnimatedStyle(() => ({
      transform: [{ translateX: interpolate(progress.value, [0, 1], [80, 0]) }],
    }));
    return (
      <Animated.View style={[styles.actions, style]}>
        <Pressable onPress={onArchive} style={[styles.action, { backgroundColor: '#007AFF' }]}>
          <Ionicons name="archive" size={22} color="#fff" />
        </Pressable>
        <Pressable onPress={onDelete} style={[styles.action, { backgroundColor: '#FF3B30' }]}>
          <Ionicons name="trash" size={22} color="#fff" />
        </Pressable>
      </Animated.View>
    );
  }}
  rightThreshold={40}
  friction={2}
  overshootRight={false}
  onSwipeableOpen={(direction) => {
    if (direction === 'right') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onDelete();
    }
  }}
>
  {children}
</ReanimatedSwipeable>
```

### DRAG-TO-REORDER
```typescript
const ITEM_HEIGHT = 60;

const pan = Gesture.Pan()
  .activateAfterLongPress(200)
  .onStart(() => {
    'worklet';
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
  })
  .onUpdate((e) => {
    'worklet';
    translateY.value = e.translationY;
    const newPos = Math.round((e.absoluteY - containerTop) / ITEM_HEIGHT);
    if (newPos !== currentPos.value) {
      currentPos.value = newPos;
      runOnJS(Haptics.selectionAsync)();
    }
  })
  .onEnd(() => {
    'worklet';
    translateY.value = withSpring(0, Springs.responsive);
    runOnJS(onReorder)(currentPos.value);
  });

// Active item gets elevated style:
const dragStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: translateY.value }, { scale: isActive ? 1.03 : 1 }],
  zIndex: isActive ? 100 : 0,
  shadowOpacity: isActive ? 0.15 : 0,
}));
```

### PINCH-TO-ZOOM (images, maps)
```typescript
const scale = useSharedValue(1);
const savedScale = useSharedValue(1);
const translateX = useSharedValue(0);
const translateY = useSharedValue(0);

const pinch = Gesture.Pinch()
  .onUpdate((e) => {
    'worklet';
    scale.value = Math.max(0.5, Math.min(4, savedScale.value * e.scale));
  })
  .onEnd(() => {
    'worklet';
    if (scale.value < 1.1) {
      scale.value = withSpring(1, Springs.responsive);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedScale.value = 1;
    } else {
      savedScale.value = scale.value;
    }
  });

const pan = Gesture.Pan()
  .onUpdate((e) => {
    'worklet';
    if (scale.value > 1) {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    }
  })
  .onEnd(() => {
    'worklet';
    if (scale.value <= 1) {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    }
  });

const doubleTap = Gesture.Tap()
  .numberOfTaps(2)
  .onEnd(() => {
    'worklet';
    if (scale.value > 1) {
      scale.value = withSpring(1); translateX.value = withSpring(0); translateY.value = withSpring(0);
      savedScale.value = 1;
    } else {
      scale.value = withSpring(2.5); savedScale.value = 2.5;
    }
  });

const gesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));
```

### PULL-DOWN-TO-DISMISS (modals, image viewers)
```typescript
const translateY = useSharedValue(0);
const THRESHOLD = 150;

const pan = Gesture.Pan()
  .onUpdate((e) => {
    'worklet';
    translateY.value = Math.max(0, e.translationY);
  })
  .onEnd((e) => {
    'worklet';
    if (translateY.value > THRESHOLD || e.velocityY > 1000) {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
      runOnJS(onDismiss)();
    } else {
      translateY.value = withSpring(0, Springs.responsive);
    }
  });

const modalStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: translateY.value }],
  borderRadius: interpolate(translateY.value, [0, 100], [0, 24], Extrapolation.CLAMP),
}));

const backdropStyle = useAnimatedStyle(() => ({
  opacity: interpolate(translateY.value, [0, THRESHOLD], [0.5, 0], Extrapolation.CLAMP),
}));
```

### DOUBLE-TAP TO LIKE (Instagram heart burst)
```typescript
const heartScale = useSharedValue(0);
const heartOpacity = useSharedValue(0);

const doubleTap = Gesture.Tap()
  .numberOfTaps(2)
  .onEnd((_e, success) => {
    'worklet';
    if (success) {
      heartScale.value = 0;
      heartOpacity.value = 1;
      heartScale.value = withSpring(1.2, Springs.bouncy);
      heartOpacity.value = withDelay(600, withTiming(0, { duration: 300 }));
      runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
      runOnJS(onLike)();
    }
  });

// Compose: double tap priority, single tap fallback
const composed = Gesture.Exclusive(doubleTap, Gesture.Tap());
```

### CUSTOM PULL-TO-REFRESH (branded spinner)
```typescript
const pullDistance = useSharedValue(0);
const isRefreshing = useSharedValue(false);
const TRIGGER = 80;

const pan = Gesture.Pan()
  .onUpdate((e) => {
    'worklet';
    if (e.translationY > 0 && !isRefreshing.value) {
      pullDistance.value = Math.min(e.translationY * 0.5, 120); // damped
    }
  })
  .onEnd(() => {
    'worklet';
    if (pullDistance.value > TRIGGER) {
      isRefreshing.value = true;
      pullDistance.value = withSpring(60);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      runOnJS(onRefresh)();
    } else {
      pullDistance.value = withSpring(0);
    }
  });

const spinnerStyle = useAnimatedStyle(() => ({
  transform: [
    { translateY: pullDistance.value },
    { rotate: `${interpolate(pullDistance.value, [0, 120], [0, 360])}deg` },
    { scale: interpolate(pullDistance.value, [0, TRIGGER], [0.5, 1], Extrapolation.CLAMP) },
  ],
  opacity: interpolate(pullDistance.value, [0, 40], [0, 1], Extrapolation.CLAMP),
}));
```

## GESTURE COMPOSITION CHEAT SHEET
- `Gesture.Simultaneous(pinch, pan)` — both run together (zoom + drag)
- `Gesture.Exclusive(doubleTap, singleTap)` — first match wins (order matters!)
- `Gesture.Race(swipe, longPress)` — first to activate cancels all others
- `.failOffsetY([-5, 5])` — cancel gesture if vertical movement detected (for horizontal swipes in vertical scrolls)
- `.activeOffsetX([-10, 10])` — only activate after 10px horizontal movement
- `.activateAfterLongPress(200)` — require 200ms hold before pan activates (drag-to-reorder)
