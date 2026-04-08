import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { Feather } from "@/components/ui/theme-icons";
import { apiRequest } from "@/lib/api";
import {
  isYoutubeUrl,
  VideoPlayer,
  YouTubeEmbed,
} from "@/components/media/VideoPlayer";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { Image as ExpoImage } from "expo-image";

type AnnouncementItem = {
  id: number | string;
  title?: string | null;
  content?: string | null;
  body?: unknown;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ParsedAnnouncement = {
  text: string;
  images: string[];
  videos: string[];
};

const normalizeMediaUrl = (value: string) => {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice(7)}`;
  return encodeURI(trimmed);
};

const extractAnnouncement = (item: AnnouncementItem): ParsedAnnouncement => {
  const raw = (
    typeof item.body === "string"
      ? item.body
      : item.body
        ? String(item.body)
        : (item.content ?? "")
  ).toString();
  const images: string[] = [];
  const videos: string[] = [];

  const imageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  const videoRegex = /\[Video\]\(([^)]+)\)/gi;

  let match: RegExpExecArray | null;
  while ((match = imageRegex.exec(raw)) !== null) {
    if (match[1]) images.push(normalizeMediaUrl(match[1]));
  }
  while ((match = videoRegex.exec(raw)) !== null) {
    if (match[1]) videos.push(normalizeMediaUrl(match[1]));
  }

  if (images.length === 0 || videos.length === 0) {
    const urlRegex = /(https?:\/\/[^\s)]+|\bwww\.[^\s)]+)/gi;
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = urlRegex.exec(raw)) !== null) {
      const url = normalizeMediaUrl(urlMatch[1]);
      if (/\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url)) {
        if (!images.includes(url)) images.push(url);
      } else if (/\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(url)) {
        if (!videos.includes(url)) videos.push(url);
      }
    }
  }

  let text = raw;
  text = text.replace(imageRegex, "");
  text = text.replace(videoRegex, "");
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, "$1");
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return { text, images, videos };
};

export default function AnnouncementsScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const token = useAppSelector((state) => state.user.token);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);

  const [items, setItems] = React.useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const headers = athleteUserId
        ? { "X-Acting-User-Id": String(athleteUserId) }
        : undefined;
      const res = await apiRequest<{ items?: AnnouncementItem[] }>(
        "/content/announcements",
        {
          token,
          headers,
          skipCache: true,
          suppressStatusCodes: [401, 403, 404],
        },
      );
      setItems(Array.isArray(res.items) ? res.items : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load announcements");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [athleteUserId, token]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <View className="px-6 py-4 flex-row items-center justify-between">
        <Pressable
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/messages")
          }
          className="h-11 w-11 rounded-2xl items-center justify-center border"
          style={{
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
            backgroundColor: isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(15,23,42,0.03)",
          }}
        >
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        <Text
          className="text-xl font-clash font-bold"
          style={{ color: colors.text }}
        >
          Announcements
        </Text>
        <Pressable
          onPress={() => void load()}
          className="h-11 w-11 rounded-2xl items-center justify-center border"
          style={{
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
            backgroundColor: isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(15,23,42,0.03)",
          }}
        >
          <Feather name="refresh-cw" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text
            className="text-base font-outfit text-center"
            style={{ color: colors.textSecondary }}
          >
            {error}
          </Text>
          <Pressable
            onPress={() => void load()}
            className="mt-6 rounded-full px-6 py-3"
            style={{ backgroundColor: colors.accent }}
          >
            <Text className="text-sm font-outfit font-bold text-white">
              Try again
            </Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text
            className="text-base font-outfit text-center"
            style={{ color: colors.textSecondary }}
          >
            No announcements yet.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        >
          <View className="gap-4">
            {items.map((item) => {
              const parsed = extractAnnouncement(item);
              const title = (item.title ?? "").trim() || "Announcement";
              const timestamp = item.updatedAt ?? item.createdAt ?? null;
              const when = timestamp
                ? new Date(timestamp).toLocaleString()
                : "";

              return (
                <View
                  key={String(item.id)}
                  className="rounded-[28px] border px-5 py-5 overflow-hidden"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.borderSubtle,
                  }}
                >
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                      <Text
                        className="text-lg font-clash font-bold"
                        style={{ color: colors.text }}
                      >
                        {title}
                      </Text>
                      {when ? (
                        <Text
                          className="mt-1 text-[12px] font-outfit"
                          style={{ color: colors.textSecondary }}
                        >
                          {when}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      className="h-10 w-10 rounded-2xl items-center justify-center"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(34,197,94,0.16)"
                          : "rgba(34,197,94,0.10)",
                      }}
                    >
                      <Feather name="radio" size={18} color={colors.accent} />
                    </View>
                  </View>

                  {parsed.text ? (
                    <View className="mt-4">
                      <MarkdownText text={parsed.text} />
                    </View>
                  ) : null}

                  {parsed.images.length ? (
                    <View className="mt-4 gap-3">
                      {parsed.images.map((url) => (
                        <ExpoImage
                          key={url}
                          source={{ uri: url }}
                          style={{
                            width: "100%",
                            height: 220,
                            borderRadius: 18,
                          }}
                          contentFit="cover"
                        />
                      ))}
                    </View>
                  ) : null}

                  {parsed.videos.length ? (
                    <View className="mt-4 gap-3">
                      {parsed.videos.map((url) =>
                        isYoutubeUrl(url) ? (
                          <View
                            key={url}
                            style={{
                              height: 220,
                              borderRadius: 18,
                              overflow: "hidden",
                            }}
                          >
                            <YouTubeEmbed
                              url={url}
                              shouldPlay={false}
                              initialMuted
                            />
                          </View>
                        ) : (
                          <View
                            key={url}
                            style={{ borderRadius: 18, overflow: "hidden" }}
                          >
                            <VideoPlayer
                              uri={url}
                              height={220}
                              autoPlay={false}
                              initialMuted
                              previewOnly
                            />
                          </View>
                        ),
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
