import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { apiRequest } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
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

  const categories: Array<{
    id: string;
    label: string;
    description: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
  }> = [
    { id: "Bug Report", label: "Bug Report", description: "Something broken", icon: "bug-outline" },
    { id: "Feature Request", label: "Feature", description: "New idea", icon: "bulb-outline" },
    { id: "General Feedback", label: "Feedback", description: "General thoughts", icon: "chatbubbles-outline" },
    { id: "Other", label: "Other", description: "Anything else", icon: "ellipsis-horizontal-circle-outline" },
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
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 32,
            }}
          >
            {categories.map((cat) => {
              const isActive = category === cat.id;
              const iconBg = isActive
                ? "rgba(255,255,255,0.18)"
                : isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(15,23,42,0.04)";
              const iconColor = isActive ? "#fff" : colors.accent;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={({ pressed }) => ({
                    flexBasis: "47%",
                    flexGrow: 1,
                    minHeight: 96,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    backgroundColor: isActive ? colors.accent : cardBg,
                    borderColor: isActive ? colors.accent : cardBorder,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    overflow: "hidden",
                  })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: iconBg,
                      }}
                    >
                      <Ionicons name={cat.icon} size={18} color={iconColor} />
                    </View>
                    {isActive ? (
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(255,255,255,0.22)",
                        }}
                      >
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    ) : null}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: fonts.bodyBold,
                      fontSize: 14,
                      color: isActive ? "#fff" : textPrimary,
                    }}
                  >
                    {cat.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: "Outfit",
                      fontSize: 11,
                      marginTop: 2,
                      color: isActive ? "rgba(255,255,255,0.8)" : labelColor,
                    }}
                  >
                    {cat.description}
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

          <Pressable
            disabled={!feedback.trim() || isSending}
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
            style={{ opacity: (!feedback.trim() || isSending) ? 0.6 : 1 }}
          >
            <View
              style={{
                height: 56,
                borderRadius: 20,
                backgroundColor: colors.accent,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <Ionicons name="send-outline" size={20} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: "ClashDisplay-Bold", fontSize: 16 }}>
                {isSending ? "Sending…" : "Send Feedback"}
              </Text>
            </View>
          </Pressable>
        </ThemedScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
