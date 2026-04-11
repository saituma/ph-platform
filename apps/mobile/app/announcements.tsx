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
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { Image as ExpoImage } from "expo-image";
import { OpenGraphPreview } from "@/components/media/OpenGraphPreview";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

type AnnouncementItem = {
  id: number | string;
  title?: string | null;
  content?: string | null;
  body?: unknown;
  isActive?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ParsedAnnouncement = {
  text: string;
  images: Array<{ url: string; caption: string | null }>;
  videos: Array<{ url: string; caption: string | null }>;
  links: string[];
};

const normalizeMediaUrl = (value: string) => {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice(7)}`;
  if (trimmed.startsWith("www.")) return `https://${trimmed}`;
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
  const images: Array<{ url: string; caption: string | null }> = [];
  const videos: Array<{ url: string; caption: string | null }> = [];
  const links: string[] = [];

  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const videoRegex = /\[Video([^\]]*)\]\(([^)]+)\)/gi;
  const markdownLinkRegex = /\[[^\]]+\]\(([^)]+)\)/g;

  let match: RegExpExecArray | null;
  while ((match = imageRegex.exec(raw)) !== null) {
    const caption = String(match[1] ?? "").trim();
    const url = match[2] ? normalizeMediaUrl(match[2]) : "";
    if (url) images.push({ url, caption: caption || null });
  }
  while ((match = videoRegex.exec(raw)) !== null) {
    const labelRemainder = String(match[1] ?? "").trim();
    const caption = labelRemainder.replace(/^[:\-–—]\s*/, "").trim();
    const url = match[2] ? normalizeMediaUrl(match[2]) : "";
    if (url) videos.push({ url, caption: caption || null });
  }

  const urlRegex = /(https?:\/\/[^\s)]+|\bwww\.[^\s)]+)/gi;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlRegex.exec(raw)) !== null) {
    const url = normalizeMediaUrl(urlMatch[1]);
    if (/\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url)) {
      if (!images.some((entry) => entry.url === url)) {
        images.push({ url, caption: null });
      }
    } else if (/\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(url)) {
      if (!videos.some((entry) => entry.url === url)) {
        videos.push({ url, caption: null });
      }
    } else if (/^https?:\/\//i.test(url)) {
      if (!links.includes(url)) links.push(url);
    }
  }

  while ((match = markdownLinkRegex.exec(raw)) !== null) {
    const url = match[1] ? normalizeMediaUrl(match[1]) : "";
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const isImage = images.some((entry) => entry.url === url);
    const isVideo = videos.some((entry) => entry.url === url);
    if (!isImage && !isVideo && !links.includes(url)) links.push(url);
  }

  let text = raw;
  text = text.replace(imageRegex, "");
  text = text.replace(videoRegex, "");
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, "$1");
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return { text, images, videos, links };
};

export default function AnnouncementsScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const token = useAppSelector((state) => state.user.token);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const apiUserRole = useAppSelector((state) => state.user.apiUserRole);
  const isAdmin =
    apiUserRole === "admin" ||
    apiUserRole === "superAdmin" ||
    apiUserRole === "coach";

  const [items, setItems] = React.useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [editingId, setEditingId] = React.useState<number | string | null>(
    null,
  );
  const [formTitle, setFormTitle] = React.useState("");
  const [formBody, setFormBody] = React.useState("");
  const [formIsActive, setFormIsActive] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);

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

  const handleOpenForm = (item?: AnnouncementItem) => {
    if (item) {
      setEditingId(item.id);
      setFormTitle(item.title || "");
      const rawBody =
        typeof item.body === "string"
          ? item.body
          : item.body
            ? String(item.body)
            : String(item.content ?? "");
      setFormBody(rawBody);
      setFormIsActive(item.isActive ?? true);
    } else {
      setEditingId(null);
      setFormTitle("");
      setFormBody("");
      setFormIsActive(true);
    }
    bottomSheetModalRef.current?.present();
  };

  const handleSave = async () => {
    if (!token || !formTitle.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        content: formTitle.trim(),
        body: formBody.trim(),
        type: "article",
        surface: "announcements",
        announcementIsActive: formIsActive,
      };

      if (editingId) {
        await apiRequest(`/content/${editingId}`, {
          token,
          method: "PUT",
          body: payload,
        });
      } else {
        await apiRequest("/content", {
          token,
          method: "POST",
          body: payload,
        });
      }
      bottomSheetModalRef.current?.dismiss();
      load();
    } catch (err) {
      Alert.alert("Error", "Failed to save announcement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: number | string) => {
    Alert.alert(
      "Delete Announcement",
      "Are you sure you want to delete this announcement?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            try {
              await apiRequest(`/content/${id}`, {
                token,
                method: "DELETE",
              });
              load();
            } catch (err) {
              Alert.alert("Error", "Failed to delete announcement");
            }
          },
        },
      ],
    );
  };

  React.useEffect(() => {
    load();
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
        <View className="flex-row items-center gap-2">
          {isAdmin ? (
            <Pressable
              onPress={() => handleOpenForm()}
              className="h-11 w-11 rounded-2xl items-center justify-center border"
              style={{
                borderColor: colors.accent,
                backgroundColor: isDark
                  ? "rgba(34,197,94,0.16)"
                  : "rgba(34,197,94,0.10)",
              }}
            >
              <Feather name="plus" size={20} color={colors.accent} />
            </Pressable>
          ) : null}
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
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="text-lg font-clash font-bold"
                          style={{ color: colors.text }}
                        >
                          {title}
                        </Text>
                        {isAdmin && item.isActive === false ? (
                          <View
                            className="rounded-full px-2 py-0.5 border"
                            style={{
                              backgroundColor: "rgba(239,68,68,0.1)",
                              borderColor: "rgba(239,68,68,0.2)",
                            }}
                          >
                            <Text className="text-[10px] text-[#EF4444] font-bold uppercase">
                              Inactive
                            </Text>
                          </View>
                        ) : null}
                      </View>
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
                      {parsed.images.map((entry) => (
                        <View key={entry.url} className="gap-2">
                          <ExpoImage
                            source={{ uri: entry.url }}
                            style={{
                              width: "100%",
                              height: 220,
                              borderRadius: 18,
                            }}
                            contentFit="cover"
                          />
                          {entry.caption ? (
                            <Text
                              className="text-[12px] font-outfit"
                              style={{ color: colors.textSecondary }}
                            >
                              {entry.caption}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {parsed.videos.length ? (
                    <View className="mt-4 gap-3">
                      {parsed.videos.map((entry) =>
                        isYoutubeUrl(entry.url) ? (
                          <View key={entry.url} className="gap-2">
                            <View
                              style={{
                                height: 220,
                                borderRadius: 18,
                                overflow: "hidden",
                              }}
                            >
                              <YouTubeEmbed
                                url={entry.url}
                                shouldPlay={false}
                                initialMuted
                              />
                            </View>
                            {entry.caption ? (
                              <Text
                                className="text-[12px] font-outfit"
                                style={{ color: colors.textSecondary }}
                              >
                                {entry.caption}
                              </Text>
                            ) : null}
                          </View>
                        ) : (
                          <View key={entry.url} className="gap-2">
                            <View
                              style={{ borderRadius: 18, overflow: "hidden" }}
                            >
                              <VideoPlayer
                                uri={entry.url}
                                height={220}
                                autoPlay={false}
                                initialMuted
                                previewOnly
                              />
                            </View>
                            {entry.caption ? (
                              <Text
                                className="text-[12px] font-outfit"
                                style={{ color: colors.textSecondary }}
                              >
                                {entry.caption}
                              </Text>
                            ) : null}
                          </View>
                        ),
                      )}
                    </View>
                  ) : null}

                  {token && parsed.links.length ? (
                    <View className="mt-4 gap-3">
                      {parsed.links.slice(0, 2).map((url) => (
                        <OpenGraphPreview key={url} url={url} token={token} />
                      ))}
                    </View>
                  ) : null}

                  {isAdmin ? (
                    <View className="mt-6 pt-4 border-t flex-row items-center gap-3" style={{ borderColor: colors.borderSubtle }}>
                      <Pressable
                        onPress={() => handleOpenForm(item)}
                        className="flex-1 h-10 rounded-2xl items-center justify-center border flex-row gap-2"
                        style={{
                          borderColor: colors.borderSubtle,
                          backgroundColor: colors.backgroundSecondary,
                        }}
                      >
                        <Feather name="edit-2" size={14} color={colors.textSecondary} />
                        <Text className="text-[13px] font-outfit font-semibold" style={{ color: colors.textSecondary }}>
                          Edit
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(item.id)}
                        className="flex-1 h-10 rounded-2xl items-center justify-center border flex-row gap-2"
                        style={{
                          borderColor: "rgba(239,68,68,0.25)",
                          backgroundColor: "rgba(239,68,68,0.10)",
                        }}
                      >
                        <Feather name="trash-2" size={14} color="#EF4444" />
                        <Text className="text-[13px] font-outfit font-semibold" style={{ color: "#EF4444" }}>
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={["85%"]}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={0.4}
            pressBehavior="close"
          />
        )}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{
          backgroundColor: isDark
            ? "rgba(255,255,255,0.28)"
            : "rgba(15,23,42,0.22)",
        }}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 40 }}>
          <Text
            className="text-2xl font-clash font-bold"
            style={{ color: colors.text }}
          >
            {editingId ? "Edit Announcement" : "New Announcement"}
          </Text>
          <Text
            className="mt-1 text-sm font-outfit"
            style={{ color: colors.textSecondary }}
          >
            Broadcast an update to your athletes. Markdown supported.
          </Text>

          <View className="mt-6 gap-5">
            <View>
              <Text
                className="text-[11px] font-outfit font-bold uppercase tracking-[1.2px] mb-2"
                style={{ color: colors.textSecondary }}
              >
                Title
              </Text>
              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Announcement title..."
                placeholderTextColor={colors.textSecondary}
                className="h-14 rounded-2xl border px-4 font-outfit"
                style={{
                  borderColor: colors.borderSubtle,
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                }}
              />
            </View>

            <View className="flex-1">
              <Text
                className="text-[11px] font-outfit font-bold uppercase tracking-[1.2px] mb-2"
                style={{ color: colors.textSecondary }}
              >
                Content
              </Text>
              <TextInput
                value={formBody}
                onChangeText={setFormBody}
                placeholder="Markdown content..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={10}
                className="min-h-[200px] rounded-2xl border p-4 font-outfit"
                style={{
                  borderColor: colors.borderSubtle,
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  textAlignVertical: "top",
                }}
              />
            </View>

            <Pressable
              onPress={() => setFormIsActive(!formIsActive)}
              className="flex-row items-center justify-between h-14 rounded-2xl border px-4"
              style={{
                borderColor: colors.borderSubtle,
                backgroundColor: colors.backgroundSecondary,
              }}
            >
              <Text
                className="text-sm font-outfit font-semibold"
                style={{ color: colors.text }}
              >
                Published & Active
              </Text>
              <View
                className="w-12 h-7 rounded-full px-1 justify-center"
                style={{
                  backgroundColor: formIsActive ? colors.accent : colors.border,
                }}
              >
                <View
                  className="w-5 h-5 rounded-full bg-white"
                  style={{
                    alignSelf: formIsActive ? "flex-end" : "flex-start",
                  }}
                />
              </View>
            </Pressable>
          </View>

          <View className="mt-8 flex-row items-center gap-3">
            <Pressable
              onPress={() => bottomSheetModalRef.current?.dismiss()}
              className="flex-1 h-14 rounded-2xl items-center justify-center border"
              style={{
                borderColor: colors.borderSubtle,
                backgroundColor: colors.backgroundSecondary,
              }}
            >
              <Text
                className="font-outfit font-bold"
                style={{ color: colors.text }}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={isSaving || !formTitle.trim()}
              className="flex-1 h-14 rounded-2xl items-center justify-center"
              style={{
                backgroundColor: colors.accent,
                opacity: isSaving || !formTitle.trim() ? 0.6 : 1,
              }}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-outfit font-bold text-white">
                  {editingId ? "Save changes" : "Post announcement"}
                </Text>
              )}
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}
