import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import {
  deleteComment,
  fetchRunComments,
  postRunComment,
  reportComment,
  type SocialCommentItem,
} from "@/services/tracking/socialService";
import { Feather } from "@expo/vector-icons";
import { Shadows } from "@/constants/theme";

export function CommentsSheet({
  open,
  onClose,
  token,
  runLogId,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  runLogId: number;
}) {
  const { colors, isDark } = useAppTheme();
  const [items, setItems] = useState<SocialCommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [text, setText] = useState("");

  const cardStyle = useMemo(
    () => ({
      backgroundColor: colors.cardElevated,
      borderColor: colors.border,
      ...(isDark ? Shadows.none : Shadows.md),
    }),
    [colors, isDark],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRunComments(token, runLogId);
      setItems(res.items ?? []);
    } catch (e: any) {
      Alert.alert("Couldn't load comments", String(e?.message ?? "Error"));
    } finally {
      setLoading(false);
    }
  }, [runLogId, token]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [load, open]);

  const onPost = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (posting) return;
    setPosting(true);
    try {
      await postRunComment(token, runLogId, trimmed);
      setText("");
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't post", String(e?.message ?? "Error"));
    } finally {
      setPosting(false);
    }
  }, [load, posting, runLogId, text, token]);

  const onDelete = useCallback(
    (commentId: number) => {
      Alert.alert("Delete comment?", "This will remove your comment.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment(token, commentId);
              await load();
            } catch (e: any) {
              Alert.alert("Couldn't delete", String(e?.message ?? "Error"));
            }
          },
        },
      ]);
    },
    [load, token],
  );

  const onReport = useCallback(
    (commentId: number) => {
      Alert.alert(
        "Report comment?",
        "We'll review this report. Thanks for helping keep the community safe.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Report",
            style: "destructive",
            onPress: async () => {
              try {
                await reportComment(token, commentId);
                Alert.alert("Reported", "Thanks. We'll review it.");
              } catch (e: any) {
                Alert.alert("Couldn't report", String(e?.message ?? "Error"));
              }
            },
          },
        ],
      );
    },
    [token],
  );

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-[28px] border px-5 pt-5 pb-4"
          style={cardStyle}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-clash" style={{ color: colors.text }}>
              Comments
            </Text>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 rounded-2xl items-center justify-center border"
              style={{ borderColor: colors.border }}
            >
              <Feather name="x" size={18} color={colors.icon} />
            </Pressable>
          </View>

          {loading ? (
            <View className="py-8 items-center">
              <ActivityIndicator />
            </View>
          ) : (
            <View className="gap-3" style={{ maxHeight: 320 }}>
              {items.length === 0 ? (
                <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                  No comments yet.
                </Text>
              ) : null}

              {items.map((c) => (
                <View key={c.commentId} className="rounded-2xl border px-4 py-3" style={{ borderColor: colors.border }}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-outfit font-semibold" style={{ color: colors.text }}>
                      {c.name}
                    </Text>
                    <View className="flex-row items-center gap-3">
                      {c.isMine ? (
                        <Pressable onPress={() => onDelete(c.commentId)}>
                          <Text className="text-xs font-outfit font-semibold" style={{ color: colors.danger }}>
                            Delete
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable onPress={() => onReport(c.commentId)}>
                          <Text className="text-xs font-outfit font-semibold" style={{ color: colors.textSecondary }}>
                            Report
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                  <Text className="text-sm font-outfit mt-1" style={{ color: colors.textSecondary }}>
                    {c.content}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View className="flex-row items-center gap-3 mt-4">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Write a comment"
              placeholderTextColor={colors.placeholder}
              editable={!posting}
              className="flex-1 rounded-2xl border px-4 py-3 font-outfit text-base"
              style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.background }}
            />
            <Pressable
              onPress={onPost}
              disabled={posting || !text.trim().length}
              className="h-12 w-12 rounded-2xl items-center justify-center"
              style={{
                backgroundColor:
                  posting || !text.trim().length ? `${colors.accent}55` : colors.accent,
              }}
            >
              {posting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Feather name="send" size={18} color="#fff" />
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

