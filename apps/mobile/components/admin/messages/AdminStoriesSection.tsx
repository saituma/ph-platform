import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Image } from "expo-image";
import {
  Camera,
  Film,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  X,
} from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAdminPastel } from "@/components/admin/AdminUI";
import type { useAdminStories } from "@/hooks/admin/useAdminStories";

type Props = {
  controller: ReturnType<typeof useAdminStories>;
  canLoad: boolean;
};

export function AdminStoriesSection({ controller, canLoad }: Props) {
  const p = useAdminPastel();
  const [editorOpen, setEditorOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [badge, setBadge] = useState("");

  useEffect(() => {
    if (!canLoad) return;
    void controller.load(false);
  }, [canLoad, controller.load]);

  const openCreate = () => {
    setTitle("");
    setMediaUrl("");
    setMediaType("image");
    setBadge("");
    setEditorOpen(true);
  };

  const canSubmit =
    title.trim().length > 0 && mediaUrl.trim().length > 0 && !controller.isBusy;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await controller.create({
        title: title.trim(),
        mediaUrl: mediaUrl.trim(),
        mediaType,
        badge: badge.trim() || null,
      });
      setEditorOpen(false);
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Action failed");
    }
  };

  const confirmDelete = (storyId: number, storyTitle: string) => {
    Alert.alert("Delete story", `Remove "${storyTitle}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void controller.remove(storyId),
      },
    ]);
  };

  const PastelChip = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 100,
        backgroundColor: selected ? p.accent : p.inputBg,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: "Outfit-SemiBold",
          fontSize: 13,
          color: selected ? "#FFFFFF" : p.textSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ gap: 16, paddingHorizontal: 20 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 16,
            color: p.textPrimary,
          }}
        >
          Stories
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => void controller.load(true)}
            disabled={controller.loading}
            style={({ pressed }) => ({
              height: 36,
              width: 36,
              borderRadius: 100,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: p.inputBg,
              opacity: controller.loading ? 0.4 : pressed ? 0.7 : 1,
            })}
          >
            <RefreshCw size={14} color={p.textSecondary} />
          </Pressable>
          <Pressable
            onPress={openCreate}
            style={({ pressed }) => ({
              height: 36,
              paddingHorizontal: 14,
              borderRadius: 100,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: p.accentSoft,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Plus size={14} color={p.accent} />
            <Text
              style={{
                fontFamily: "Outfit-SemiBold",
                fontSize: 13,
                color: p.accent,
              }}
            >
              Add
            </Text>
          </Pressable>
        </View>
      </View>

      {/* List */}
      {controller.loading && controller.items.length === 0 ? (
        <View style={{ gap: 10 }}>
          <Skeleton width="100%" height={80} />
          <Skeleton width="100%" height={80} />
        </View>
      ) : controller.error ? (
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Outfit-Regular",
            color: p.danger,
          }}
        >
          {controller.error}
        </Text>
      ) : controller.items.length === 0 ? (
        <View
          style={{
            padding: 24,
            borderRadius: 20,
            backgroundColor: p.cardWhite,
            alignItems: "center",
            gap: 8,
          }}
        >
          <Camera size={32} color={p.textMuted} />
          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 13,
              color: p.textSecondary,
              textAlign: "center",
            }}
          >
            No stories yet. Add your first story for athletes to see.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
        >
          {controller.items.map((story) => (
            <View
              key={story.id}
              style={{
                width: 140,
                borderRadius: 20,
                backgroundColor: p.cardWhite,
                overflow: "hidden",
                shadowColor: p.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View style={{ position: "relative" }}>
                <Image
                  source={{ uri: story.mediaUrl }}
                  style={{ width: 140, height: 180 }}
                  contentFit="cover"
                />
                {story.mediaType === "video" && (
                  <View
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      backgroundColor: "rgba(0,0,0,0.6)",
                      borderRadius: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Film size={12} color="#fff" />
                  </View>
                )}
                <Pressable
                  onPress={() => confirmDelete(story.id, story.title)}
                  style={({ pressed }) => ({
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <X size={14} color="#fff" />
                </Pressable>
              </View>
              <View style={{ padding: 10 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: "Outfit-SemiBold",
                    fontSize: 13,
                    color: p.textPrimary,
                  }}
                >
                  {story.title}
                </Text>
                {story.badge ? (
                  <Text
                    style={{
                      fontFamily: "Outfit-Regular",
                      fontSize: 11,
                      color: p.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {story.badge}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal
        visible={editorOpen}
        animationType="slide"
        presentationStyle={
          Platform.OS === "ios" ? "pageSheet" : "fullScreen"
        }
        onRequestClose={() => setEditorOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: p.pageBg }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingTop: Platform.OS === "ios" ? 20 : 40,
              paddingBottom: 16,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: p.divider,
              gap: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: p.accentSoft,
              }}
            >
              <Camera size={18} color={p.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 18,
                  color: p.textPrimary,
                }}
              >
                New Story
              </Text>
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 12,
                  color: p.textSecondary,
                  marginTop: 1,
                }}
              >
                Share an image or video with athletes
              </Text>
            </View>
            <Pressable
              onPress={() => setEditorOpen(false)}
              hitSlop={10}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 100,
                backgroundColor: p.inputBg,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: "Outfit-Medium",
                  fontSize: 13,
                  color: p.textSecondary,
                }}
              >
                Cancel
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                borderRadius: 24,
                backgroundColor: p.cardWhite,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: p.divider,
                }}
              >
                <Camera size={14} color={p.accent} />
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: p.accent,
                  }}
                >
                  Story Details
                </Text>
              </View>

              <View style={{ padding: 16, gap: 14 }}>
                {/* Title */}
                <View>
                  <Text
                    style={{
                      fontFamily: "Outfit-SemiBold",
                      fontSize: 12,
                      color: p.textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    Title
                  </Text>
                  <View
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: p.inputBorder,
                      backgroundColor: p.inputBg,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <TextInput
                      value={title}
                      onChangeText={(t) => setTitle(t.slice(0, 80))}
                      placeholder="Story title"
                      placeholderTextColor={p.textMuted}
                      style={{
                        fontFamily: "Outfit-Regular",
                        fontSize: 15,
                        color: p.textPrimary,
                        padding: 0,
                      }}
                      maxLength={80}
                    />
                  </View>
                </View>

                {/* Media URL */}
                <View>
                  <Text
                    style={{
                      fontFamily: "Outfit-SemiBold",
                      fontSize: 12,
                      color: p.textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    Media URL
                  </Text>
                  <View
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: p.inputBorder,
                      backgroundColor: p.inputBg,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <TextInput
                      value={mediaUrl}
                      onChangeText={setMediaUrl}
                      placeholder="https://... image or video URL"
                      placeholderTextColor={p.textMuted}
                      style={{
                        fontFamily: "Outfit-Regular",
                        fontSize: 15,
                        color: p.textPrimary,
                        padding: 0,
                      }}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>
                </View>

                {/* Preview */}
                {mediaUrl.trim().length > 0 && (
                  <View
                    style={{
                      borderRadius: 16,
                      overflow: "hidden",
                      backgroundColor: p.inputBg,
                    }}
                  >
                    <Image
                      source={{ uri: mediaUrl.trim() }}
                      style={{ width: "100%", height: 200 }}
                      contentFit="cover"
                    />
                  </View>
                )}

                {/* Media Type */}
                <View>
                  <Text
                    style={{
                      fontFamily: "Outfit-SemiBold",
                      fontSize: 12,
                      color: p.textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    Media Type
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <PastelChip
                      label="Image"
                      selected={mediaType === "image"}
                      onPress={() => setMediaType("image")}
                    />
                    <PastelChip
                      label="Video"
                      selected={mediaType === "video"}
                      onPress={() => setMediaType("video")}
                    />
                  </View>
                </View>

                {/* Badge (optional) */}
                <View>
                  <Text
                    style={{
                      fontFamily: "Outfit-SemiBold",
                      fontSize: 12,
                      color: p.textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    Badge (optional)
                  </Text>
                  <View
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: p.inputBorder,
                      backgroundColor: p.inputBg,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <TextInput
                      value={badge}
                      onChangeText={(t) => setBadge(t.slice(0, 20))}
                      placeholder='e.g. "NEW", "LIVE"'
                      placeholderTextColor={p.textMuted}
                      style={{
                        fontFamily: "Outfit-Regular",
                        fontSize: 15,
                        color: p.textPrimary,
                        padding: 0,
                      }}
                      maxLength={20}
                    />
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Submit */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Platform.OS === "ios" ? 32 : 20,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: p.divider,
            }}
          >
            <Pressable
              onPress={() => void submit()}
              disabled={!canSubmit}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: 100,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: canSubmit ? p.accent : p.inputBg,
                opacity: !canSubmit ? 0.5 : pressed ? 0.75 : 1,
              })}
            >
              <Send size={16} color={canSubmit ? "#FFFFFF" : p.textSecondary} />
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 15,
                  color: canSubmit ? "#FFFFFF" : p.textSecondary,
                }}
              >
                Publish Story
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
