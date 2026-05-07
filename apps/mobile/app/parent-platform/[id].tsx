import React, { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { ArrowLeft, BookOpen } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { apiRequest } from "@/lib/api";
import { getParentContentCache } from "@/lib/parentContentCache";
import { useAppSelector } from "@/store/hooks";
import { isYoutubeUrl, VideoPlayer } from "@/components/media/VideoPlayer";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { MarkdownText } from "@/components/ui/MarkdownText";

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

  const lockedTitle = "Parent platform locked";
  const lockedMessage = "Parent education content is restricted for this age.";

  if (isSectionHidden("parentPlatform")) {
    return <AgeGate title={lockedTitle} message={lockedMessage} />;
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
        if (mounted) {
          setItem(data.item ?? null);
        }
      } catch {
        if (mounted) setItem(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [idValue, token]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
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

  const isLocked = false;
  const hasParentProgramAccess = true;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.replace("/parent-platform")}
            style={{
              height: 40,
              width: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: p.cardWhite,
              borderRadius: 16,
            }}
          >
            <ArrowLeft size={20} color={p.textSecondary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
            Parent Course
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {isLoading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((row) => (
              <View
                key={row}
                style={{
                  borderRadius: 22,
                  backgroundColor: p.inputBg,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <View style={{ height: 16, width: 160, borderRadius: 100, backgroundColor: p.divider }} />
                <View style={{ height: 12, width: "100%", borderRadius: 100, backgroundColor: p.divider, marginTop: 12 }} />
                <View style={{ height: 12, width: "66%", borderRadius: 100, backgroundColor: p.divider, marginTop: 12 }} />
              </View>
            ))}
          </View>
        ) : item ? (
          <View style={{ gap: 24 }}>
            <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, paddingHorizontal: 24, paddingVertical: 20 }}>
              {item.coverImage ? (
                <AutoImage uri={item.coverImage} borderRadius={16} style={{ marginBottom: 16 }} />
              ) : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 12 }}>
                {item.category ? (
                  <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, backgroundColor: p.accentSoft }}>
                    <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.accent, textTransform: "uppercase", letterSpacing: 1.2 }}>
                      {item.category}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontSize: 28, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 16, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 24, marginTop: 12 }}>
                {item.summary}
              </Text>
              {item.description ? (
                <Text style={{ fontSize: 16, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 24, marginTop: 12 }}>
                  {item.description}
                </Text>
              ) : null}
            </View>

            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 20, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                Course Modules
              </Text>
              {modules.length ? (
                modules.map((module) => (
                  <View
                    key={module.id}
                    style={{ borderRadius: 22, backgroundColor: p.cardWhite, paddingHorizontal: 20, paddingVertical: 16 }}
                  >
                    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
                          <BookOpen size={16} color={p.textSecondary} />
                        </View>
                        <View>
                          <Text style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                            {module.title}
                          </Text>
                          <Text style={{ fontSize: 10, fontFamily: "Outfit-Regular", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.2 }}>
                            {module.type}
                            {module.preview ? " - Preview" : ""}
                          </Text>
                        </View>
                      </View>
                      {(module.type === "pdf" || isPdfUrl(module.mediaUrl)) &&
                      module.mediaUrl ? (
                        <TouchableOpacity
                          onPress={() => openDocument(module.mediaUrl)}
                          style={{ borderRadius: 100, backgroundColor: p.accent, paddingHorizontal: 16, paddingVertical: 8 }}
                        >
                          <Text style={{ color: p.buttonPrimaryText, fontSize: 12, fontFamily: "Outfit-Bold" }}>
                            Open PDF
                          </Text>
                        </TouchableOpacity>
                      ) : module.mediaUrl &&
                        !isImageUrl(module.mediaUrl) &&
                        !isVideoUrl(module.mediaUrl) &&
                        !isYoutubeUrl(module.mediaUrl) ? (
                        <TouchableOpacity
                          onPress={() => openMedia(module.mediaUrl)}
                          style={{ borderRadius: 100, backgroundColor: p.accent, paddingHorizontal: 16, paddingVertical: 8 }}
                        >
                          <Text style={{ color: p.buttonPrimaryText, fontSize: 12, fontFamily: "Outfit-Bold" }}>
                            Open File
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {(module.type === "video" ||
                      isYoutubeUrl(module.mediaUrl) ||
                      isVideoUrl(module.mediaUrl)) &&
                    module.mediaUrl ? (
                      <View style={{ marginTop: 12 }}>
                        {isYoutubeUrl(module.mediaUrl) ? (
                          <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: p.inputBg }}>
                            <VideoPlayer
                              uri={module.mediaUrl}
                              ignoreTabFocus
                            />
                          </View>
                        ) : isImageDataUrl(module.mediaUrl) ? (
                          <View style={{ borderRadius: 16, backgroundColor: p.inputBg, paddingHorizontal: 16, paddingVertical: 16 }}>
                            <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                              Video file not detected. Please upload an .mp4
                              or YouTube link.
                            </Text>
                          </View>
                        ) : (
                          <VideoPlayer
                            uri={module.mediaUrl}
                            title={module.title}
                            useVideoResolution
                            ignoreTabFocus
                          />
                        )}
                      </View>
                    ) : null}
                    {isImageUrl(module.mediaUrl) ? (
                      <View style={{ marginTop: 12, borderRadius: 16, overflow: "hidden" }}>
                        <AutoImage uri={module.mediaUrl!} borderRadius={16} />
                      </View>
                    ) : null}
                    {module.content ? (
                      <Text style={{ fontSize: 16, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 24, marginTop: 12 }}>
                        {module.content}
                      </Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <View style={{ borderRadius: 22, borderWidth: 1, borderStyle: "dashed", borderColor: p.divider, padding: 16 }}>
                  <Text style={{ fontSize: 16, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                    No modules available.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={{ borderRadius: 22, borderWidth: 1, borderStyle: "dashed", borderColor: p.divider, padding: 16 }}>
            <Text style={{ fontSize: 16, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
              Course not found.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
