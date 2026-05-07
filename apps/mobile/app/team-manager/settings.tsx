import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  ChevronLeft,
  ShieldCheck,
  Eye,
  MessageCircle,
  Trophy,
  Users,
  Globe,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import {
  fetchPrivacySettings,
  updatePrivacySettings,
  type PrivacySettings,
  DEFAULT_PRIVACY_SETTINGS,
} from "@/services/tracking/socialService";

export default function TeamSettingsScreen() {
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const { token, appRole } = useAppSelector((s) => s.user);

  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  if (appRole !== "team_manager") {
    return <ReplaceOnce href="/(tabs)" />;
  }

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchPrivacySettings(token);
      setSettings(res.settings ?? DEFAULT_PRIVACY_SETTINGS);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleSetting = useCallback(
    async (key: keyof PrivacySettings, value: boolean) => {
      if (!token) return;
      setSaving(key);
      const prev = { ...settings };
      setSettings((s) => ({ ...s, [key]: value }));
      try {
        const res = await updatePrivacySettings(token, { [key]: value });
        if (res.settings) setSettings(res.settings);
      } catch {
        setSettings(prev);
      } finally {
        setSaving(null);
      }
    },
    [token, settings],
  );

  const TOGGLES: {
    key: keyof PrivacySettings;
    icon: React.ComponentType<{ size: number; color: string }>;
    label: string;
    subtitle: string;
    accent: string;
  }[] = [
    {
      key: "socialEnabled",
      icon: Globe,
      label: "Social Features",
      subtitle: "Enable team social feed, likes, and comments",
      accent: p.accent,
    },
    {
      key: "shareRunsPublicly",
      icon: Eye,
      label: "Share Runs Publicly",
      subtitle: "Allow team athletes' runs to be visible to all members",
      accent: p.info,
    },
    {
      key: "allowComments",
      icon: MessageCircle,
      label: "Allow Comments",
      subtitle: "Let members comment on each other's runs",
      accent: p.warning,
    },
    {
      key: "showInLeaderboard",
      icon: Trophy,
      label: "Show in Leaderboard",
      subtitle: "Include athletes in the team leaderboard rankings",
      accent: p.success,
    },
    {
      key: "showInDirectory",
      icon: Users,
      label: "Show in Directory",
      subtitle: "Make team members visible in the member directory",
      accent: p.danger,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      {/* Nav bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingBottom: 12,
          paddingTop: insets.top + 10,
          backgroundColor: p.pageBg,
          borderBottomWidth: 1,
          borderBottomColor: p.divider,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? p.accentSoft : p.cardWhite,
          })}
        >
          <ChevronLeft size={19} color={p.textSecondary} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontSize: 17,
            fontFamily: "Outfit-Bold",
            letterSpacing: -0.2,
            color: p.textPrimary,
          }}
        >
          Privacy & Visibility
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${p.info}18`,
            }}
          >
            <ShieldCheck size={26} color={p.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 20,
                fontFamily: "Outfit-Bold",
                letterSpacing: -0.3,
                color: p.textPrimary,
              }}
            >
              Team Privacy
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Outfit-Regular",
                color: p.textSecondary,
                marginTop: 2,
                lineHeight: 18,
              }}
            >
              Control what your team members can see and do
            </Text>
          </View>
        </View>

        {loading ? (
          <View
            style={{
              borderRadius: 22,
              backgroundColor: p.cardWhite,
              padding: 40,
              alignItems: "center",
            }}
          >
            <ActivityIndicator color={p.accent} />
          </View>
        ) : (
          <Animated.View entering={FadeInDown.duration(280)}>
            <View
              style={{
                borderRadius: 22,
                backgroundColor: p.cardWhite,
                overflow: "hidden",
              }}
            >
              {TOGGLES.map((toggle, index) => (
                <View key={toggle.key}>
                  {index > 0 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: p.divider,
                        marginLeft: 66,
                      }}
                    />
                  )}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      gap: 14,
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 11,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: `${toggle.accent}18`,
                      }}
                    >
                      <toggle.icon size={18} color={toggle.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontFamily: "Outfit-Bold",
                          color: p.textPrimary,
                        }}
                      >
                        {toggle.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Outfit-Regular",
                          color: p.textSecondary,
                          marginTop: 1,
                          lineHeight: 17,
                        }}
                      >
                        {toggle.subtitle}
                      </Text>
                    </View>
                    {saving === toggle.key ? (
                      <ActivityIndicator size="small" color={p.accent} />
                    ) : (
                      <Switch
                        value={Boolean(settings[toggle.key])}
                        onValueChange={(v) => toggleSetting(toggle.key, v)}
                        trackColor={{ false: p.inputBg, true: p.accent }}
                        thumbColor={
                          settings[toggle.key]
                            ? p.buttonPrimaryText
                            : p.textMuted
                        }
                      />
                    )}
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
