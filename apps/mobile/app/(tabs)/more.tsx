import { ActionButton } from "@/components/dashboard/ActionButton";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRefreshContext } from "@/context/RefreshContext";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@/components/ui/theme-icons";
import { Shadows } from "@/constants/theme";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Image, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { logout } from "../../store/slices/userSlice";
import { Text } from "@/components/ScaledText";
import { canAccessTier } from "@/lib/planAccess";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export default function MoreScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { profile, isAuthenticated, programTier } = useAppSelector((state) => state.user);
  const { isLoading } = useRefreshContext();
  const transition = useSharedValue(1);
  const canAccessParentPlatform = canAccessTier(programTier ?? null, "PHP_Premium");
  const canUploadVideo = canAccessTier(programTier ?? null, "PHP_Premium");

  const openParentPlatform = () => {
    router.push("/parent-platform");
  };

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
  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Refreshed More Screen");
  };
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <ThemedScrollView
        onRefresh={handleRefresh}
        // UI polish: extra safe bottom spacing prevents cramped last actions near tab bar.
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        <View className="px-6 pt-6 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1 mr-4 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text className="text-4xl font-clash text-app tracking-tight" numberOfLines={1}>
              More
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
              backgroundColor: isDark ? colors.cardElevated : "#F7FFF9",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
              ...(isDark ? Shadows.none : Shadows.md),
            }}
          >
            <View
              className="absolute -right-8 -top-8 h-28 w-28 rounded-full"
              style={{ backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.10)" }}
            />

            {isLoading ? (
              <View className="flex-row items-center gap-5 mb-8">
                <Skeleton circle width={64} height={64} />
                <View className="flex-1 gap-2">
                  <Skeleton width="60%" height={24} />
                  <Skeleton width="40%" height={16} />
                </View>
              </View>
            ) : (
              <>
                <View className="flex-row items-center gap-5 mb-6">
                  {profile.avatar ? (
                    <View className="h-16 w-16 rounded-[22px] overflow-hidden relative border" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)", ...(isDark ? Shadows.none : Shadows.sm) }}>
                      <Image source={{ uri: profile.avatar }} style={{ width: 64, height: 64 }} />
                      <View className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full" />
                    </View>
                  ) : (
                    <View className="h-16 w-16 rounded-[22px] items-center justify-center relative border" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.84)", borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)", ...(isDark ? Shadows.none : Shadows.sm) }}>
                      <Feather name="user" size={28} color={colors.accent} />
                      <View className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full" />
                    </View>
                  )}
                  <View className="flex-1">
                    <View className="self-start rounded-full px-3 py-1.5 mb-2" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.82)" }}>
                      <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.4px]" style={{ color: colors.accent }}>
                        Account overview
                      </Text>
                    </View>
                    <Text className="text-xl font-bold font-clash text-app leading-tight">
                      {profile.name || "Profile"}
                    </Text>
                    <Text className="text-secondary font-outfit text-sm mt-0.5">
                      {profile.email || (isAuthenticated ? "Email unavailable" : "Not signed in")}
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1 rounded-[22px] px-4 py-4" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.84)" }}>
                    <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.4px] text-secondary">
                      Access
                    </Text>
                    <Text className="mt-2 text-lg font-clash text-app">
                      {programTier ?? "Free"}
                    </Text>
                  </View>
                  <View className="flex-1 rounded-[22px] px-4 py-4" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.84)" }}>
                    <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.4px] text-secondary">
                      Experience
                    </Text>
                    <Text className="mt-2 text-lg font-clash text-app">
                      Tailored
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        <Animated.View className="px-6 gap-6" style={transitionStyle}>
          {isLoading ? (
            <View className="gap-6">
              {[1, 2, 3].map((i) => (
                <View key={i}>
                  <Skeleton
                    width={80}
                    height={12}
                    style={{ marginBottom: 12, marginLeft: 8 }}
                  />
                  <View className="bg-input rounded-3xl overflow-hidden border border-app p-4 gap-4">
                    <Skeleton width="100%" height={20} />
                    <Skeleton width="100%" height={20} />
                    <Skeleton width="100%" height={20} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <>
              <View>
                <View className="flex-row items-center gap-3 mb-3 ml-2">
                  <View className="h-4 w-1 rounded-full bg-accent" />
                  <Text className="text-xs font-bold font-outfit text-secondary uppercase tracking-wider">
                    Account
                  </Text>
                </View>
                <View className="bg-card rounded-3xl overflow-hidden" style={isDark ? Shadows.none : Shadows.sm}>
                  <MenuItem
                    icon="user"
                    label="Profile Information"
                    isLast={false}
                    onPress={() => router.navigate("/profile-settings")}
                    accentColor={colors.accent}
                  />
                  <MenuItem
                    icon="shield"
                    label="Permissions"
                    isLast={false}
                    onPress={() => router.navigate("/permissions")}
                    accentColor={colors.accent}
                  />
                  {canAccessParentPlatform ? (
                    <MenuItem
                      icon="book"
                      label="Parent Platform"
                      isLast={false}
                      onPress={openParentPlatform}
                      accentColor={colors.accent}
                    />
                  ) : null}
                  {canUploadVideo ? (
                    <MenuItem
                      icon="video"
                      label="Upload Training Video"
                      isLast={false}
                      onPress={() => router.navigate("/video-upload")}
                      accentColor={colors.accent}
                    />
                  ) : null}
                  {canAccessTier(programTier ?? null, "PHP_Plus") ? (
                    <MenuItem
                      icon="activity"
                      label="Physio Referral"
                      isLast={false}
                      onPress={() => router.push("/physio-referral")}
                      accentColor={colors.accent}
                    />
                  ) : null}
                  <MenuItem
                    icon="bell"
                    label="Notifications"
                    isLast={false}
                    onPress={() => router.navigate("/notifications")}
                    accentColor={colors.accent}
                  />
                  <MenuItem
                    icon="lock"
                    label="Privacy & Security"
                    isLast={true}
                    onPress={() => router.navigate("/privacy-security")}
                    accentColor={colors.accent}
                  />
                </View>
              </View>

              <View>
                <View className="flex-row items-center gap-3 mb-3 ml-2">
                  <View className="h-4 w-1 rounded-full bg-accent" />
                  <Text className="text-xs font-bold font-outfit text-secondary uppercase tracking-wider">
                    Support & About
                  </Text>
                </View>
                <View className="bg-card rounded-3xl overflow-hidden" style={isDark ? Shadows.none : Shadows.sm}>
                  <MenuItem
                    icon="star"
                    label="Submit Testimonial"
                    isLast={false}
                    onPress={() => router.navigate("/submit-testimonial")}
                    accentColor={colors.accent}
                  />
                  <MenuItem
                    icon="help-circle"
                    label="Help Center"
                    isLast={false}
                    onPress={() => router.navigate("/help-center")}
                    accentColor={colors.accent}
                  />
                  <MenuItem
                    icon="message-square"
                    label="Send Feedback"
                    isLast={false}
                    onPress={() => router.navigate("/feedback")}
                    accentColor={colors.accent}
                  />
                  <MenuItem
                    icon="info"
                    label="About App"
                    isLast={true}
                    onPress={() => router.navigate("/about")}
                    accentColor={colors.accent}
                  />
                </View>
              </View>

              <View>
                <View className="flex-row items-center gap-3 mb-3 ml-2">
                  <View className="h-4 w-1 rounded-full bg-accent" />
                  <Text className="text-xs font-bold font-outfit text-secondary uppercase tracking-wider">
                    Legal
                  </Text>
                </View>
                <View className="bg-card rounded-3xl overflow-hidden" style={isDark ? Shadows.none : Shadows.sm}>
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
                </View>
              </View>
            </>
          )}
          <View>
            <ActionButton
              label="Logout"
              icon="log-out"
              color="bg-red-600"
              // UI polish: keep destructive action icon high-contrast on dark red.
              iconColor="text-white"
              onPress={() => {
                dispatch(logout());
                router.replace("/(auth)/login");
              }}
              fullWidth={true}
            />
          </View>

          <Text className="text-center text-muted font-outfit text-xs mt-2 mb-6">
            Version 1.0.0 (Build 124)
          </Text>
        </Animated.View>
      </ThemedScrollView>
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
      className={`flex-row items-center px-5 py-5 active:opacity-90 ${!isLast ? "border-b border-separator" : ""}`}
    >
      <View className="w-12 h-12 items-center justify-center rounded-2xl mr-4" style={{ backgroundColor: `${accentColor}18` }}>
        <Feather name={icon} size={22} color={accentColor} />
      </View>
      <Text className="flex-1 font-outfit text-app text-[1.1875rem] font-medium">
        {label}
      </Text>
      <View className="h-9 w-9 rounded-2xl items-center justify-center" style={{ backgroundColor: `${accentColor}12` }}>
        <Feather name="chevron-right" size={18} color={accentColor} />
      </View>
    </TouchableOpacity>
  );
}
