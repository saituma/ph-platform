import { adminPastel } from "@/constants/theme";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

/**
 * Nutrition-scoped palette. Same shape as the shared admin-pastel theme, but the loud green
 * (saturated `#2F9F3D` / lime `#9EF700` card fills, green-tinted text, page bg, +/chip/ring
 * tints) is dialled down to neutral, leaving a single muted-green accent. Isolated to the
 * nutrition tab so the other ~140 admin-pastel screens are untouched.
 */
const LIGHT = {
  pageBg: "#F6F6F4",
  cardSage: "#EFF1ED",
  textPrimary: "#17191A",
  textSecondary: "#4C4F4D",
  textMuted: "#90938F",
  // Foreground accent (numbers, ring, icons): a readable darker lime so it stays legible on white.
  accent: "#4A8C00",
  accentSoft: "rgba(20,32,22,0.05)",
  success: "#4A8C00",
  successSoft: "rgba(74,140,0,0.10)",
  // Button/pill FILLS use the pure brand lime with dark ink.
  buttonPrimary: "#9EF700",
  buttonPrimaryText: "#0C0A09",
  inputBg: "#F4F4F2",
  inputBorder: "rgba(20,32,22,0.10)",
} as const;

const DARK = {
  cardSage: "#17191B",
  textPrimary: "#ECECEA",
  textSecondary: "#A6A6A4",
  textMuted: "#7C7E7A",
  // On dark, the pure brand lime is readable as a foreground too.
  accent: "#9EF700",
  accentSoft: "rgba(255,255,255,0.06)",
  success: "#9EF700",
  successSoft: "rgba(158,247,0,0.14)",
  buttonPrimary: "#9EF700",
  buttonPrimaryText: "#0C0A09",
  inputBorder: "rgba(255,255,255,0.10)",
} as const;

export type NutritionTheme = { [K in keyof typeof adminPastel.light]: string };

export function useNutritionTheme(): NutritionTheme {
  const { isDark } = useAppTheme();
  const base = isDark ? adminPastel.dark : adminPastel.light;
  return { ...base, ...(isDark ? DARK : LIGHT) };
}
