import { ActionButton } from "@/components/dashboard/ActionButton";
import { Text } from "@/components/ScaledText";
import { AvatarSection } from "@/components/more/profile/AvatarSection";
import { useProfileSettings } from "@/components/more/profile/hooks/useProfileSettings";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@/components/ui/theme-icons";
import { Shadows } from "@/constants/theme";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/userSlice";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { Alert, Image, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export default function TeamManagerProfileScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useAppSafeAreaInsets();
  const isAuthenticated = useAppSelector((s) => s.user.isAuthenticated);

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
          dispatch(logout());
          router.replace("/(auth)/login");
        },
      },
    ]);
  }, [dispatch, router]);

  const handleRefresh = async () => {
    await new Promise((r) => setTimeout(r, 800));
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView
        onRefresh={handleRefresh}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        <View className="px-6 pt-6 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1 mr-4 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text
              className="text-4xl font-telma-bold text-app tracking-tight"
              numberOfLines={1}
            >
              Profile
            </Text>
          </View>
          <View className="mr-6">
            <ThemeToggle size={58} iconSize={28} />
          </View>
        </View>

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
                    {(profile.name?.charAt(0) ?? "T").toUpperCase()}
                  </Text>
                </View>
              )}

              <View className="flex-1">
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
                    Team Manager
                  </Text>
                </View>
                <Text className="text-xl font-bold font-clash text-app leading-tight">
                  {profile.name || "Team Manager"}
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
                <ActionButton
                  label={isSaving ? "Saving…" : "Save Changes"}
                  icon="check"
                  color="bg-accent"
                  iconColor="text-white"
                  onPress={handleSave}
                  fullWidth
                  size="xl"
                />
              </View>
            </View>
          </SectionGroup>

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

          <View>
            <ActionButton
              label="Sign Out"
              icon="log-out"
              color="bg-red-600"
              iconColor="text-white"
              onPress={handleLogout}
              fullWidth
            />
          </View>
        </Animated.View>
      </ThemedScrollView>
    </View>
  );
}

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
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  isLast: boolean;
  onPress: () => void;
  accentColor: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center px-5 py-4 ${
        isLast ? "" : "border-b border-border"
      }`}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-2xl mr-4"
        style={{ backgroundColor: `${accentColor}18` }}
      >
        <Feather name={icon} size={18} color={accentColor} />
      </View>
      <Text className="flex-1 text-app font-outfit font-semibold text-base">
        {label}
      </Text>
      <Feather name="chevron-right" size={18} color="rgba(148,163,184,0.8)" />
    </TouchableOpacity>
  );
}

