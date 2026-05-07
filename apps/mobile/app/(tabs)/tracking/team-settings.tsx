import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { Stack, useRouter } from "expo-router";

import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
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
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const safeTop = Math.max(insets.top, 18);

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
      <View style={{ flex: 1, backgroundColor: p.pageBg, padding: 20 }}>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: p.textPrimary }}>
          Team settings
        </Text>
        <Text style={{ marginTop: 8, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
          Sign in to manage team privacy settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: safeTop + 12,
          paddingHorizontal: 20,
          paddingBottom: trackingScrollBottomPad(insets),
          gap: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: p.accent,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <ChevronLeft size={20} color={p.buttonPrimaryText} strokeWidth={2.5} />
          </Pressable>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: p.textPrimary }}>
            Team settings
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View
          style={{
            backgroundColor: p.cardMint,
            borderRadius: 22,
            padding: 20,
            gap: 8,
          }}
        >
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary }}>
            Manage team visibility
          </Text>
          <Text style={{ fontFamily: "Outfit-Regular", color: p.textSecondary }}>
            Control whether your runs appear in the team feed, leaderboard, and directory.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: p.cardWhite,
            borderRadius: 22,
            padding: 20,
            gap: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary }}>
                Team features
              </Text>
              <Text style={{ marginTop: 6, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                Allow teammates to see your runs and comment.
              </Text>
            </View>

            {loading || saving ? (
              <ActivityIndicator size="small" color={p.accent} />
            ) : (
              <Switch
                value={privacySettings?.socialEnabled ?? false}
                onValueChange={handleToggleSocialEnabled}
                trackColor={{ false: p.inputBg, true: p.accent }}
                thumbColor={p.cardWhite}
              />
            )}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={p.accent} style={{ marginTop: 20 }} />
        ) : null}

        {privacySettings?.socialEnabled ? (
          <View
            style={{
              backgroundColor: p.cardWhite,
              borderRadius: 22,
              padding: 20,
              gap: 18,
            }}
          >
            <Text style={{ fontFamily: "Outfit-Bold", color: p.textPrimary }}>
              Preferences
            </Text>

            <SettingRow
              label="Share runs publicly"
              subtitle="Visible in the team feed"
              value={privacySettings.shareRunsPublicly}
              onChange={(v) => void updateSetting("shareRunsPublicly", v)}
              p={p}
              disabled={saving}
            />
            <Divider color={p.divider} />
            <SettingRow
              label="Allow comments"
              subtitle="Teammates can comment on your runs"
              value={privacySettings.allowComments}
              onChange={(v) => void updateSetting("allowComments", v)}
              p={p}
              disabled={saving}
            />
            <Divider color={p.divider} />
            <SettingRow
              label="Show in leaderboard"
              subtitle="Include your stats in ranking"
              value={privacySettings.showInLeaderboard}
              onChange={(v) => void updateSetting("showInLeaderboard", v)}
              p={p}
              disabled={saving}
            />
            <Divider color={p.divider} />
            <SettingRow
              label="Show in directory"
              subtitle="Teammates can find your profile"
              value={privacySettings.showInDirectory}
              onChange={(v) => void updateSetting("showInDirectory", v)}
              p={p}
              disabled={saving}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={{ height: 1, backgroundColor: color }} />;
}

function SettingRow({
  label,
  subtitle,
  value,
  onChange,
  p,
  disabled,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  p: ReturnType<typeof import("@/components/admin/AdminUI").useAdminPastel>;
  disabled: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary }}>
          {label}
        </Text>
        <Text style={{ marginTop: 4, fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary }}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: p.inputBg, true: p.accent }}
        thumbColor={p.cardWhite}
        disabled={disabled}
      />
    </View>
  );
}
