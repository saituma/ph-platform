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
import {
  Camera,
  ChevronRight,
  Sun,
  Moon,
  User,
  Lock,
  Shield,
  Info,
  HelpCircle,
  MessageSquare,
  FileText,
  ShieldCheck,
  LogOut,
} from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/userSlice";
import { useProfileSettings } from "@/components/more/profile/hooks/useProfileSettings";

export default function TeamManagerProfileScreen() {
  const p = useAdminPastel();
  const { isDark, toggleColorScheme } = useAppTheme();
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

  const displayName = profile.name || "Team Manager";
  const displayEmail = profile.email || (isAuthenticated ? "Email unavailable" : "Not signed in");
  const avatarInitial = (profile.name?.charAt(0) ?? "T").toUpperCase();
  const avatarUri = pendingAvatarUri ?? profile.avatar ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg, paddingTop: insets.top }}>

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              height: 22,
              width: 5,
              borderRadius: 100,
              backgroundColor: p.accent,
            }}
          />
          <Text
            style={{
              fontSize: 32,
              fontFamily: "Outfit-Bold",
              color: p.textPrimary,
              letterSpacing: -0.3,
            }}
          >
            Profile
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        overScrollMode="never"
      >
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
                    borderColor: p.accentSoft,
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
                        backgroundColor: p.accentSoft,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 32,
                          fontFamily: "Outfit-Bold",
                          color: p.accent,
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
                    backgroundColor: p.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: p.pageBg,
                  }}
                >
                  <Camera size={13} color={p.buttonPrimaryText} />
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
                      borderRadius: 100,
                      backgroundColor: p.accentSoft,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmAvatar}
                    disabled={isUploadingAvatar}
                    style={({ pressed }) => ({
                      paddingHorizontal: 16,
                      paddingVertical: 7,
                      borderRadius: 100,
                      backgroundColor: p.accent,
                      opacity: pressed || isUploadingAvatar ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Outfit-Bold", color: p.buttonPrimaryText }}>
                      {isUploadingAvatar ? "Saving..." : "Use Photo"}
                    </Text>
                  </Pressable>
                </View>
              )}

              <View style={{ alignItems: "center", gap: 6 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 24,
                    fontFamily: "Outfit-Bold",
                    color: p.textPrimary,
                    letterSpacing: -0.3,
                  }}
                >
                  {displayName}
                </Text>
                <View
                  style={{
                    borderRadius: 100,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    backgroundColor: p.accentSoft,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: "Outfit-Bold",
                      textTransform: "uppercase",
                      letterSpacing: 1.2,
                      color: p.accent,
                    }}
                  >
                    Team Manager
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 13,
                    fontFamily: "Outfit-Regular",
                    color: p.textSecondary,
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
              backgroundColor: p.cardWhite,
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
                  borderRadius: 100,
                  backgroundColor: p.divider,
                }}
              />
            </View>

            {/* ── Appearance Switch ─────────────────────────── */}
            <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: p.inputBg,
                  borderRadius: 100,
                  padding: 4,
                }}
              >
                <Pressable
                  onPress={() => { if (isDark) toggleColorScheme(); }}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    paddingVertical: 10,
                    borderRadius: 100,
                    backgroundColor: !isDark ? p.cardWhite : "transparent",
                  }}
                >
                  <Sun size={16} color={!isDark ? p.accent : p.textMuted} />
                  <Text style={{ fontSize: 13, fontFamily: "Outfit-Bold", color: !isDark ? p.textPrimary : p.textMuted }}>
                    Light
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { if (!isDark) toggleColorScheme(); }}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    paddingVertical: 10,
                    borderRadius: 100,
                    backgroundColor: isDark ? p.cardWhite : "transparent",
                  }}
                >
                  <Moon size={16} color={isDark ? p.accent : p.textMuted} />
                  <Text style={{ fontSize: 13, fontFamily: "Outfit-Bold", color: isDark ? p.textPrimary : p.textMuted }}>
                    Dark
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* ── Settings ──────────────────────────────────── */}
            <SectionLabel label="Settings" />
            <View
              style={{
                marginHorizontal: 16,
                backgroundColor: p.cardWhite,
                borderRadius: 22,
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              <ProfileRow
                icon={User}
                label="Edit Profile"
                subtitle="Name, photo, email"
                accent={p.accent}
                onPress={() => router.push("/profile-settings")}
              />
              <ProfileRow
                icon={Camera}
                label="Change Photo"
                subtitle="Update your profile picture"
                accent={p.info}
                isLast
                onPress={handlePickAvatar}
              />
            </View>

            {/* ── Account ───────────────────────────────────── */}
            <SectionLabel label="Account" />
            <View
              style={{
                marginHorizontal: 16,
                backgroundColor: p.cardWhite,
                borderRadius: 22,
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              <ProfileRow
                icon={Lock}
                label="Privacy & Security"
                accent={p.warning}
                onPress={() => router.navigate("/privacy-security")}
              />
              <ProfileRow
                icon={Shield}
                label="Permissions"
                accent={p.info}
                onPress={() => router.navigate("/permissions")}
              />
              <ProfileRow
                icon={Info}
                label="About App"
                accent={p.textMuted}
                isLast
                onPress={() => router.push("/about")}
              />
            </View>

            {/* ── Support ───────────────────────────────────── */}
            <SectionLabel label="Support" />
            <View
              style={{
                marginHorizontal: 16,
                backgroundColor: p.cardWhite,
                borderRadius: 22,
                overflow: "hidden",
                marginBottom: 24,
              }}
            >
              <ProfileRow
                icon={HelpCircle}
                label="Help Center"
                accent={p.info}
                onPress={() => router.push("/help-center")}
              />
              <ProfileRow
                icon={MessageSquare}
                label="Send Feedback"
                accent={p.accent}
                onPress={() => router.push("/feedback")}
              />
              <ProfileRow
                icon={FileText}
                label="Terms of Service"
                accent={p.textMuted}
                onPress={() => router.navigate("/terms")}
              />
              <ProfileRow
                icon={ShieldCheck}
                label="Privacy Policy"
                accent={p.textMuted}
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
                    borderRadius: 100,
                    backgroundColor: p.danger,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <LogOut size={18} color="#fff" />
                  <Text
                    style={{
                      fontFamily: "Outfit-Bold",
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

function SectionLabel({ label }: { label: string }) {
  const p = useAdminPastel();
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
          borderRadius: 100,
          backgroundColor: p.textMuted,
        }}
      />
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Outfit-Bold",
          color: p.textMuted,
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
  icon: Icon,
  label,
  subtitle,
  accent,
  isLast = false,
  onPress,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  subtitle?: string;
  accent: string;
  isLast?: boolean;
  onPress: () => void;
}) {
  const p = useAdminPastel();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        backgroundColor: pressed ? p.accentSoft : "transparent",
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: p.divider,
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
          <Icon size={18} color={accent} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary }}>
            {label}
          </Text>
          {subtitle && (
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary }}>
              {subtitle}
            </Text>
          )}
        </View>
        <ChevronRight size={14} color={p.textMuted} />
      </View>
    </Pressable>
  );
}
