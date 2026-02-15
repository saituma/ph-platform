/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#22c55e'; // Vibrant emerald green
const tintColorDark = '#22c55e'; // Consistent emerald green

export const Colors = {
  light: {
    text: '#052e16', // Dark forest green/black
    textSecondary: '#4b5563',
    background: '#ffffff', 
    backgroundSecondary: '#f0fdf4', // Very light green tint
    inputBackground: '#ffffff',
    border: '#e5e7eb',
    tint: tintColorLight,
    accent: '#22c55e',
    accentLight: '#f0fdf4',
    success: '#10b981',
    successSoft: '#ecfdf5',
    warning: '#f59e0b',
    warningSoft: '#fffbeb',
    danger: '#ef4444',
    dangerSoft: '#fef2f2',
    icon: '#6b7280',
    tabIconDefault: '#9ca3af',
    tabIconSelected: tintColorLight,
    themeToggleIcon: '#22c55e',
    placeholder: '#9ca3af',
  },
  dark: {
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    background: '#0a0a0b', // Deep black as requested
    backgroundSecondary: '#111827',
    inputBackground: '#111827',
    border: '#1f2937',
    tint: tintColorDark,
    accent: '#22c55e',
    accentLight: '#064e3b',
    success: '#10b981',
    successSoft: '#064e3b',
    warning: '#f59e0b',
    warningSoft: '#451a03',
    danger: '#ef4444',
    dangerSoft: '#450a0a',
    icon: '#94a3b8',
    tabIconDefault: '#4b5563',
    tabIconSelected: tintColorDark,
    themeToggleIcon: '#fde047',
    placeholder: '#4b5563',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
