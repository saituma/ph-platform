import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text, TextInput } from "@/components/ScaledText";
import { apiRequest } from "@/lib/api";
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
import {
  Check,
  ArrowLeft,
  Upload,
  Send,
  Star,
} from "lucide-react-native";

export default function SubmitTestimonialScreen() {
  const router = useRouter();
  const p = useAdminPastel();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <MoreStackHeader
        title="Submit Testimonial"
        subtitle="Share your progress story and help future athletes feel the value of the platform."
        badge="Community"
        onBack={() => router.replace("/(tabs)/more")}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ThemedScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
          }}
        >
          {isSubmitted ? (
            <View style={{ alignItems: "center", width: "100%" }}>
              <View style={{ height: 80, width: 80, borderRadius: 40, backgroundColor: p.successSoft, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                <Check size={28} color={p.success} />
              </View>
              <Text style={{ fontSize: 28, fontFamily: "Outfit-Bold", color: p.textPrimary, marginBottom: 8, textAlign: "center" }}>
                Thank you!
              </Text>
              <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 22, marginBottom: 32, textAlign: "center" }}>
                Your testimonial has been submitted and is pending review.
              </Text>
              <Pressable onPress={() => router.replace("/(tabs)/more")} style={{ marginTop: 8, width: "100%" }}>
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
                  <ArrowLeft size={18} color={p.buttonPrimaryText} />
                  <Text style={{ color: p.buttonPrimaryText, fontFamily: "Outfit-Bold", fontSize: 16 }}>
                    Back to More
                  </Text>
                </View>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 28, fontFamily: "Outfit-Bold", color: p.textPrimary, marginBottom: 8 }}>
                Share your experience
              </Text>
              <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 22, marginBottom: 24 }}>
                Submit a quick testimonial and we&apos;ll review it for the
                homepage.
              </Text>

              <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: p.textSecondary, textTransform: "uppercase", marginBottom: 16, marginLeft: 8, letterSpacing: 1.2 }}>
                Testimony
              </Text>
              <View style={{ backgroundColor: p.inputBg, borderRadius: 24, padding: 20, marginBottom: 24, minHeight: 160 }}>
                <TextInput
                  multiline
                  placeholder="Tell us about your results..."
                  placeholderTextColor={p.textMuted}
                  value={quote}
                  onChangeText={setQuote}
                  style={{ fontFamily: "Outfit-Regular", color: p.textPrimary, fontSize: 15, textAlignVertical: "top" }}
                />
              </View>

              <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: p.textSecondary, textTransform: "uppercase", marginBottom: 16, marginLeft: 8, letterSpacing: 1.2 }}>
                Rating
              </Text>
              <View style={{ backgroundColor: p.inputBg, borderRadius: 16, padding: 16, marginBottom: 24, flexDirection: "row", alignItems: "center", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setRating(i)}
                    style={{ padding: 4 }}
                  >
                    <Star
                      size={28}
                      color={i <= rating ? "#F59E0B" : p.textMuted}
                      fill={i <= rating ? "#F59E0B" : "transparent"}
                      style={{ opacity: i <= rating ? 1 : 0.25 }}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: p.textSecondary, textTransform: "uppercase", marginBottom: 16, marginLeft: 8, letterSpacing: 1.2 }}>
                Photo (optional)
              </Text>
              <View style={{ backgroundColor: p.inputBg, borderRadius: 24, padding: 20, marginBottom: 24 }}>
                <TouchableOpacity
                  onPress={handlePickPhoto}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                >
                  <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textPrimary }}>
                    {photoMeta ? "Replace Photo" : "Upload Photo"}
                  </Text>
                  <Upload size={18} color={p.accent} />
                </TouchableOpacity>
                {photoMeta ? (
                  <View style={{ marginTop: 16, width: 160, aspectRatio: 3 / 4, borderRadius: 16, overflow: "hidden" }}>
                    <Image
                      source={{ uri: photoMeta.uri }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </View>
                ) : null}
              </View>

              {error ? (
                <View style={{ marginBottom: 24, borderRadius: 16, backgroundColor: p.dangerSoft, padding: 16 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.danger }}>
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
                    borderRadius: 100,
                    backgroundColor: p.accent,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <Send size={18} color={p.buttonPrimaryText} />
                  <Text style={{ color: p.buttonPrimaryText, fontFamily: "Outfit-Bold", fontSize: 16 }}>
                    {isSubmitting ? "Submitting..." : "Submit Testimonial"}
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
