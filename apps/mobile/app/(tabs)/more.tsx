import { ActionButton } from "@/components/dashboard/ActionButton";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRefreshContext } from "@/context/RefreshContext";
import { useRole } from "@/context/RoleContext";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@/components/ui/theme-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, InteractionManager, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { logout } from "../../store/slices/userSlice";
import { Text } from "@/components/ScaledText";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export default function MoreScreen() {
  const { role } = useRole();
  const { colors } = useAppTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { profile, isAuthenticated } = useAppSelector((state) => state.user);
  const { isLoading } = useRefreshContext();
  const transition = useSharedValue(1);
  const [isSwitching, setIsSwitching] = useState(false);

  const openParentPlatform = () => {
    router.push("/parent-platform");
  };

  useEffect(() => {
    transition.value = 0;
    transition.value = withTiming(1, {
      duration: 140,
      easing: Easing.out(Easing.cubic),
    });
    setIsSwitching(true);
    const timer = setTimeout(() => setIsSwitching(false), 220);
    return () => clearTimeout(timer);
  }, [role, transition]);

  const transitionStyle = useAnimatedStyle(() => ({
    opacity: transition.value,
    transform: [{ translateY: (1 - transition.value) * 10 }],
  }));
  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Refreshed More Screen");
  };

  return (
    <SafeAreaView className="flex-1 bg-app">
      <ThemedScrollView
        onRefresh={handleRefresh}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-6 pt-6 pb-8 bg-input rounded-b-[40px] shadow-sm mb-6">
          <View className="flex-row items-center justify-between mb-8">
            <View className="flex-row items-center gap-3">
              <View className="h-6 w-1.5 rounded-full bg-accent" />
              <Text className="text-4xl font-clash text-app tracking-tight">
                Settings
              </Text>
            </View>
            <View>
              <ThemeToggle />
            </View>
          </View>

          {isLoading ? (
            <View className="flex-row items-center gap-5 mb-8">
              <Skeleton circle width={64} height={64} />
              <View className="flex-1 gap-2">
                <Skeleton width="60%" height={24} />
                <Skeleton width="40%" height={16} />
              </View>
            </View>
          ) : (
            <View className="flex-row items-center gap-5 mb-8">
              {profile.avatar ? (
                <View className="h-16 w-16 rounded-full overflow-hidden border border-app shadow-sm relative">
                  <Image source={{ uri: profile.avatar }} style={{ width: 64, height: 64 }} />
                  <View className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-white" />
                </View>
              ) : (
                <View className="h-16 w-16 bg-secondary rounded-full items-center justify-center border border-app shadow-sm relative">
                  <Feather name="user" size={28} color={colors.accent} />
                  <View className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-white" />
                </View>
              )}
              <View>
                <Text className="text-xl font-bold font-clash text-app leading-tight">
                  {profile.name || "Profile"}
                </Text>
                <Text className="text-secondary font-outfit text-sm mt-0.5">
                  {profile.email || (isAuthenticated ? "Email unavailable" : "Not signed in")}
                </Text>
              </View>
            </View>
          )}

          {!isLoading && (
            <View>
              <RoleSwitcher />
            </View>
          )}
        </View>

        <Animated.View className="px-6 gap-6" style={transitionStyle}>
          {isSwitching ? (
            <View className="mb-2 flex-row items-center gap-3 rounded-2xl border border-app/20 bg-white/5 px-4 py-3">
              <ActivityIndicator size="small" color="#9CA3AF" />
              <Text className="text-sm font-outfit text-secondary">
                Switching to {role === "Guardian" ? "Guardian" : "Athlete"}…
              </Text>
            </View>
          ) : null}
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
                <View className="bg-input rounded-3xl overflow-hidden shadow-sm border border-app">
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
                  <MenuItem
                    icon="book"
                    label="Parent Platform"
                    isLast={false}
                    onPress={openParentPlatform}
                    accentColor={colors.accent}
                  />
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
                <View className="bg-input rounded-3xl overflow-hidden shadow-sm border border-app">
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
                <View className="bg-input rounded-3xl overflow-hidden shadow-sm border border-app">
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
              iconColor="text-black"
              onPress={() => {
                dispatch(logout());
                router.replace("/(auth)/login");
              }}
              fullWidth={true}
            />
          </View>

          <Text className="text-center text-gray-300 font-outfit text-xs mt-2 mb-6">
            Version 1.0.0 (Build 124)
          </Text>
        </Animated.View>
      </ThemedScrollView>
    </SafeAreaView>
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
      className={`flex-row items-center px-6 py-5 bg-input active:bg-secondary ${!isLast ? "border-b border-app" : ""}`}
    >
      <View className="w-12 h-12 items-center justify-center bg-accent/10 rounded-full mr-4">
        <Feather name={icon} size={22} color={accentColor} />
      </View>
      <Text className="flex-1 font-outfit text-app text-[1.1875rem] font-medium">
        {label}
      </Text>
      <Feather name="chevron-right" size={20} color={`${accentColor}99`} />
    </TouchableOpacity>
  );
}
