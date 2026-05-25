import React from "react";
import { View, TouchableOpacity, Linking, StyleSheet } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppDispatch } from "@/store/hooks";
import { clearUser } from "@/store/slices/userSlice";
import { clearAuthToken } from "@/lib/authStorage";

const ONBOARDING_URL = process.env.EXPO_PUBLIC_ONBOARDING_URL ?? "https://ph-platform-onboarding.vercel.app/";

export function NoActivePlanScreen() {
  const { isDark } = useAppTheme();
  const dispatch = useAppDispatch();

  const handleGetStarted = () => {
    const url = `${ONBOARDING_URL.replace(/\/$/, "")}/portal/billing`;
    Linking.openURL(url);
  };

  const handleLogout = async () => {
    await clearAuthToken();
    dispatch(clearUser());
  };

  const bg = isDark ? "#0a0a0a" : "#f9f9f9";
  const card = isDark ? "#141414" : "#ffffff";
  const border = isDark ? "#1f1f1f" : "#e5e5e5";
  const primary = "#16a34a";
  const textPrimary = isDark ? "#ffffff" : "#111111";
  const textMuted = isDark ? "#71717a" : "#52525b";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <View style={[styles.badge, { backgroundColor: isDark ? "#14291d" : "#f0fdf4", borderColor: isDark ? "#166534" : "#bbf7d0" }]}>
          <Text style={[styles.badgeText, { color: primary }]}>PH PERFORMANCE</Text>
        </View>

        <Text style={[styles.heading, { color: textPrimary }]}>
          Active plan required
        </Text>

        <Text style={[styles.body, { color: textMuted }]}>
          Your account doesn't have an active subscription. Subscribe to access your training programs, schedule, and coaching.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: primary }]}
          onPress={handleGetStarted}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Subscribe now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: border }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={[styles.secondaryButtonText, { color: textMuted }]}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 16,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
