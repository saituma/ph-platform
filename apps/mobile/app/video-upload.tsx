import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { canAccessTier } from "@/lib/planAccess";
import { VideoUploadPanel } from "@/components/programs/ProgramPanels";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VideoUploadScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const programTier = useAppSelector((state) => state.user.programTier);
  const canUploadVideo = canAccessTier(programTier ?? null, "PHP_Premium");

  if (!canUploadVideo) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-app">
          <TouchableOpacity
            onPress={() => router.navigate("/(tabs)/more")}
            className="h-10 w-10 items-center justify-center bg-secondary rounded-full"
          >
            <Feather name="arrow-left" size={20} className="text-app" />
          </TouchableOpacity>
          <Text className="text-xl font-clash text-app font-bold">
            Video Upload
          </Text>
          <View className="w-10" />
        </View>

        <View className="flex-1 items-center justify-center px-6 pb-12">
          <View className="items-center max-w-[340px]">
            <View className="mb-10 h-20 w-20 rounded-3xl bg-accent/10 items-center justify-center border border-accent/20">
              <Feather name="video" size={28} className="text-accent" />
            </View>
            <Text className="text-3xl font-clash font-bold text-app text-center mb-3">
              Video Upload Locked
            </Text>
            <Text className="text-[15px] font-outfit text-center text-secondary leading-relaxed max-w-[280px] mb-10">
              Video review is available for PHP Premium members only.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/plans")}
              className="w-full bg-accent py-4 rounded-2xl active:opacity-90 shadow-lg shadow-accent/20"
            >
              <Text className="text-white font-bold text-base text-center">
                Upgrade to Unlock
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-app">
        <TouchableOpacity
          onPress={() => router.navigate("/(tabs)/more")}
          className="h-10 w-10 items-center justify-center bg-secondary rounded-full"
        >
          <Feather name="arrow-left" size={20} className="text-app" />
        </TouchableOpacity>
        <Text className="text-xl font-clash text-app font-bold">
          Video Upload
        </Text>
        <View className="w-10" />
      </View>

      <ThemedScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
      >
        <View className="mb-4">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text className="text-3xl font-clash text-app">
              Coach Video Review
            </Text>
          </View>
          <Text className="text-base font-outfit text-secondary">
            Upload a training clip and track your coach’s feedback.
          </Text>
        </View>

        <VideoUploadPanel />
      </ThemedScrollView>
    </SafeAreaView>
  );
}
