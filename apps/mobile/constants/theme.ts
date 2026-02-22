/**
 * Design system tokens for the coaching app.
 * Colors, shadows, spacing, and radius — all in one place.
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
    card: '#ffffff',
    cardElevated: '#f8faf9',
    separator: 'rgba(0, 0, 0, 0.06)',
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
    background: '#0F1115', // Deep charcoal — not pure black
    backgroundSecondary: '#1A1D27', // Warmer elevated surface
    inputBackground: '#1A1D27',
    card: '#181B23', // Card surface — subtle lift from background
    cardElevated: '#1F2330', // Higher-elevation card
    separator: 'rgba(255, 255, 255, 0.06)',
    border: '#232830',
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
    themeToggleIcon: '#22c55e', // Consistent emerald green
    placeholder: '#4b5563',
  },
};

/** Platform-safe shadow presets */
export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 5 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 8 },
    default: {},
  }),
  /** Suppress shadows in dark mode */
  none: { shadowOpacity: 0, elevation: 0 },
};

/** 8-point spacing grid */
export const Space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

/** Consistent border-radius tokens */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

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
