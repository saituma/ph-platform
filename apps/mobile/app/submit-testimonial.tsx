import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { apiRequest } from "@/lib/api";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "@/store/hooks";

export default function SubmitTestimonialScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { token } = useAppSelector((state) => state.user);
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);
  const [photoMeta, setPhotoMeta] = useState<{
    uri: string;
    fileName: string;
    mimeType: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean(quote.trim()) && !isSubmitting;
  }, [quote, isSubmitting]);


  const uploadPhoto = async (payload: {
    uri: string;
    fileName: string;
    mimeType: string;
  }) => {
    if (!token) throw new Error("Authentication required");
    const fileName =
      payload.fileName ||
      payload.uri.split("/").pop() ||
      `testimonial-${Date.now()}.jpg`;
    const contentType = payload.mimeType || "image/jpeg";
    const blob = await (await fetch(payload.uri)).blob();
    const presign = await apiRequest<{ uploadUrl: string; publicUrl: string }>(
      "/media/presign",
      {
        method: "POST",
        token,
        body: {
          folder: "testimonials",
          fileName,
          contentType,
          sizeBytes: blob.size,
        },
      },
    );
    await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    return presign.publicUrl;
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.9,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    const uri = asset.uri;
    const fileName =
      asset.fileName || uri.split("/").pop() || `testimonial-${Date.now()}.jpg`;
    const mimeType = asset.mimeType || "image/jpeg";
    setPhotoMeta({ uri, fileName, mimeType });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      let mediaUrl: string | undefined;
      if (photoMeta) {
        mediaUrl = await uploadPhoto(photoMeta);
      }
      await apiRequest("/content/testimonials/submit", {
        method: "POST",
        token,
        body: {
          quote: quote.trim(),
          rating,
          photoUrl: mediaUrl,
        },
      });
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit testimonial.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <MoreStackHeader
        title="Submit Testimonial"
        subtitle="Share your progress story and help future athletes feel the value of the platform."
        badge="Community"
        onBack={() => router.replace("/(tabs)/more")}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ThemedScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
          }}
        >
          {isSubmitted ? (
            <View className="items-center w-full">
              <View className="h-20 w-20 rounded-full bg-accent/10 items-center justify-center mb-6">
                <Feather name="check" size={28} color={colors.accent} />
              </View>
              <Text className="text-3xl font-telma-bold text-app mb-2 text-center">
                Thank you!
              </Text>
              <Text className="text-base font-outfit text-secondary leading-relaxed mb-8 text-center">
                Your testimonial has been submitted and is pending review.
              </Text>
              <Pressable onPress={() => router.replace("/(tabs)/more")} style={{ marginTop: 8, width: "100%" }}>
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
                  <Feather name="arrow-left" size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontFamily: "ClashDisplay-Bold", fontSize: 16 }}>
                    Back to More
                  </Text>
                </View>
              </Pressable>
            </View>
          ) : (
            <>
              <Text className="text-3xl font-telma-bold text-app mb-2">
                Share your experience
              </Text>
              <Text className="text-base font-outfit text-secondary leading-relaxed mb-6">
                Submit a quick testimonial and we&apos;ll review it for the
                homepage.
              </Text>

              <Text className="text-xs font-bold font-outfit text-secondary uppercase mb-4 ml-2 tracking-wider">
                Testimony
              </Text>
              <View className="bg-input border border-app rounded-3xl p-5 mb-6 shadow-inner min-h-[160px]">
                <TextInput
                  multiline
                  placeholder="Tell us about your results..."
                  placeholderTextColor={colors.placeholder}
                  value={quote}
                  onChangeText={setQuote}
                  className="font-outfit text-app text-base"
                  style={{ textAlignVertical: "top" }}
                />
              </View>

              <Text className="text-xs font-bold font-outfit text-secondary uppercase mb-4 ml-2 tracking-wider">
                Rating
              </Text>
              <View className="bg-input border border-app rounded-2xl p-4 mb-6 flex-row items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setRating(i)}
                    className="p-1"
                  >
                    <Ionicons
                      name={i <= rating ? "star" : "star-outline"}
                      size={28}
                      color={i <= rating ? "#F59E0B" : colors.textSecondary}
                      style={i <= rating ? { opacity: 1 } : { opacity: 0.25 }}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-xs font-bold font-outfit text-secondary uppercase mb-4 ml-2 tracking-wider">
                Photo (optional)
              </Text>
              <View className="bg-input border border-app rounded-3xl p-5 mb-6">
                <TouchableOpacity
                  onPress={handlePickPhoto}
                  className="flex-row items-center justify-between"
                >
                  <Text className="text-sm font-outfit text-app">
                    {photoMeta ? "Replace Photo" : "Upload Photo"}
                  </Text>
                  <Feather name="upload" size={18} color={colors.accent} />
                </TouchableOpacity>
                {photoMeta ? (
                  <View className="mt-4 w-40 aspect-[3/4] rounded-2xl overflow-hidden border border-app">
                    <Image
                      source={{ uri: photoMeta.uri }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </View>
                ) : null}
              </View>

              {error ? (
                <View className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
                  <Text className="text-sm font-outfit text-red-400">
                    {error}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                style={{ marginTop: 8, width: "100%", opacity: (!canSubmit || isSubmitting) ? 0.6 : 1 }}
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
                  <Feather name="send" size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontFamily: "ClashDisplay-Bold", fontSize: 16 }}>
                    {isSubmitting ? "Submitting…" : "Submit Testimonial"}
                  </Text>
                </View>
              </Pressable>
            </>
          )}
        </ThemedScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
