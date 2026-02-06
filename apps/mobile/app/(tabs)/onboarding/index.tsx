import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function OnboardingScreen() {
  return (
    <View className="flex-1 bg-app px-6 py-12">
      <View className="flex-1 justify-center gap-6">
        <Text className="text-7xl text-start font-melodrama-bold text-app">
          Welcome to the football coaching app
        </Text>
        <Text className="text-2xl text-start font-outfit text-secondary">
          Manage Athlete fitness and development
        </Text>
      </View>

      <Pressable
        onPress={() => router.push("/(tabs)/onboarding/register")}
        className="w-full border border-app h-14 rounded-xl items-center justify-center"
      >
        <Text className="text-app font-bold text-lg font-outfit">
          Register an Athlete
        </Text>
      </Pressable>
    </View>
  );
}
