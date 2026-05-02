---
name: expo-native-ui
description: Build with native platform UI — SwiftUI components, Jetpack Compose Material 3, native tabs, glass effects, SF Symbols, native controls. Use when building screens that should look 100% platform-native.
user-invokable: true
args:
  - name: component
    description: "What to build: 'tabs', 'controls', 'glass', 'icons', 'header', 'search', or the specific component name"
    required: false
---

Use Expo SDK 55's native UI capabilities to build screens indistinguishable from native apps.

## @expo/ui — SwiftUI & Jetpack Compose (Beta)

### SwiftUI (iOS)
```typescript
import { BottomSheet, Host, DatePicker, Toggle, ProgressView } from '@expo/ui/swift-ui';

// All SwiftUI components must be wrapped in Host
<Host style={{ width: '100%' }}>
  <DatePicker value={date} onChange={setDate} mode="date" />
  <Toggle value={isOn} onValueChange={setIsOn} label="Notifications" />
  <ProgressView progress={0.7} />
</Host>
```

### Jetpack Compose (Android)
```typescript
import { Card, LazyColumn, ListItem, ModalBottomSheet, Switch, Slider, Icon, Box, Row, Column } from '@expo/ui/jetpack-compose';
import { clip, size, background, padding, weight } from '@expo/ui/jetpack-compose/modifiers';

<LazyColumn>
  <ListItem>
    <ListItem.Leading><Icon name="person" /></ListItem.Leading>
    <Text>Profile</Text>
    <ListItem.Trailing><Switch checked={isOn} onCheckedChange={setIsOn} /></ListItem.Trailing>
  </ListItem>
</LazyColumn>
```

## NATIVE TABS (expo-router SDK 55+)
```typescript
import { NativeTabs } from 'expo-router/unstable-native-tabs';

// In (tabs)/_layout.tsx:
<NativeTabs>
  <NativeTabs.Trigger name="index" href="/(tabs)/">
    <NativeTabs.Trigger.Icon ios={{ name: 'house.fill' }} android={{ name: 'home' }} />
    <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="programs" href="/(tabs)/programs">
    <NativeTabs.Trigger.Icon ios={{ name: 'figure.run' }} android={{ name: 'fitness_center' }} />
    <NativeTabs.Trigger.Label>Programs</NativeTabs.Trigger.Label>
    <NativeTabs.Trigger.Badge count={3} />
  </NativeTabs.Trigger>
</NativeTabs>

// iOS options:
// blurEffect — frosted glass tab bar
// minimizeBehavior — iOS 26+ compact mode
// sidebarAdaptable — iPad/Mac sidebar
// Android options:
// rippleColor, indicatorColor, labelVisibilityMode, backBehavior
```

## GLASS EFFECTS (iOS 26+)
```typescript
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

// Check availability first
if (isLiquidGlassAvailable()) {
  <GlassView style={{ borderRadius: 20, padding: 16 }}>{content}</GlassView>
}

// Fallback for older iOS / Android:
<BlurView intensity={60} tint="systemMaterialDark" style={{ borderRadius: 20, padding: 16 }}>
  {content}
</BlurView>
```

## BLUR EFFECTS
```typescript
import { BlurView } from 'expo-blur';

// iOS — true native blur via UIVisualEffectView
<BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

// System material tints (iOS):
// 'systemUltraThinMaterial', 'systemThinMaterial', 'systemMaterial',
// 'systemThickMaterial', 'systemChromeMaterial',
// 'systemUltraThinMaterialLight', 'systemThinMaterialLight', etc.

// Android — use BlurTargetView for performance (SDK 55):
import { BlurTargetView } from 'expo-blur';
<BlurTargetView>
  <View>{contentToBlur}</View>
</BlurTargetView>
<BlurView targetId="blur-target" intensity={40} />

// Android fallback (pre-12): semi-transparent background
Platform.OS === 'android' && Platform.Version < 31
  ? <View style={{ backgroundColor: 'rgba(0,0,0,0.85)' }} />
  : <BlurView intensity={60} />
```

## SF SYMBOLS (iOS) & MATERIAL ICONS (Android)
```typescript
import { SymbolView } from 'expo-symbols';

// SF Symbols with animation
<SymbolView
  name="heart.fill"
  weight="medium"
  scale="large"
  tintColor={accent}
  animationSpec={{ effect: { type: 'bounce' } }}
/>

// Animated symbol effects: bounce, pulse, variableColor, scale
// Weights: ultraLight, thin, light, regular, medium, semibold, bold, heavy, black
// Scales: small, medium, large
```

## NATIVE HEADERS & TOOLBARS
```typescript
// Native header with blur (iOS):
<Stack.Screen options={{
  headerBlurEffect: 'regular',
  headerTransparent: true,
  headerLargeTitle: true,      // iOS large title that collapses on scroll
  headerShadowVisible: false,
}} />

// Toolbar (iOS, SDK 55+):
<Stack.Toolbar placement="bottom">
  <Stack.Toolbar.Button icon={{ name: 'square.and.arrow.up' }} onPress={onShare} />
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.Menu title="More">
    <Stack.Toolbar.Menu.Action title="Edit" icon={{ name: 'pencil' }} onPress={onEdit} />
    <Stack.Toolbar.Menu.Action title="Delete" icon={{ name: 'trash' }} destructive onPress={onDelete} />
  </Stack.Toolbar.Menu>
</Stack.Toolbar>
```

## NATIVE SEARCH
```typescript
// In Stack.Screen options:
headerSearchBarOptions={{
  placeholder: 'Search programs...',
  onChangeText: (e) => setSearch(e.nativeEvent.text),
  autoCapitalize: 'none',
  hideWhenScrolling: true,    // iOS: search bar hides on scroll
}}

// Or with NativeTabs role="search":
<NativeTabs.Trigger name="search" href="/(tabs)/search">
  <NativeTabs.Trigger.Icon ios={{ name: 'magnifyingglass' }} />
</NativeTabs.Trigger>
```

## NATIVE CONTROLS
```typescript
// Switch (iOS native toggle)
import { Switch } from 'react-native';
<Switch value={isOn} onValueChange={setIsOn} trackColor={{ true: accent }} />

// Segmented Control (iOS, max 4 options)
import SegmentedControl from '@react-native-segmented-control/segmented-control';
<SegmentedControl values={['Day', 'Week', 'Month']} selectedIndex={0} onChange={onSelect} />

// Date/Time Picker (native)
import { DatePicker } from '@expo/ui/swift-ui';
<Host><DatePicker value={date} onChange={setDate} mode="datetime" /></Host>
```

## MESH GRADIENTS (advanced backgrounds)
```typescript
import { MeshGradient } from 'expo-mesh-gradient';

<MeshGradient
  columns={3} rows={3}
  colors={['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE']}
  style={{ position: 'absolute', width: '100%', height: 300 }}
/>
```

## ZOOM TRANSITIONS (iOS 18+, built into expo-router)
```typescript
import { Link } from 'expo-router';

// Source screen — wrap the tappable item:
<Link href={`/program/${id}`} asChild>
  <Link.Trigger withAppleZoom>
    <Animated.View sharedTransitionTag={`program-${id}`}>
      <Image source={cover} />
    </Animated.View>
  </Link.Trigger>
</Link>

// Destination screen — mark the target:
<Link.AppleZoomTarget>
  <Animated.View sharedTransitionTag={`program-${id}`}>
    <Image source={cover} />
  </Animated.View>
</Link.AppleZoomTarget>
```

## STORAGE (use the right one)
- `localStorage` polyfill from `expo-sqlite` — NOT AsyncStorage (deprecated pattern)
- `expo-secure-store` — tokens, credentials, sensitive data
- `react-native-mmkv` — high-performance synchronous reads (theme, prefs)
- `expo-sqlite` — complex local data (offline cache, local DB)

## PLATFORM DETECTION
```typescript
// Tree-shakeable (preferred):
if (process.env.EXPO_OS === 'ios') { /* iOS-only code stripped from Android bundle */ }

// Runtime (when needed):
import { Platform } from 'react-native';
if (Platform.OS === 'ios') { /* available on both bundles */ }
```
