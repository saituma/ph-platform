import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { spacing, radius, fonts } from "@/constants/theme";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { trackingScrollBottomPad } from "@/lib/tracking/mainTabBarInset";
import { useAppSelector } from "@/store/hooks";
import {
  fetchPrivacySettings,
  updatePrivacySettings,
  type PrivacySettings,
} from "@/services/tracking/socialService";

export default function TeamSettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const safeTop = Math.max(insets.top, 18);
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : colors.border;
  const cardBg = isDark ? colors.cardElevated : colors.backgroundSecondary;

  const loadSettings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchPrivacySettings(token);
      setPrivacySettings(res.settings);
    } catch (e: any) {
      Alert.alert("Couldn't load settings", String(e?.message ?? "Error"));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleBack = useCallback(() => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/tracking/social" as any);
  }, [router]);

  const handleToggleSocialEnabled = useCallback(
    async (value: boolean) => {
      if (!token) return;

      const promptTitle = value ? "Enable Team Features?" : "Disable Team Features?";
      const promptBody = value
        ? "This will allow others to see your runs, comment on them, and include you in leaderboards."
        : "This will make your runs private and remove you from leaderboards.";
      const confirmText = value ? "Enable" : "Disable";

      Alert.alert(promptTitle, promptBody, [
        { text: "Cancel", style: "cancel" },
        {
          text: confirmText,
          style: value ? "default" : "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              const res = await updatePrivacySettings(token, {
                socialEnabled: value,
                ...(value ? { privacyVersionAccepted: "1.0" } : {}),
              });
              setPrivacySettings(res.settings);
            } catch (e: any) {
              Alert.alert("Error", String(e?.message ?? "Could not update settings"));
            } finally {
              setSaving(false);
            }
          },
        },
      ]);
    },
    [token],
  );

  const updateSetting = useCallback(
    async (key: keyof PrivacySettings, value: boolean) => {
      if (!token) return;
      setSaving(true);
      try {
        const res = await updatePrivacySettings(token, { [key]: value });
        setPrivacySettings(res.settings);
      } catch (e: any) {
        Alert.alert("Error", String(e?.message ?? "Could not update settings"));
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  if (!token) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.xl }}>
        <Text style={{ fontFamily: fonts.heading2, fontSize: 22, color: colors.textPrimary }}>
          Team settings
        </Text>
        <Text style={{ marginTop: spacing.sm, color: colors.textSecondary }}>
          Sign in to manage team privacy settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: safeTop + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: trackingScrollBottomPad(insets),
          gap: spacing.lg,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <RoundIconButton
            onPress={handleBack}
            icon={<Ionicons name="arrow-back" size={20} color="#FFFFFF" />}
          />
          <Text style={{ fontFamily: fonts.heading2, fontSize: 22, color: colors.textPrimary }}>
            Team settings
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View
          style={{
            backgroundColor: "#0D140F",
            borderRadius: radius.xxl,
            borderWidth: 1,
            borderColor: "rgba(34,197,94,0.18)",
            padding: spacing.xl,
            gap: spacing.sm,
          }}
        >
          <Text style={{ fontFamily: fonts.heading2, fontSize: 20, color: colors.textPrimary }}>
            Manage team visibility
          </Text>
          <Text style={{ color: "#A7F3D0" }}>
            Control whether your runs appear in the team feed, leaderboard, and directory.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: radius.xxl,
            padding: spacing.xl,
            borderWidth: 1,
            borderColor: cardBorder,
            gap: spacing.lg,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={{ fontFamily: fonts.heading3, fontSize: 18, color: colors.textPrimary }}>
                Team features
              </Text>
              <Text style={{ marginTop: 6, color: colors.textSecondary }}>
                Allow teammates to see your runs and comment.
              </Text>
            </View>

            {loading || saving ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Switch
                value={privacySettings?.socialEnabled ?? false}
                onValueChange={handleToggleSocialEnabled}
                trackColor={{ false: colors.surfaceHigh, true: colors.accent }}
                thumbColor="#fff"
              />
            )}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
        ) : null}

        {privacySettings?.socialEnabled ? (
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: radius.xxl,
              padding: spacing.xl,
              borderWidth: 1,
              borderColor: cardBorder,
              gap: 18,
            }}
          >
            <Text style={{ fontFamily: fonts.bodyBold, color: colors.textPrimary }}>
              Preferences
            </Text>

            <SettingRow
              label="Share runs publicly"
              subtitle="Visible in the team feed"
              value={privacySettings.shareRunsPublicly}
              onChange={(v) => void updateSetting("shareRunsPublicly", v)}
              colors={colors}
              disabled={saving}
            />
            <Divider color={colors.borderSubtle} />
            <SettingRow
              label="Allow comments"
              subtitle="Teammates can comment on your runs"
              value={privacySettings.allowComments}
              onChange={(v) => void updateSetting("allowComments", v)}
              colors={colors}
              disabled={saving}
            />
            <Divider color={colors.borderSubtle} />
            <SettingRow
              label="Show in leaderboard"
              subtitle="Include your stats in ranking"
              value={privacySettings.showInLeaderboard}
              onChange={(v) => void updateSetting("showInLeaderboard", v)}
              colors={colors}
              disabled={saving}
            />
            <Divider color={colors.borderSubtle} />
            <SettingRow
              label="Show in directory"
              subtitle="Teammates can find your profile"
              value={privacySettings.showInDirectory}
              onChange={(v) => void updateSetting("showInDirectory", v)}
              colors={colors}
              disabled={saving}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function RoundIconButton({
  onPress,
  icon,
}: {
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0,0,0,0.35)",
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {icon}
    </Pressable>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={{ height: 1, backgroundColor: color, opacity: 0.9 }} />;
}

function SettingRow({
  label,
  subtitle,
  value,
  onChange,
  colors,
  disabled,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: any;
  disabled: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary }}>
          {label}
        </Text>
        <Text style={{ marginTop: 4, fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceHigh, true: colors.accent }}
        thumbColor="#fff"
        disabled={disabled}
      />
    </View>
  );
}
