import { ActionButton } from "@/components/dashboard/ActionButton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FeedbackScreen() {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState("Bug Report");

  const categories = [
    "Bug Report",
    "Feature Request",
    "General Feedback",
    "Other",
  ];

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
          Send Feedback
        </Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ThemedScrollView
          onRefresh={async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
          }}
        >
          <View className="mb-8">
            <Text className="text-3xl font-clash text-app mb-2">
              We value your input
            </Text>
            <Text className="text-base font-outfit text-secondary leading-relaxed">
              Help us improve the coaching experience by sharing your thoughts
              or reporting issues.
            </Text>
          </View>

          <Text className="text-xs font-bold font-outfit text-gray-400 uppercase mb-4 ml-2 tracking-wider">
            Select Category
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                className={`px-6 py-3 rounded-2xl border ${
                  category === cat
                    ? "bg-accent border-accent"
                    : "bg-input border-app"
                }`}
              >
                <Text
                  className={`font-outfit font-bold ${
                    category === cat ? "text-white" : "text-app"
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-xs font-bold font-outfit text-gray-400 uppercase mb-4 ml-2 tracking-wider">
            Your Message
          </Text>
          <View className="bg-input border border-app rounded-3xl p-5 mb-8 shadow-inner min-h-[200px]">
            <TextInput
              multiline
              placeholder="What's on your mind?..."
              placeholderTextColor="#94a3b8"
              value={feedback}
              onChangeText={setFeedback}
              className="font-outfit text-app text-base"
              style={{ textAlignVertical: "top" }}
            />
          </View>

          <ActionButton
            label="Send Feedback"
            onPress={() => router.navigate("/(tabs)/more")}
            color="bg-accent"
            icon="send"
            disabled={!feedback.trim()}
            fullWidth={true}
          />
        </ThemedScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
