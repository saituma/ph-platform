import { ActionButton } from "@/components/dashboard/ActionButton";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRefreshContext } from "@/context/RefreshContext";
import { useRole } from "@/context/RoleContext";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MoreScreen() {
  const { role } = useRole();
  const router = useRouter();
  const { isLoading } = useRefreshContext();
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
            <Animated.Text
              entering={FadeInDown.delay(100).springify()}
              className="text-4xl font-clash text-app tracking-tight"
            >
              Settings
            </Animated.Text>
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <ThemeToggle />
            </Animated.View>
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
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              className="flex-row items-center gap-5 mb-8"
            >
              <View className="h-16 w-16 bg-secondary rounded-full items-center justify-center border border-app shadow-sm relative">
                <Feather name="user" size={28} className="text-secondary" />
                <View className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-white" />
              </View>
              <View>
                <Text className="text-xl font-bold font-clash text-app leading-tight">
                  John Doe
                </Text>
                <Text className="text-secondary font-outfit text-sm mt-0.5">
                  john.doe@example.com
                </Text>
              </View>
            </Animated.View>
          )}

          {!isLoading && (
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <RoleSwitcher />
            </Animated.View>
          )}
        </View>

        <View className="px-6 gap-6">
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
              <Animated.View entering={FadeInDown.delay(400).springify()}>
                <Text className="text-xs font-bold font-outfit text-gray-400 uppercase mb-3 ml-2 tracking-wider">
                  Account
                </Text>
                <View className="bg-input rounded-3xl overflow-hidden shadow-sm border border-app">
                  <MenuItem
                    icon="user"
                    label="Profile Information"
                    isLast={false}
                    onPress={() => router.navigate("/profile-settings")}
                  />
                  {role === "Guardian" && (
                    <MenuItem
                      icon="credit-card"
                      label="Subscription Plan"
                      isLast={false}
                      onPress={() => router.navigate("/plans")}
                    />
                  )}
                  <MenuItem
                    icon="bell"
                    label="Notifications"
                    isLast={false}
                    onPress={() => router.navigate("/notifications")}
                  />
                  <MenuItem
                    icon="lock"
                    label="Privacy & Security"
                    isLast={true}
                    onPress={() => router.navigate("/privacy-security")}
                  />
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(500).springify()}>
                <Text className="text-xs font-bold font-outfit text-gray-400 uppercase mb-3 ml-2 tracking-wider">
                  Support & About
                </Text>
                <View className="bg-input rounded-3xl overflow-hidden shadow-sm border border-app">
                  <MenuItem
                    icon="help-circle"
                    label="Help Center"
                    isLast={false}
                    onPress={() => router.navigate("/help-center")}
                  />
                  <MenuItem
                    icon="message-square"
                    label="Send Feedback"
                    isLast={false}
                    onPress={() => router.navigate("/feedback")}
                  />
                  <MenuItem
                    icon="info"
                    label="About App"
                    isLast={true}
                    onPress={() => router.navigate("/about")}
                  />
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(600).springify()}>
                <Text className="text-xs font-bold font-outfit text-gray-400 uppercase mb-3 ml-2 tracking-wider">
                  Legal
                </Text>
                <View className="bg-input rounded-3xl overflow-hidden shadow-sm border border-app">
                  <MenuItem
                    icon="file-text"
                    label="Terms of Service"
                    isLast={false}
                    onPress={() => router.navigate("/terms")}
                  />
                  <MenuItem
                    icon="shield"
                    label="Privacy Policy"
                    isLast={true}
                    onPress={() => router.navigate("/privacy-policy")}
                  />
                </View>
              </Animated.View>
            </>
          )}
          <Animated.View entering={FadeInDown.delay(700).springify()}>
            <ActionButton
              label="Logout"
              icon="log-out"
              color="bg-red-50 dark:bg-red-950/30"
              iconColor="text-red-600 dark:text-red-400"
              onPress={() => {}}
              fullWidth={true}
            />
          </Animated.View>

          <Animated.Text
            entering={FadeInUp.delay(800).springify()}
            className="text-center text-gray-300 font-outfit text-xs mt-2 mb-6"
          >
            Version 1.0.0 (Build 124)
          </Animated.Text>
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  isLast,
  onPress,
}: {
  icon: any;
  label: string;
  isLast: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center p-4 bg-input active:bg-secondary ${!isLast ? "border-b border-app" : ""}`}
    >
      <View className="w-10 h-10 items-center justify-center bg-secondary rounded-full mr-3">
        <Feather name={icon} size={18} className="text-secondary" />
      </View>
      <Text className="flex-1 font-outfit text-app text-[15px] font-medium">
        {label}
      </Text>
      <Feather name="chevron-right" size={16} className="text-secondary" />
    </TouchableOpacity>
  );
}
