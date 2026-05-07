import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { apiRequest } from "@/lib/api";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text, TextInput } from "@/components/ScaledText";
import { useAppToast } from "@/hooks/useAppToast";
import { useAppSelector } from "@/store/hooks";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import {
  Bug,
  Lightbulb,
  MessageCircle,
  MoreHorizontal,
  Check,
  Send,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

export default function FeedbackScreen() {
  const router = useRouter();
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);
  const toast = useAppToast();
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState("Bug Report");
  const [isSending, setIsSending] = useState(false);

  const categories: Array<{
    id: string;
    label: string;
    description: string;
    Icon: LucideIcon;
  }> = [
    { id: "Bug Report", label: "Bug Report", description: "Something broken", Icon: Bug },
    { id: "Feature Request", label: "Feature", description: "New idea", Icon: Lightbulb },
    { id: "General Feedback", label: "Feedback", description: "General thoughts", Icon: MessageCircle },
    { id: "Other", label: "Other", description: "Anything else", Icon: MoreHorizontal },
  ];

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: p.pageBg }}>
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
            <Text style={{ fontSize: 28, fontFamily: "Outfit-Bold", color: p.textPrimary, marginBottom: 8 }}>
              We value your input
            </Text>
            <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 22 }}>
              Help us improve the coaching experience by sharing your thoughts
              or reporting issues.
            </Text>
          </View>

          <Text
            style={{
              fontSize: 11,
              fontFamily: "Outfit-Bold",
              color: p.textSecondary,
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
                : p.accentSoft;
              const iconColor = isActive ? p.buttonPrimaryText : p.accent;
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
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    backgroundColor: isActive ? p.accent : p.cardWhite,
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
                      <cat.Icon size={18} color={iconColor} />
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
                        <Check size={14} color={p.buttonPrimaryText} />
                      </View>
                    ) : null}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: "Outfit-Bold",
                      fontSize: 14,
                      color: isActive ? p.buttonPrimaryText : p.textPrimary,
                    }}
                  >
                    {cat.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: "Outfit-Regular",
                      fontSize: 11,
                      marginTop: 2,
                      color: isActive ? "rgba(255,255,255,0.8)" : p.textMuted,
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
              fontFamily: "Outfit-Bold",
              color: p.textSecondary,
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
              backgroundColor: p.inputBg,
              borderRadius: 20,
              padding: 20,
              marginBottom: 32,
              minHeight: 200,
            }}
          >
            <TextInput
              multiline
              placeholder="What's on your mind?..."
              placeholderTextColor={p.textMuted}
              value={feedback}
              onChangeText={setFeedback}
              style={{
                fontFamily: "Outfit-Regular",
                color: p.textPrimary,
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
                toast.warning("Sign in required", "Please sign in to send feedback.");
                return;
              }
              setIsSending(true);
              try {
                await apiRequest("/support/app-feedback", {
                  method: "POST",
                  token,
                  body: { category, message: body },
                });
                toast.success("Thank you", "Your message was sent to the team.");
                setFeedback("");
                setTimeout(() => router.canGoBack() ? router.back() : router.replace("/(tabs)/more"), 600);
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
                toast.error("Could not send", msg);
              } finally {
                setIsSending(false);
              }
            }}
            style={{ opacity: (!feedback.trim() || isSending) ? 0.6 : 1 }}
          >
            <View
              style={{
                height: 56,
                borderRadius: 100,
                backgroundColor: p.accent,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <Send size={20} color={p.buttonPrimaryText} />
              <Text style={{ color: p.buttonPrimaryText, fontFamily: "Outfit-Bold", fontSize: 16 }}>
                {isSending ? "Sending..." : "Send Feedback"}
              </Text>
            </View>
          </Pressable>
        </ThemedScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
