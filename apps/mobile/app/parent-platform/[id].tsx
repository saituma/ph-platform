import React, { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Film,
  ImageIcon,
  ExternalLink,
  ChevronRight,
} from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { apiRequest } from "@/lib/api";
import { getParentContentCache } from "@/lib/parentContentCache";
import { useAppSelector } from "@/store/hooks";
import { isYoutubeUrl, VideoPlayer } from "@/components/media/VideoPlayer";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";

const MODULE_COLORS = ["cardMint", "cardPeach", "cardLavender", "cardPink", "cardYellow", "cardSage"] as const;

function AutoImage({
  uri,
  borderRadius = 0,
  style,
}: {
  uri: string;
  borderRadius?: number;
  style?: object;
}) {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  return (
    <ExpoImage
      source={{ uri }}
      style={[{ width: "100%", aspectRatio, borderRadius }, style]}
      contentFit="cover"
      onLoad={(e) => {
        const { width, height } = e.source;
        if (width > 0 && height > 0) setAspectRatio(width / height);
      }}
    />
  );
}

type ParentCourseModule = {
  id: string;
  title: string;
  type: "article" | "video" | "pdf" | "faq";
  content?: string;
  mediaUrl?: string;
  order: number;
  preview?: boolean;
};

type ParentCourseItem = {
  id: number;
  title: string;
  summary: string;
  description?: string | null;
  coverImage?: string | null;
  category?: string | null;
  programTier?: string | null;
  modules: ParentCourseModule[];
  isPreview?: boolean;
};

function getModuleIcon(type: string) {
  switch (type) {
    case "video": return Film;
    case "pdf": return FileText;
    case "faq": return BookOpen;
    default: return BookOpen;
  }
}

export default function ParentCourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const idValue = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const p = useAdminPastel();
  const { token } = useAppSelector((state) => state.user);
  const { isSectionHidden } = useAgeExperience();

  const cached = Number.isFinite(Number(idValue))
    ? getParentContentCache(Number(idValue))
    : null;
  const [item, setItem] = useState<ParentCourseItem | null>(
    cached as ParentCourseItem | null,
  );
  const [isLoading, setIsLoading] = useState(!cached);

  if (isSectionHidden("parentPlatform")) {
    return <AgeGate title="Parent platform locked" message="Parent education content is restricted for this age." />;
  }

  const modules = useMemo(() => {
    return (item?.modules ?? [])
      .map((module, index) => ({
        ...module,
        order: Number.isFinite(module.order) ? module.order : index,
      }))
      .sort((a, b) => a.order - b.order);
  }, [item]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token || !idValue) return;
      try {
        const data = await apiRequest<{ item: ParentCourseItem }>(
          `/content/parent-courses/${idValue}`,
          { token },
        );
        if (mounted) setItem(data.item ?? null);
      } catch {
        if (mounted) setItem(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [idValue, token]);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timeout);
  }, []);

  const openMedia = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => undefined);
  };

  const openDocument = async (url?: string) => {
    if (!url) return;
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch {
      Linking.openURL(url).catch(() => undefined);
    }
  };

  const isPdfUrl = (url?: string) =>
    typeof url === "string" && /\.pdf(\?|#|$)/i.test(url);
  const isVideoUrl = (url?: string) =>
    typeof url === "string" && /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(url);
  const isImageDataUrl = (url?: string) =>
    typeof url === "string" && url.startsWith("data:image/");
  const isImageUrl = (url?: string) =>
    typeof url === "string" &&
    (/\.(jpg|jpeg|png|gif|webp|heic|avif|bmp)(\?|#|$)/i.test(url) ||
      url.startsWith("data:image/"));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => router.replace("/parent-platform")}
            style={{
              height: 40,
              width: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: p.cardWhite,
              borderRadius: 14,
            }}
          >
            <ArrowLeft size={18} color={p.textSecondary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontFamily: "Outfit-SemiBold", color: p.textPrimary }}>
            Course
          </Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 24, gap: 14 }}>
            {[1, 2, 3].map((row) => (
              <View
                key={row}
                style={{
                  borderRadius: 22,
                  backgroundColor: p.cardWhite,
                  padding: 20,
                }}
              >
                <View style={{ height: 14, width: 140, borderRadius: 100, backgroundColor: p.inputBg }} />
                <View style={{ height: 12, width: "100%", borderRadius: 100, backgroundColor: p.inputBg, marginTop: 14 }} />
                <View style={{ height: 12, width: "60%", borderRadius: 100, backgroundColor: p.inputBg, marginTop: 10 }} />
              </View>
            ))}
          </View>
        ) : item ? (
          <View style={{ gap: 16 }}>
            {/* Cover + info card */}
            <Animated.View entering={FadeInDown.duration(380)} style={{ paddingHorizontal: 24 }}>
              <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, overflow: "hidden" }}>
                {item.coverImage ? (
                  <AutoImage uri={item.coverImage} />
                ) : (
                  <View style={{ width: "100%", aspectRatio: 2.2, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
                    <BookOpen size={40} color={p.accent} strokeWidth={1.5} />
                  </View>
                )}
                <View style={{ padding: 20, gap: 12 }}>
                  {item.category ? (
                    <View style={{ alignSelf: "flex-start", backgroundColor: p.cardMint, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.accent, textTransform: "uppercase", letterSpacing: 1.2 }}>
                        {item.category}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={{ fontSize: 26, fontFamily: "Outfit-Bold", color: p.textPrimary, lineHeight: 32 }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 23 }}>
                    {item.summary}
                  </Text>
                  {item.description ? (
                    <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 23 }}>
                      {item.description}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.accent }} />
                    <Text style={{ fontFamily: "Outfit-Medium", fontSize: 12, color: p.textMuted }}>
                      {modules.length} module{modules.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Modules */}
            <View style={{ paddingHorizontal: 24, gap: 12 }}>
              <Animated.View entering={FadeInDown.delay(100).duration(350)}>
                <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", letterSpacing: 1.6, textTransform: "uppercase", color: p.textMuted, marginLeft: 2, marginBottom: 4 }}>
                  Modules
                </Text>
              </Animated.View>
              {modules.length ? (
                modules.map((module, idx) => {
                  const ModIcon = getModuleIcon(module.type);
                  const colorKey = MODULE_COLORS[idx % MODULE_COLORS.length];
                  return (
                    <Animated.View
                      key={module.id}
                      entering={FadeInDown.delay(140 + idx * 60).duration(350)}
                    >
                      <View
                        style={{ borderRadius: 20, backgroundColor: p.cardWhite, padding: 18, gap: 12 }}
                      >
                        {/* Module header */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                          <View
                            style={{
                              height: 40,
                              width: 40,
                              borderRadius: 13,
                              backgroundColor: p[colorKey],
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <ModIcon size={18} color={p.accent} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                              {module.title}
                            </Text>
                            <Text style={{ fontSize: 10, fontFamily: "Outfit-Medium", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
                              {module.type}
                            </Text>
                          </View>
                          {(module.type === "pdf" || isPdfUrl(module.mediaUrl)) && module.mediaUrl ? (
                            <TouchableOpacity
                              onPress={() => openDocument(module.mediaUrl)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 5,
                                borderRadius: 100,
                                backgroundColor: p.accentSoft,
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                              }}
                            >
                              <ExternalLink size={12} color={p.accent} />
                              <Text style={{ color: p.accent, fontSize: 12, fontFamily: "Outfit-Bold" }}>
                                PDF
                              </Text>
                            </TouchableOpacity>
                          ) : module.mediaUrl &&
                            !isImageUrl(module.mediaUrl) &&
                            !isVideoUrl(module.mediaUrl) &&
                            !isYoutubeUrl(module.mediaUrl) ? (
                            <TouchableOpacity
                              onPress={() => openMedia(module.mediaUrl)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 5,
                                borderRadius: 100,
                                backgroundColor: p.accentSoft,
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                              }}
                            >
                              <ExternalLink size={12} color={p.accent} />
                              <Text style={{ color: p.accent, fontSize: 12, fontFamily: "Outfit-Bold" }}>
                                Open
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        {/* Video */}
                        {(module.type === "video" ||
                          isYoutubeUrl(module.mediaUrl) ||
                          isVideoUrl(module.mediaUrl)) &&
                        module.mediaUrl ? (
                          <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: p.inputBg }}>
                            {isYoutubeUrl(module.mediaUrl) ? (
                              <VideoPlayer uri={module.mediaUrl} ignoreTabFocus />
                            ) : isImageDataUrl(module.mediaUrl) ? (
                              <View style={{ padding: 16 }}>
                                <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                                  Video file not detected. Please upload an .mp4 or YouTube link.
                                </Text>
                              </View>
                            ) : (
                              <VideoPlayer uri={module.mediaUrl} title={module.title} useVideoResolution ignoreTabFocus />
                            )}
                          </View>
                        ) : null}

                        {/* Image */}
                        {isImageUrl(module.mediaUrl) ? (
                          <View style={{ borderRadius: 16, overflow: "hidden" }}>
                            <AutoImage uri={module.mediaUrl!} borderRadius={16} />
                          </View>
                        ) : null}

                        {/* Content text */}
                        {module.content ? (
                          <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 23 }}>
                            {module.content}
                          </Text>
                        ) : null}
                      </View>
                    </Animated.View>
                  );
                })
              ) : (
                <View style={{ borderRadius: 20, borderWidth: 1, borderStyle: "dashed", borderColor: p.divider, padding: 20, alignItems: "center", gap: 8 }}>
                  <BookOpen size={24} color={p.textMuted} />
                  <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                    No modules available yet.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24 }}>
            <View style={{ borderRadius: 20, backgroundColor: p.cardPeach, padding: 24, alignItems: "center", gap: 10 }}>
              <BookOpen size={28} color={p.textMuted} />
              <Text style={{ fontSize: 16, fontFamily: "Outfit-SemiBold", color: p.textPrimary }}>
                Course not found
              </Text>
              <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center" }}>
                This course may have been removed or is no longer available.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
