import { ActionButton } from "@/components/dashboard/ActionButton";
import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { apiRequest } from "@/lib/api";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { useAppSelector } from "@/store/hooks";

export default function FeedbackScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const token = useAppSelector((s) => s.user.token);
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState("Bug Report");
  const [isSending, setIsSending] = useState(false);

  const categories = [
    "Bug Report",
    "Feature Request",
    "General Feedback",
    "Other",
  ];

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <MoreStackHeader
        title="Send Feedback"
        subtitle="Tell us what feels great, what feels broken, and what you want next."
        badge="Feedback"
      />

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
            <Text className="text-3xl font-telma-bold text-app mb-2">
              We value your input
            </Text>
            <Text className="text-base font-outfit text-secondary leading-relaxed">
              Help us improve the coaching experience by sharing your thoughts
              or reporting issues.
            </Text>
          </View>

          <Text className="text-xs font-bold font-outfit text-secondary uppercase mb-4 ml-2 tracking-wider">
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

          <Text className="text-xs font-bold font-outfit text-secondary uppercase mb-4 ml-2 tracking-wider">
            Your Message
          </Text>
          <View className="bg-input border border-app rounded-3xl p-5 mb-8 shadow-inner min-h-[200px]">
            <TextInput
              multiline
              placeholder="What's on your mind?..."
              placeholderTextColor={colors.placeholder}
              value={feedback}
              onChangeText={setFeedback}
              className="font-outfit text-app text-base"
              style={{ textAlignVertical: "top" }}
            />
          </View>

          <ActionButton
            label={isSending ? "Sending…" : "Send Feedback"}
            onPress={async () => {
              const body = feedback.trim();
              if (!body || isSending) return;
              if (!token) {
                Alert.alert("Sign in required", "Please sign in to send feedback.");
                return;
              }
              setIsSending(true);
              try {
                await apiRequest("/support/app-feedback", {
                  method: "POST",
                  token,
                  body: { category, message: body },
                });
                Alert.alert("Thank you", "Your message was sent to the team.", [
                  { text: "OK", onPress: () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/more")) },
                ]);
                setFeedback("");
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
                Alert.alert("Could not send", msg);
              } finally {
                setIsSending(false);
              }
            }}
            color="bg-accent"
            icon="send"
            disabled={!feedback.trim() || isSending}
            fullWidth={true}
          />
        </ThemedScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}