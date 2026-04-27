import React, { useCallback, useEffect } from "react";
import {
  Pressable,
  ScrollView,
  View,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/userSlice";
import { useProfileSettings } from "@/components/more/profile/hooks/useProfileSettings";
import { fonts } from "@/constants/theme";

export default function TeamManagerProfileScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useAppSafeAreaInsets();
  const { isAuthenticated, appRole, token } = useAppSelector((s) => s.user);

  const {
    profile,
    handlePickAvatar,
    pendingAvatarUri,
    setPendingAvatarUri,
    handleConfirmAvatar,
    isUploadingAvatar,
  } = useProfileSettings();

  const fadeOpacity = useSharedValue(0);
  useEffect(() => {
    fadeOpacity.value = withTiming(1, { duration: 500 });
  }, [fadeOpacity]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));

  const handleLogout = useCallback(() => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          if (token) {
            import("@/lib/pushRegistration").then(({ clearDevicePushToken }) => {
              void clearDevicePushToken(token);
            });
          }
          dispatch(logout());
          router.replace("/(auth)/login");
        },
      },
    ]);
  }, [dispatch, router, token]);

  if (appRole !== "team_manager") return null;

  const heroBg = isDark ? "hsl(148,18%,6%)" : "hsl(148,22%,96%)";
  const cardBg = colors.surfaceHigh;
  const cardBorder = colors.borderMid;
  const textPrimary = isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)";
  const divider = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  const displayName = profile.name || "Team Manager";
  const displayEmail = profile.email || (isAuthenticated ? "Email unavailable" : "Not signed in");
  const avatarInitial = (profile.name?.charAt(0) ?? "T").toUpperCase();
  const avatarUri = pendingAvatarUri ?? profile.avatar ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: heroBg, paddingTop: insets.top }}>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      >
        {/* Header lives outside Animated.View so its width is always correct */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 20,
          }}
        >
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                height: 22,
                width: 5,
                borderRadius: 99,
                backgroundColor: colors.accent,
              }}
            />
            <Text
              style={{
                fontSize: 32,
                fontFamily: "TelmaBold",
                color: textPrimary,
                letterSpacing: -0.3,
              }}
            >
              Profile
            </Text>
          </View>
          <ThemeToggle size={50} iconSize={26} />
        </View>

        <Animated.View style={fadeStyle}>

          {/* ── Hero Section ─────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 52 }}>

            {/* Avatar + identity */}
            <View style={{ alignItems: "center", gap: 12 }}>
              <Pressable
                onPress={handlePickAvatar}
                disabled={isUploadingAvatar}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 26,
                    overflow: "hidden",
                    borderWidth: 2,
                    borderColor: isDark ? `${colors.accent}40` : `${colors.accent}30`,
                  }}
                >
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={{ width: 88, height: 88 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isDark ? `${colors.accent}18` : `${colors.accent}14`,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 32,
                          fontFamily: "ClashDisplay-Bold",
                          color: colors.accent,
                        }}
                      >
                        {avatarInitial}
                      </Text>
                    </View>
                  )}
                </View>
                {/* Camera badge */}
                <View
                  style={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    backgroundColor: colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: heroBg,
                  }}
                >
                  <Ionicons name="camera" size={13} color="#fff" />
                </View>
              </Pressable>

              {/* Pending avatar confirm/cancel */}
              {pendingAvatarUri && (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                  <Pressable
                    onPress={() => setPendingAvatarUri(null)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 16,
                      paddingVertical: 7,
                      borderRadius: 12,
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 13, fontFamily: fonts.bodyMedium, color: colors.textSecondary }}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmAvatar}
                    disabled={isUploadingAvatar}
                    style={({ pressed }) => ({
                      paddingHorizontal: 16,
                      paddingVertical: 7,
                      borderRadius: 12,
                      backgroundColor: colors.accent,
                      opacity: pressed || isUploadingAvatar ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 13, fontFamily: fonts.bodyBold, color: "#fff" }}>
                      {isUploadingAvatar ? "Saving…" : "Use Photo"}
                    </Text>
                  </Pressable>
                </View>
              )}

              <View style={{ alignItems: "center", gap: 6 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 24,
                    fontFamily: "ClashDisplay-Bold",
                    color: textPrimary,
                    letterSpacing: -0.3,
                  }}
                >
                  {displayName}
                </Text>
                <View
                  style={{
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    backgroundColor: isDark ? `${colors.accent}18` : `${colors.accent}12`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: fonts.bodyBold,
                      textTransform: "uppercase",
                      letterSpacing: 1.2,
                      color: colors.accent,
                    }}
                  >
                    Team Manager
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 13,
                    fontFamily: fonts.bodyMedium,
                    color: colors.textSecondary,
                  }}
                >
                  {displayEmail}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Floating Content Card ─────────────────────── */}
          <View
            style={{
              backgroundColor: cardBg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              marginTop: -28,
              paddingBottom: 16,
            }}
          >
            {/* Drag pill */}
            <View style={{ alignItems: "center", paddingTop: 10, marginBottom: 4 }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 99,
                  backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
                }}
              />
            </View>

            {/* ── Settings ──────────────────────────────────── */}
            <SectionLabel label="Settings" isDark={isDark} />
            <View
              style={{
                marginHorizontal: 16,
                backgroundColor: isDark ? colors.surfaceHigher : "#fff",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: cardBorder,
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              <ProfileRow
                icon="person-outline"
                label="Edit Profile"
                subtitle="Name, photo, email"
                accent={colors.accent}
                isDark={isDark}
                divider={divider}
                onPress={() => router.push("/profile-settings")}
              />
              <ProfileRow
                icon="camera-outline"
                label="Change Photo"
                subtitle="Update your profile picture"
                accent={colors.cyan}
                isDark={isDark}
                divider={divider}
                isLast
                onPress={handlePickAvatar}
              />
            </View>

            {/* ── Account ───────────────────────────────────── */}
            <SectionLabel label="Account" isDark={isDark} />
            <View
              style={{
                marginHorizontal: 16,
                backgroundColor: isDark ? colors.surfaceHigher : "#fff",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: cardBorder,
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              <ProfileRow
                icon="lock-closed-outline"
                label="Privacy & Security"
                accent={colors.amber}
                isDark={isDark}
                divider={divider}
                onPress={() => router.navigate("/privacy-security")}
              />
              <ProfileRow
                icon="shield-outline"
                label="Permissions"
                accent={colors.purple}
                isDark={isDark}
                divider={divider}
                onPress={() => router.navigate("/permissions")}
              />
              <ProfileRow
                icon="information-circle-outline"
                label="About App"
                accent={colors.textSecondary}
                isDark={isDark}
                divider={divider}
                isLast
                onPress={() => router.push("/about")}
              />
            </View>

            {/* ── Support ───────────────────────────────────── */}
            <SectionLabel label="Support" isDark={isDark} />
            <View
              style={{
                marginHorizontal: 16,
                backgroundColor: isDark ? colors.surfaceHigher : "#fff",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: cardBorder,
                overflow: "hidden",
                marginBottom: 24,
              }}
            >
              <ProfileRow
                icon="help-circle-outline"
                label="Help Center"
                accent={colors.cyan}
                isDark={isDark}
                divider={divider}
                onPress={() => router.push("/help-center")}
              />
              <ProfileRow
                icon="chatbox-outline"
                label="Send Feedback"
                accent={colors.accent}
                isDark={isDark}
                divider={divider}
                onPress={() => router.push("/feedback")}
              />
              <ProfileRow
                icon="document-text-outline"
                label="Terms of Service"
                accent={colors.textSecondary}
                isDark={isDark}
                divider={divider}
                onPress={() => router.navigate("/terms")}
              />
              <ProfileRow
                icon="shield-checkmark-outline"
                label="Privacy Policy"
                accent={colors.textSecondary}
                isDark={isDark}
                divider={divider}
                isLast
                onPress={() => router.navigate("/privacy-policy")}
              />
            </View>

            {/* ── Sign Out ──────────────────────────────────── */}
            <View style={{ marginHorizontal: 16, marginTop: 8 }}>
              <Pressable
                onPress={handleLogout}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <View
                  style={{
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: "#DC2626",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <Ionicons name="log-out-outline" size={18} color="#fff" />
                  <Text
                    style={{
                      fontFamily: fonts.bodyBold,
                      fontSize: 15,
                      color: "#fff",
                    }}
                  >
                    Sign Out
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── SectionLabel ───────────────────────────────────────────────────────────

function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
      }}
    >
      <View
        style={{
          height: 14,
          width: 3,
          borderRadius: 99,
          backgroundColor: isDark ? "hsl(220,5%,35%)" : "hsl(220,5%,65%)",
        }}
      />
      <Text
        style={{
          fontSize: 11,
          fontFamily: fonts.labelCaps,
          color: isDark ? "hsl(220,5%,44%)" : "hsl(220,5%,50%)",
          textTransform: "uppercase",
          letterSpacing: 1.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ── ProfileRow ─────────────────────────────────────────────────────────────

function ProfileRow({
  icon,
  label,
  subtitle,
  accent,
  isDark,
  divider,
  isLast = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  accent: string;
  isDark: boolean;
  divider: string;
  isLast?: boolean;
  onPress: () => void;
}) {
  const textPrimary = isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)";
  const textSub = isDark ? "hsl(220,5%,48%)" : "hsl(220,5%,55%)";
  const chevronColor = isDark ? "hsl(220,5%,35%)" : "hsl(220,5%,60%)";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        backgroundColor: pressed
          ? isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)"
          : "transparent",
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: divider,
      })}
    >
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
            backgroundColor: `${accent}18`,
          }}
        >
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: textPrimary }}>
            {label}
          </Text>
          {subtitle && (
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: textSub }}>
              {subtitle}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={14} color={chevronColor} />
      </View>
    </Pressable>
  );
}
