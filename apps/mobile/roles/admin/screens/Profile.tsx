import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useRefreshContext } from "@/context/RefreshContext";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { apiRequest } from "@/lib/api";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  logout,
  updateProfile,
} from "@/store/slices/userSlice";
import { useProfileSettings } from "@/components/more/profile/hooks/useProfileSettings";
import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Button } from "@/components/ui/button";
import { Modal } from "react-native";

export default function AdminProfileScreen() {
  const { colors, isDark, toggleColorScheme } = useAppTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.user.profile);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const token = useAppSelector((state) => state.user.token);
  const { isLoading } = useRefreshContext();
  const transition = useSharedValue(1);

  const {
    isUploadingAvatar,
    pendingAvatarUri,
    setPendingAvatarUri,
    handlePickAvatar,
    handleConfirmAvatar,
  } = useProfileSettings();

  useEffect(() => {
    transition.value = 0;
    transition.value = withTiming(1, {
      duration: 140,
      easing: Easing.out(Easing.cubic),
    });
  }, [transition]);

  const transitionStyle = useAnimatedStyle(() => ({
    opacity: transition.value,
    transform: [{ translateY: (1 - transition.value) * 10 }],
  }));

  const handleRefresh = useCallback(async () => {
    if (!token) return;
    try {
      const me = await apiRequest<{
        user?: {
          name?: string | null;
          email?: string | null;
          profilePicture?: string | null;
        };
      }>("/auth/me", {
        token,
        suppressStatusCodes: [401, 403],
        skipCache: true,
        forceRefresh: true,
      });
      if (me.user) {
        dispatch(
          updateProfile({
            name: me.user.name ?? null,
            email: me.user.email ?? null,
            avatar: me.user.profilePicture ?? null,
          }),
        );
      }
    } catch {
      /* keep existing profile */
    }
  }, [token, dispatch]);

  const versionLine = useMemo(() => {
    const appVersion = Constants.expoConfig?.version ?? "—";
    const expoCfg = Constants.expoConfig as
      | { ios?: { buildNumber?: string }; android?: { versionCode?: string } }
      | undefined;
    const build =
      Constants.nativeBuildVersion ??
      expoCfg?.ios?.buildNumber ??
      (expoCfg?.android?.versionCode != null
        ? String(expoCfg.android.versionCode)
        : "");
    return build
      ? `Version ${appVersion} (Build ${build})`
      : `Version ${appVersion}`;
  }, []);

  const insets = useAppSafeAreaInsets();
  const tabBarOverlayHeightEstimate = 86 + Math.max(insets.bottom, 12);

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : "hsl(150, 20%, 97%)";
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.06)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";
  const textPrimary = isDark ? "hsl(220, 5%, 94%)" : "hsl(220, 8%, 10%)";
  const subtleBg = isDark
    ? "rgba(255,255,255,0.05)"
    : "rgba(255,255,255,0.84)";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemedScrollView
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: tabBarOverlayHeightEstimate + 24,
        }}
      >
        {/* Header */}
        <View
          style={{
            width: "100%",
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 20,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: 32,
              fontFamily: "Telma-Bold",
              color: textPrimary,
              letterSpacing: -0.5,
            }}
          >
            More
          </Text>
        </View>

        {/* Profile Card */}
        <Pressable 
          style={({ pressed }) => ({ paddingHorizontal: 20, marginBottom: 32, opacity: pressed ? 0.9 : 1 })}
          onPress={() => router.push("/profile-settings")}
        >
          <View
            style={{
              overflow: "hidden",
              borderRadius: 28,
              borderWidth: 1,
              borderCurve: "continuous",
              padding: 24,
              backgroundColor: cardBg,
              borderColor: cardBorder,
            }}
          >
            <View
              style={{
                position: "absolute",
                right: -28,
                top: -28,
                height: 100,
                width: 100,
                borderRadius: 50,
                backgroundColor: isDark
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(34,197,94,0.08)",
              }}
            />

            {isLoading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                <Skeleton circle width={60} height={60} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton width="60%" height={22} />
                  <Skeleton width="40%" height={14} />
                </View>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  {profile.avatar ? (
                    <Pressable
                      onPress={handlePickAvatar}
                      style={({ pressed }) => ({
                        height: 60,
                        width: 60,
                        borderRadius: 20,
                        borderCurve: "continuous",
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: cardBorder,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Image
                        source={{ uri: profile.avatar }}
                        style={{ width: 60, height: 60 }}
                        contentFit="cover"
                      />
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={handlePickAvatar}
                      style={({ pressed }) => ({
                        height: 60,
                        width: 60,
                        borderRadius: 20,
                        borderCurve: "continuous",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: subtleBg,
                        borderWidth: 1,
                        borderColor: cardBorder,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Ionicons name="person-outline" size={26} color={colors.accent} />
                    </Pressable>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 20,
                        fontFamily: "ClashDisplay-Bold",
                        color: textPrimary,
                        lineHeight: 24,
                      }}
                    >
                      {profile.name || "Administrator"}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: "Outfit",
                        fontSize: 14,
                        color: labelColor,
                        marginTop: 4,
                      }}
                    >
                      {profile.email ||
                        (isAuthenticated ? "Email unavailable" : "Not signed in")}
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 12 }}>
                  <View
                    style={{
                      borderRadius: 16,
                      borderCurve: "continuous",
                      paddingHorizontal: 20,
                      paddingVertical: 18,
                      backgroundColor: subtleBg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: fonts.labelBold,
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                        color: labelColor,
                      }}
                    >
                      Role
                    </Text>
                    <Text
                      style={{
                        marginTop: 6,
                        fontSize: 17,
                        fontFamily: "ClashDisplay-Semibold",
                        color: textPrimary,
                      }}
                    >
                      System Administrator
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </Pressable>

        {/* Menu Items */}
        <Animated.View style={[{ paddingHorizontal: 20, width: "100%" }, transitionStyle]}>
          {isLoading ? (
            <View style={{ gap: 16, paddingHorizontal: 4 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Skeleton width={48} height={48} style={{ borderRadius: 16 }} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width="55%" height={16} />
                    <Skeleton width="35%" height={12} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <>
              {/* Appearance switch */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                  borderRadius: 99,
                  padding: 4,
                  marginBottom: 8,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Light mode"
                  accessibilityState={{ selected: !isDark }}
                  onPress={() => { if (isDark) toggleColorScheme(); }}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    paddingVertical: 11,
                    borderRadius: 99,
                    backgroundColor: !isDark ? subtleBg : "transparent",
                    ...(!isDark ? { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 } : {}),
                  }}
                >
                  <Feather name="sun" size={16} color={!isDark ? colors.accent : "rgba(255,255,255,0.35)"} />
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: !isDark ? textPrimary : "rgba(255,255,255,0.35)" }}>
                    Light
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dark mode"
                  accessibilityState={{ selected: isDark }}
                  onPress={() => { if (!isDark) toggleColorScheme(); }}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    paddingVertical: 11,
                    borderRadius: 99,
                    backgroundColor: isDark ? subtleBg : "transparent",
                    ...(isDark ? { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 } : {}),
                  }}
                >
                  <Feather name="moon" size={16} color={isDark ? colors.accent : "rgba(0,0,0,0.35)"} />
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: isDark ? textPrimary : "rgba(0,0,0,0.35)" }}>
                    Dark
                  </Text>
                </Pressable>
              </View>

              <SectionLabel text="Account & System" color={labelColor} />

              <MenuItem
                icon="person-outline"
                label="Profile Information"
                subtitle="Name, email, avatar"
                onPress={() => router.push("/profile-settings")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />
              <MenuItem
                icon="shield-checkmark-outline"
                label="Access Permissions"
                subtitle="Manage system clearances"
                onPress={() => router.push("/permissions")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />
              <MenuItem
                icon="lock-closed-outline"
                label="Security Protocols"
                subtitle="Advanced command interface"
                onPress={() => router.push("/privacy-security")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />
              <MenuItem
                icon="server-outline"
                label="Data Management"
                subtitle="Manage logs and cache"
                onPress={() => Haptics.selectionAsync()}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />
              <MenuItem
                icon="information-circle-outline"
                label="System Info"
                subtitle="Build and cluster status"
                onPress={() => router.push("/about")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />

              {/* Logout */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Logout"
                onPress={() => {
                  if (token) {
                    import("@/lib/pushRegistration").then(({ clearDevicePushToken }) => {
                      void clearDevicePushToken(token);
                    });
                  }
                  dispatch(logout());
                  router.replace("/(auth)/login");
                }}
                style={({ pressed }) => ({
                  marginTop: 32,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <View
                  style={{
                    height: 56,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 20,
                    borderCurve: "continuous",
                    gap: 10,
                    backgroundColor: "#DC2626",
                  }}
                >
                  <Ionicons name="log-out-outline" size={20} color="#FAFAFA" />
                  <Text
                    style={{
                      fontFamily: "ClashDisplay-Bold",
                      color: "#FAFAFA",
                      fontSize: 16,
                    }}
                  >
                    Logout
                  </Text>
                </View>
              </Pressable>

              <Text
                style={{
                  textAlign: "center",
                  fontFamily: "Outfit",
                  fontSize: 12,
                  color: labelColor,
                  marginTop: 24,
                  opacity: 0.6,
                }}
              >
                {versionLine}
              </Text>
            </>
          )}
        </Animated.View>
      </ThemedScrollView>

      {/* Avatar Confirmation Modal */}
      <Modal
        visible={Boolean(pendingAvatarUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingAvatarUri(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}
          onPress={() => setPendingAvatarUri(null)}
        >
          <Pressable 
            style={{ width: "100%", maxWidth: 320, borderRadius: 24, backgroundColor: isDark ? "#1C1C1E" : "#FFF", padding: 24, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 20, fontFamily: "ClashDisplay-Bold", color: textPrimary, marginBottom: 8 }}>Update Avatar?</Text>
            <Text style={{ fontSize: 14, fontFamily: "Outfit", color: labelColor, textAlign: "center", marginBottom: 24 }}>
              This will be visible across your profile.
            </Text>
            
            {pendingAvatarUri ? (
              <View style={{ marginBottom: 32, borderRadius: 999, overflow: "hidden", borderWidth: 4, borderColor: cardBorder }}>
                <Image source={{ uri: pendingAvatarUri }} style={{ width: 140, height: 140 }} />
              </View>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, width: "100%" }}>
              <Button
                variant="outline"
                style={{ flex: 1, height: 48, borderRadius: 12 }}
                onPress={() => setPendingAvatarUri(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                style={{ flex: 1, height: 48, borderRadius: 12 }}
                loading={isUploadingAvatar}
                onPress={handleConfirmAvatar}
              >
                Confirm
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SectionLabel({ text, color }: { text: string; color: string }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontFamily: fonts.labelBold,
        color,
        textTransform: "uppercase",
        letterSpacing: 1.2,
        marginTop: 24,
        marginBottom: 12,
        paddingHorizontal: 4,
      }}
    >
      {text}
    </Text>
  );
}

function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  accentColor,
  textColor,
  subtitleColor,
  isDark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  accentColor: string;
  textColor: string;
  subtitleColor: string;
  isDark: boolean;
}) {
  const cardBg = isDark ? "#1A1D1A" : "#F0FAF4";
  const cardBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(34,197,94,0.3)";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={subtitle || undefined}
      style={{ marginBottom: 16 }}
    >
      <View
        style={{
          paddingHorizontal: 18,
          paddingVertical: 18,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: cardBorder,
          backgroundColor: cardBg,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16,
            borderCurve: "continuous",
            marginRight: 16,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.06)"
              : `${accentColor}12`,
          }}
        >
          <Ionicons name={icon} size={22} color={accentColor} />
        </View>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 16,
              color: textColor,
            }}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: "Outfit",
                fontSize: 13,
                color: subtitleColor,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDark ? "hsl(220, 5%, 35%)" : "hsl(220, 5%, 72%)"}
        />
      </View>
      </View>
    </Pressable>
  );
}
