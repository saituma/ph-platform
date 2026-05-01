# Video Player Multi-Engine Complexity Risk

## Severity
Low

## Risk
Single component handles native video, YouTube embeds, Loom WebView, fullscreen orchestration, and focus/app-state logic.

## Evidence
- `apps/mobile/components/media/VideoPlayer.tsx` imports both `expo-video` and `react-native-webview` and contains multi-mode branching.

## Impact
High complexity increases regression risk across platforms and media providers.

## Recommendation
Split provider-specific players into isolated modules with contract tests per mode.
