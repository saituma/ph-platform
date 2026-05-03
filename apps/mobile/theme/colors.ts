import { Colors as ThemeColors } from '@/constants/theme';

const light = {
  ...ThemeColors.light,
  primary: ThemeColors.light.accent,
  primaryForeground: '#FFFFFF',
  secondary: ThemeColors.light.surfaceHigh,
  secondaryForeground: ThemeColors.light.text,
  foreground: ThemeColors.light.text,
  destructive: ThemeColors.light.danger,
  destructiveForeground: '#FFFFFF',
  muted: ThemeColors.light.surfaceHigh,
  mutedForeground: ThemeColors.light.textSecondary,
  textMuted: ThemeColors.light.textSecondary,
  input: ThemeColors.light.inputBackground,
  popover: ThemeColors.light.card,
  green: ThemeColors.light.success,
  red: ThemeColors.light.danger,
} as const;

const dark = {
  ...ThemeColors.dark,
  primary: ThemeColors.dark.accent,
  primaryForeground: '#FFFFFF',
  secondary: ThemeColors.dark.surfaceHigh,
  secondaryForeground: ThemeColors.dark.text,
  foreground: ThemeColors.dark.text,
  destructive: ThemeColors.dark.danger,
  destructiveForeground: '#FFFFFF',
  muted: ThemeColors.dark.surfaceHigh,
  mutedForeground: ThemeColors.dark.textSecondary,
  textMuted: ThemeColors.dark.textSecondary,
  input: ThemeColors.dark.inputBackground,
  popover: ThemeColors.dark.card,
  green: ThemeColors.dark.success,
  red: ThemeColors.dark.danger,
} as const;

export const Colors = { light, dark } as const;
