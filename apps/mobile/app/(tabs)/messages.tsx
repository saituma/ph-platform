import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MessagesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView
        onRefresh={async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-1 items-center justify-center">
          <Text className="text-2xl font-clash text-app">Messages</Text>
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}
