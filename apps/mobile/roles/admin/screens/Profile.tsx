import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useRefreshContext } from "@/context/RefreshContext";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { apiRequest } from "@/lib/api";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import { Pressable, View, Modal } from "react-native";
import { Image } from "expo-image";
import {
  User,
  Shield,
  Lock,
  Database,
  Info,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
} from "lucide-react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  logout,
  updateProfile,
} from "@/store/slices/userSlice";
import { useProfileSettings } from "@/components/more/profile/hooks/useProfileSettings";
import { Text } from "@/components/ScaledText";
import { useAdminPastel, AdminScreen, AdminButton, AdminModalContainer } from "@/components/admin/AdminUI";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const MENU_COLORS = ["sage", "peach", "mint", "lavender", "pink"] as const;

export default function AdminProfileScreen() {
  const { isDark, toggleColorScheme } = useAppTheme();
  const p = useAdminPastel();
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

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
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
        <Animated.View
          entering={FadeInDown.duration(400).delay(50)}
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
              fontFamily: "Outfit-Bold",
              color: p.textPrimary,
              letterSpacing: -0.5,
            }}
          >
            More
          </Text>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Pressable
            style={({ pressed }) => ({ paddingHorizontal: 20, marginBottom: 32, opacity: pressed ? 0.9 : 1 })}
            onPress={() => router.push("/profile-settings")}
          >
            <View
              style={{
                overflow: "hidden",
                borderRadius: 28,
                borderCurve: "continuous",
                padding: 24,
                backgroundColor: p.cardLavender,
              }}
            >
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
                          backgroundColor: p.cardWhite,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <User size={26} color={p.accent} />
                      </Pressable>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 20,
                          fontFamily: "Outfit-Bold",
                          color: p.textPrimary,
                          lineHeight: 24,
                        }}
                      >
                        {profile.name || "Administrator"}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontFamily: "Outfit-Regular",
                          fontSize: 14,
                          color: p.textSecondary,
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
                        backgroundColor: p.cardWhite,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontFamily: "Outfit-Bold",
                          textTransform: "uppercase",
                          letterSpacing: 1.2,
                          color: p.textMuted,
                        }}
                      >
                        Role
                      </Text>
                      <Text
                        style={{
                          marginTop: 6,
                          fontSize: 17,
                          fontFamily: "Outfit-Bold",
                          color: p.textPrimary,
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
        </Animated.View>

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
              <Animated.View entering={FadeInDown.duration(400).delay(150)}>
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: p.divider,
                    borderRadius: 100,
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
                      borderRadius: 100,
                      backgroundColor: !isDark ? p.cardYellow : "transparent",
                    }}
                  >
                    <Sun size={16} color={!isDark ? p.textPrimary : p.textMuted} />
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: !isDark ? p.textPrimary : p.textMuted }}>
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
                      borderRadius: 100,
                      backgroundColor: isDark ? p.cardYellow : "transparent",
                    }}
                  >
                    <Moon size={16} color={isDark ? p.textPrimary : p.textMuted} />
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: isDark ? p.textPrimary : p.textMuted }}>
                      Dark
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Outfit-Bold",
                    color: p.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    marginTop: 24,
                    marginBottom: 12,
                    paddingHorizontal: 4,
                  }}
                >
                  Account & System
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(250)}>
                <PastelMenuItem
                  Icon={User}
                  label="Profile Information"
                  subtitle="Name, email, avatar"
                  onPress={() => router.push("/profile-settings")}
                  cardColor={p.cardSage}
                  p={p}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                <PastelMenuItem
                  Icon={Shield}
                  label="Access Permissions"
                  subtitle="Manage system clearances"
                  onPress={() => router.push("/permissions")}
                  cardColor={p.cardPeach}
                  p={p}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(350)}>
                <PastelMenuItem
                  Icon={Lock}
                  label="Security Protocols"
                  subtitle="Advanced command interface"
                  onPress={() => router.push("/privacy-security")}
                  cardColor={p.cardMint}
                  p={p}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(400)}>
                <PastelMenuItem
                  Icon={Database}
                  label="Data Management"
                  subtitle="Manage logs and cache"
                  onPress={() => Haptics.selectionAsync()}
                  cardColor={p.cardLavender}
                  p={p}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(450)}>
                <PastelMenuItem
                  Icon={Info}
                  label="System Info"
                  subtitle="Build and cluster status"
                  onPress={() => router.push("/about")}
                  cardColor={p.cardPink}
                  p={p}
                />
              </Animated.View>

              {/* Logout */}
              <Animated.View entering={FadeInDown.duration(400).delay(500)}>
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
                      borderRadius: 100,
                      borderCurve: "continuous",
                      gap: 10,
                      backgroundColor: p.danger,
                    }}
                  >
                    <LogOut size={20} color="#FAFAFA" />
                    <Text
                      style={{
                        fontFamily: "Outfit-Bold",
                        color: "#FAFAFA",
                        fontSize: 16,
                      }}
                    >
                      Logout
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>

              <Text
                style={{
                  textAlign: "center",
                  fontFamily: "Outfit-Regular",
                  fontSize: 12,
                  color: p.textMuted,
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
          style={{ flex: 1, backgroundColor: p.overlay, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}
          onPress={() => setPendingAvatarUri(null)}
        >
          <Pressable
            style={{
              width: "100%",
              maxWidth: 320,
              borderRadius: 28,
              backgroundColor: p.cardWhite,
              padding: 24,
              alignItems: "center",
              shadowColor: p.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 12,
              elevation: 5,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 20, fontFamily: "Outfit-Bold", color: p.textPrimary, marginBottom: 8 }}>Update Avatar?</Text>
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center", marginBottom: 24 }}>
              This will be visible across your profile.
            </Text>

            {pendingAvatarUri ? (
              <View style={{ marginBottom: 32, borderRadius: 999, overflow: "hidden" }}>
                <Image source={{ uri: pendingAvatarUri }} style={{ width: 140, height: 140 }} />
              </View>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, width: "100%" }}>
              <Pressable
                onPress={() => setPendingAvatarUri(null)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 100,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: p.divider,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmAvatar}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 100,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: p.accent,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: "#FAFAFA" }}>
                  {isUploadingAvatar ? "Uploading..." : "Confirm"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function PastelMenuItem({
  Icon,
  label,
  subtitle,
  onPress,
  cardColor,
  p,
}: {
  Icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  cardColor: string;
  p: ReturnType<typeof useAdminPastel>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={subtitle || undefined}
      style={({ pressed }) => ({ marginBottom: 12, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <View
        style={{
          paddingHorizontal: 18,
          paddingVertical: 18,
          borderRadius: 28,
          backgroundColor: cardColor,
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
              backgroundColor: p.cardWhite,
            }}
          >
            <Icon size={22} color={p.accent} />
          </View>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 16,
                color: p.textPrimary,
              }}
            >
              {label}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 13,
                  color: p.textSecondary,
                  marginTop: 2,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          <ChevronRight size={18} color={p.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}
