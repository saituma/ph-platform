import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import { MarkdownText } from "@/components/ui/MarkdownText";
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
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useAppToast } from "@/hooks/useAppToast";
import { Image as ExpoImage } from "expo-image";
import { SkeletonAnnouncementsScreen } from "@/components/ui/legacy-skeleton";
import { OpenGraphPreview } from "@/components/media/OpenGraphPreview";
import { BottomSheet } from "heroui-native";
import {
  ChevronLeft,
  Plus,
  RefreshCw,
  Radio,
  Pencil,
  Trash2,
} from "lucide-react-native";

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
  const p = useAdminPastel();
  const router = useRouter();
  const toast = useAppToast();
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

  const [sheetOpen, setSheetOpen] = React.useState(false);

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
    setSheetOpen(true);
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
      setSheetOpen(false);
      load();
    } catch (err) {
      toast.error("Error", "Failed to save announcement");
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
              toast.error("Error", "Failed to delete announcement");
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
      style={{ flex: 1, backgroundColor: p.pageBg }}
      edges={["top"]}
    >
      <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/messages")
          }
          style={{
            height: 44,
            width: 44,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: p.cardWhite,
          }}
        >
          <ChevronLeft size={20} color={p.textPrimary} />
        </Pressable>
        <Text
          style={{ fontSize: 20, fontFamily: "Outfit-Bold", color: p.textPrimary }}
        >
          Announcements
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isAdmin ? (
            <Pressable
              onPress={() => handleOpenForm()}
              style={{
                height: 44,
                width: 44,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: p.accentSoft,
              }}
            >
              <Plus size={20} color={p.accent} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => void load()}
            style={{
              height: 44,
              width: 44,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: p.cardWhite,
            }}
          >
            <RefreshCw size={18} color={p.textSecondary} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <SkeletonAnnouncementsScreen />
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text
            style={{ fontSize: 15, fontFamily: "Outfit-Regular", textAlign: "center", color: p.textSecondary }}
          >
            {error}
          </Text>
          <Pressable
            onPress={() => void load()}
            style={{ marginTop: 24, borderRadius: 100, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: p.accent }}
          >
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: p.buttonPrimaryText }}>
              Try again
            </Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text
            style={{ fontSize: 15, fontFamily: "Outfit-Regular", textAlign: "center", color: p.textSecondary }}
          >
            No announcements yet.
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 16 }}>
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
                  style={{
                    borderRadius: 28,
                    paddingHorizontal: 20,
                    paddingVertical: 20,
                    overflow: "hidden",
                    backgroundColor: p.cardWhite,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text
                          style={{ fontSize: 18, fontFamily: "Outfit-Bold", color: p.textPrimary }}
                        >
                          {title}
                        </Text>
                        {isAdmin && item.isActive === false ? (
                          <View
                            style={{
                              borderRadius: 100,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              backgroundColor: p.dangerSoft,
                            }}
                          >
                            <Text style={{ fontSize: 10, color: p.danger, fontFamily: "Outfit-Bold", textTransform: "uppercase" }}>
                              Inactive
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {when ? (
                        <Text
                          style={{ marginTop: 4, fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary }}
                        >
                          {when}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      style={{
                        height: 40,
                        width: 40,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: p.accentSoft,
                      }}
                    >
                      <Radio size={18} color={p.accent} />
                    </View>
                  </View>

                  {parsed.text ? (
                    <View style={{ marginTop: 16 }}>
                      <MarkdownText text={parsed.text} />
                    </View>
                  ) : null}

                  {parsed.images.length ? (
                    <View style={{ marginTop: 16, gap: 12 }}>
                      {parsed.images.map((entry) => (
                        <View key={entry.url} style={{ gap: 8 }}>
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
                              style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary }}
                            >
                              {entry.caption}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {parsed.videos.length ? (
                    <View style={{ marginTop: 16, gap: 12 }}>
                      {parsed.videos.map((entry) =>
                        isYoutubeUrl(entry.url) ? (
                          <View key={entry.url} style={{ gap: 8 }}>
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
                                style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary }}
                              >
                                {entry.caption}
                              </Text>
                            ) : null}
                          </View>
                        ) : (
                          <View key={entry.url} style={{ gap: 8 }}>
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
                                style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary }}
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
                    <View style={{ marginTop: 16, gap: 12 }}>
                      {parsed.links.slice(0, 2).map((url) => (
                        <OpenGraphPreview key={url} url={url} token={token} />
                      ))}
                    </View>
                  ) : null}

                  {isAdmin ? (
                    <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderColor: p.divider, flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Pressable
                        onPress={() => handleOpenForm(item)}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: p.inputBg,
                          flexDirection: "row",
                          gap: 8,
                        }}
                      >
                        <Pencil size={14} color={p.textSecondary} />
                        <Text style={{ fontSize: 13, fontFamily: "Outfit-Bold", color: p.textSecondary }}>
                          Edit
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(item.id)}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: p.dangerSoft,
                          flexDirection: "row",
                          gap: 8,
                        }}
                      >
                        <Trash2 size={14} color={p.danger} />
                        <Text style={{ fontSize: 13, fontFamily: "Outfit-Bold", color: p.danger }}>
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
        </KeyboardAvoidingView>
      )}

      <BottomSheet isOpen={sheetOpen} onOpenChange={setSheetOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay style={{ backgroundColor: p.overlay }} />
          <BottomSheet.Content
            snapPoints={["85%"]}
            enablePanDownToClose
            backgroundStyle={{ backgroundColor: p.cardWhite }}
            handleIndicatorStyle={{
              backgroundColor: p.textMuted,
            }}
          >
            <View style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 40 }}>
              <BottomSheet.Title
                style={{ fontSize: 24, fontFamily: "Outfit-Bold", color: p.textPrimary }}
              >
                {editingId ? "Edit Announcement" : "New Announcement"}
              </BottomSheet.Title>
              <BottomSheet.Description
                style={{ marginTop: 4, fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}
              >
                Broadcast an update to your athletes. Markdown supported.
              </BottomSheet.Description>

              <View style={{ marginTop: 24, gap: 20 }}>
                <View>
                  <Text
                    style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.textSecondary, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}
                  >
                    Title
                  </Text>
                  <TextInput
                    value={formTitle}
                    onChangeText={setFormTitle}
                    placeholder="Announcement title..."
                    placeholderTextColor={p.textMuted}
                    style={{
                      height: 56,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      fontFamily: "Outfit-Regular",
                      backgroundColor: p.inputBg,
                      color: p.textPrimary,
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.textSecondary, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}
                  >
                    Content
                  </Text>
                  <TextInput
                    value={formBody}
                    onChangeText={setFormBody}
                    placeholder="Markdown content..."
                    placeholderTextColor={p.textMuted}
                    multiline
                    numberOfLines={10}
                    style={{
                      minHeight: 200,
                      borderRadius: 16,
                      padding: 16,
                      fontFamily: "Outfit-Regular",
                      backgroundColor: p.inputBg,
                      color: p.textPrimary,
                      textAlignVertical: "top",
                    }}
                  />
                </View>

                <Pressable
                  onPress={() => setFormIsActive(!formIsActive)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    height: 56,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    backgroundColor: p.inputBg,
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: p.textPrimary }}
                  >
                    Published & Active
                  </Text>
                  <View
                    style={{
                      width: 48,
                      height: 28,
                      borderRadius: 14,
                      paddingHorizontal: 4,
                      justifyContent: "center",
                      backgroundColor: formIsActive ? p.accent : p.divider,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: "#fff",
                        alignSelf: formIsActive ? "flex-end" : "flex-start",
                      }}
                    />
                  </View>
                </Pressable>
              </View>

              <View style={{ marginTop: 32, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Pressable
                  onPress={() => setSheetOpen(false)}
                  style={{
                    flex: 1,
                    height: 56,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: p.inputBg,
                  }}
                >
                  <Text
                    style={{ fontFamily: "Outfit-Bold", color: p.textPrimary }}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={isSaving || !formTitle.trim()}
                  style={{
                    flex: 1,
                    height: 56,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: p.accent,
                    opacity: isSaving || !formTitle.trim() ? 0.6 : 1,
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator color={p.buttonPrimaryText} />
                  ) : (
                    <Text style={{ fontFamily: "Outfit-Bold", color: p.buttonPrimaryText }}>
                      {editingId ? "Save changes" : "Post announcement"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </SafeAreaView>
  );
}
