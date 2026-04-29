import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@/components/ui/theme-icons";
import { Shadows } from "@/constants/theme";
import { AvatarSection } from "@/components/more/profile/AvatarSection";
import { Text } from "@/components/ScaledText";
import { useProfileSettings } from "@/components/more/profile/hooks/useProfileSettings";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/userSlice";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { Alert, Image, Pressable, TouchableOpacity, View } from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AdminHeader, AdminScreen } from "@/components/admin/AdminUI";

export default function AdminProfileScreen() {
  const { colors, isDark, toggleColorScheme } = useAppTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useAppSafeAreaInsets();
  const isAuthenticated = useAppSelector((s) => s.user.isAuthenticated);
  const token = useAppSelector((s) => s.user.token);

  const {
    profile,
    name,
    setName,
    email,
    isUploadingAvatar,
    pendingAvatarUri,
    setPendingAvatarUri,
    isSaving,
    handlePickAvatar,
    handleConfirmAvatar,
    handleSave,
  } = useProfileSettings();

  const transition = useSharedValue(0);
  useEffect(() => {
    transition.value = withTiming(1, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });
  }, [transition]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: transition.value,
    transform: [{ translateY: (1 - transition.value) * 12 }],
  }));

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

  const handleRefresh = async () => {
    await new Promise((r) => setTimeout(r, 1000));
  };

  return (
    <AdminScreen>
      <ThemedScrollView
        onRefresh={handleRefresh}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        <AdminHeader
          eyebrow="Account"
          title="Profile"
          subtitle="Account, settings, and theme"
          tone="accent"
        />

        {/* ── Identity card ── */}
        <View className="px-6 mb-6">
          <View
            className="overflow-hidden rounded-[32px] border px-5 py-5"
            style={{
              backgroundColor: isDark ? colors.cardElevated : "#F7F4FF",
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.06)",
              ...(isDark ? Shadows.none : Shadows.md),
            }}
          >
            {/* Decorative blob */}
            <View
              className="absolute -right-8 -top-8 h-28 w-28 rounded-full"
              style={{
                backgroundColor: isDark
                  ? "rgba(139,92,246,0.14)"
                  : "rgba(139,92,246,0.10)",
              }}
            />

            <View className="flex-row items-center gap-5">
              {profile.avatar ? (
                <View
                  className="h-16 w-16 rounded-[22px] overflow-hidden border"
                  style={{
                    borderColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.06)",
                    ...(isDark ? Shadows.none : Shadows.sm),
                  }}
                >
                  <Image
                    source={{ uri: profile.avatar }}
                    style={{ width: 64, height: 64 }}
                  />
                </View>
              ) : (
                <View
                  className="h-16 w-16 rounded-[22px] items-center justify-center border"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(139,92,246,0.14)"
                      : "rgba(139,92,246,0.10)",
                    borderColor: isDark
                      ? "rgba(139,92,246,0.25)"
                      : "rgba(139,92,246,0.2)",
                  }}
                >
                  <Text
                    className="text-2xl font-clash font-bold"
                    style={{ color: colors.accent }}
                  >
                    {(profile.name?.charAt(0) ?? "A").toUpperCase()}
                  </Text>
                </View>
              )}

              <View className="flex-1">
                {/* Admin badge */}
                <View
                  className="self-start rounded-full px-3 py-1 mb-2"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(139,92,246,0.18)"
                      : "rgba(139,92,246,0.12)",
                  }}
                >
                  <Text
                    className="text-[10px] font-outfit font-bold uppercase tracking-[1.4px]"
                    style={{ color: colors.accent }}
                  >
                    Administrator
                  </Text>
                </View>
                <Text className="text-xl font-bold font-clash text-app leading-tight">
                  {profile.name || "Admin"}
                </Text>
                <Text className="text-secondary font-outfit text-sm mt-0.5">
                  {profile.email ||
                    (isAuthenticated ? "Email unavailable" : "Not signed in")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Animated.View className="px-6 gap-6" style={fadeStyle}>
          {/* ── Edit Profile ── */}
          <SectionGroup label="Edit Profile">
            <View className="px-5 pt-5 pb-3">
              <AvatarSection
                avatar={profile.avatar ?? null}
                name={name}
                setName={setName}
                email={email}
                isUploadingAvatar={isUploadingAvatar}
                onPickAvatar={handlePickAvatar}
                pendingAvatarUri={pendingAvatarUri}
                onCancelPending={() => setPendingAvatarUri(null)}
                onConfirmPending={handleConfirmAvatar}
              />
              <View className="mt-4">
                <Pressable
                  onPress={handleSave}
                  disabled={isSaving}
                  style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                >
                  <View
                    style={{
                      height: 56,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      borderRadius: 20,
                      backgroundColor: colors.accent,
                    }}
                  >
                    <Feather name="check" size={20} color="#FFFFFF" />
                    <Text style={{ fontFamily: "ClashDisplay-Bold", fontSize: 16, color: "#FFFFFF" }}>
                      {isSaving ? "Saving…" : "Save Changes"}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </SectionGroup>

          {/* ── Appearance ── */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
              borderRadius: 99,
              padding: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => { if (isDark) toggleColorScheme(); }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                paddingVertical: 11,
                borderRadius: 99,
                backgroundColor: !isDark ? colors.card : "transparent",
                ...(!isDark ? { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 } : {}),
              }}
            >
              <Feather name="sun" size={16} color={!isDark ? colors.accent : "rgba(255,255,255,0.35)"} />
              <Text style={{ fontFamily: "Outfit-Medium", fontSize: 13, color: !isDark ? colors.textPrimary : "rgba(255,255,255,0.35)" }}>
                Light
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { if (!isDark) toggleColorScheme(); }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                paddingVertical: 11,
                borderRadius: 99,
                backgroundColor: isDark ? colors.card : "transparent",
                ...(isDark ? { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 } : {}),
              }}
            >
              <Feather name="moon" size={16} color={isDark ? colors.accent : "rgba(0,0,0,0.35)"} />
              <Text style={{ fontFamily: "Outfit-Medium", fontSize: 13, color: isDark ? colors.textPrimary : "rgba(0,0,0,0.35)" }}>
                Dark
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Account settings ── */}
          <SectionGroup label="Account">
            <MenuItem
              icon="lock"
              label="Privacy & Security"
              isLast={false}
              onPress={() => router.navigate("/privacy-security")}
              accentColor={colors.accent}
            />
            <MenuItem
              icon="shield"
              label="Permissions"
              isLast={false}
              onPress={() => router.navigate("/permissions")}
              accentColor={colors.accent}
            />
            <MenuItem
              icon="info"
              label="About App"
              isLast={true}
              onPress={() => router.push("/about")}
              accentColor={colors.accent}
            />
          </SectionGroup>

          {/* ── Support ── */}
          <SectionGroup label="Support">
            <MenuItem
              icon="help-circle"
              label="Help Center"
              isLast={false}
              onPress={() => router.push("/help-center")}
              accentColor={colors.accent}
            />
            <MenuItem
              icon="message-square"
              label="Send Feedback"
              isLast={false}
              onPress={() => router.push("/feedback")}
              accentColor={colors.accent}
            />
            <MenuItem
              icon="file-text"
              label="Terms of Service"
              isLast={false}
              onPress={() => router.navigate("/terms")}
              accentColor={colors.accent}
            />
            <MenuItem
              icon="shield"
              label="Privacy Policy"
              isLast={true}
              onPress={() => router.navigate("/privacy-policy")}
              accentColor={colors.accent}
            />
          </SectionGroup>

          {/* ── Logout ── */}
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <View
              style={{
                height: 56,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                borderRadius: 20,
                backgroundColor: "#DC2626",
              }}
            >
              <Feather name="log-out" size={20} color="#FFFFFF" />
              <Text style={{ fontFamily: "ClashDisplay-Bold", fontSize: 16, color: "#FFFFFF" }}>
                Sign Out
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </ThemedScrollView>
    </AdminScreen>
  );
}

/* ─── Local helpers ─────────────────────────────────────────────────────── */

function SectionGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <View className="flex-row items-center gap-3 mb-3 ml-2">
        <View className="h-4 w-1 rounded-full bg-accent" />
        <Text className="text-xs font-bold font-outfit text-secondary uppercase tracking-wider">
          {label}
        </Text>
      </View>
      <View className="bg-card rounded-3xl overflow-hidden">{children}</View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  isLast,
  onPress,
  accentColor,
}: {
  icon: any;
  label: string;
  isLast: boolean;
  onPress?: () => void;
  accentColor: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center px-5 py-5 active:opacity-90 ${
        !isLast ? "border-b border-separator" : ""
      }`}
    >
      <View
        className="w-12 h-12 items-center justify-center rounded-2xl mr-4"
        style={{ backgroundColor: `${accentColor}18` }}
      >
        <Feather name={icon} size={22} color={accentColor} />
      </View>
      <Text className="flex-1 font-outfit text-app text-[1.1875rem] font-medium">
        {label}
      </Text>
      <View
        className="h-9 w-9 rounded-2xl items-center justify-center"
        style={{ backgroundColor: `${accentColor}12` }}
      >
        <Feather name="chevron-right" size={18} color={accentColor} />
      </View>
    </TouchableOpacity>
  );
}
