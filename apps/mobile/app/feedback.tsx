import { ActionButton } from "@/components/dashboard/ActionButton";
import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { apiRequest } from "@/lib/api";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { useAppSelector } from "@/store/hooks";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { fonts } from "@/constants/theme";

export default function FeedbackScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState("Bug Report");
  const [isSending, setIsSending] = useState(false);

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : colors.card;
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.06)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";
  const textPrimary = isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)";

  const categories = [
    "Bug Report",
    "Feature Request",
    "General Feedback",
    "Other",
  ];

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
      <MoreStackHeader
        title="Send Feedback"
        subtitle="Tell us what feels great, what feels broken, and what you want next."
        badge="Feedback"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
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
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 28, fontFamily: "TelmaBold", color: textPrimary, marginBottom: 8 }}>
              We value your input
            </Text>
            <Text style={{ fontSize: 15, fontFamily: "Outfit", color: labelColor, lineHeight: 22 }}>
              Help us improve the coaching experience by sharing your thoughts
              or reporting issues.
            </Text>
          </View>

          <Text
            style={{
              fontSize: 11,
              fontFamily: fonts.bodyBold,
              color: labelColor,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              marginBottom: 16,
              marginLeft: 8,
            }}
          >
            Select Category
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 32 }}>
            {categories.map((cat) => {
              const isActive = category === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 52,
                    borderRadius: 14,
                    borderWidth: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 8,
                    backgroundColor: isActive ? colors.accent : cardBg,
                    borderColor: isActive ? colors.accent : cardBorder,
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  <Text
                    numberOfLines={2}
                    style={{
                      fontFamily: fonts.bodyBold,
                      fontSize: 11,
                      textAlign: "center",
                      color: isActive ? "#fff" : textPrimary,
                    }}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text
            style={{
              fontSize: 11,
              fontFamily: fonts.bodyBold,
              color: labelColor,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              marginBottom: 16,
              marginLeft: 8,
            }}
          >
            Your Message
          </Text>
          <View
            style={{
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: cardBorder,
              borderRadius: 20,
              padding: 20,
              marginBottom: 32,
              minHeight: 200,
            }}
          >
            <TextInput
              multiline
              placeholder="What's on your mind?..."
              placeholderTextColor={labelColor}
              value={feedback}
              onChangeText={setFeedback}
              style={{
                fontFamily: "Outfit",
                color: textPrimary,
                fontSize: 15,
                textAlignVertical: "top",
              }}
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
    </View>
  );
}
