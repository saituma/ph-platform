import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import Animated, { SlideInUp } from "react-native-reanimated";
import { FlashList } from "@shopify/flash-list";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import type { ChatMessage } from "@/constants/messages";
import type { MessageThread } from "@/types/messages";

type Props = {
  message: ChatMessage | null;
  threads: MessageThread[];
  token?: string | null;
  onClose: () => void;
  onForwarded: () => void;
};

export default function ForwardMessageSheet({
  message,
  threads,
  token,
  onClose,
  onForwarded,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      threads.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
      ),
    [threads, search]
  );

  const handleForward = useCallback(
    async (thread: MessageThread) => {
      if (!message || !token) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setSending(thread.id);
      try {
        await apiRequest("/messages/forward", {
          token,
          method: "POST",
          body: {
            messageId: Number(message.id),
            targetThreadId: thread.id,
          },
        });
        onForwarded();
        onClose();
      } catch {
        Alert.alert("Error", "Failed to forward message. Please try again.");
      } finally {
        setSending(null);
      }
    },
    [message, token, onForwarded, onClose]
  );

  if (!message) return null;

  const Backdrop = Platform.OS === "ios" ? BlurView : View;
  const backdropProps =
    Platform.OS === "ios"
      ? { intensity: 40, tint: isDark ? ("dark" as const) : ("light" as const) }
      : {};

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
    <Backdrop
      {...backdropProps}
      style={{
        flex: 1,
        backgroundColor:
          Platform.OS === "android"
            ? isDark
              ? "rgba(0,0,0,0.7)"
              : "rgba(0,0,0,0.5)"
            : undefined,
      }}
    >
      <Animated.View
        entering={SlideInUp.springify().damping(20)}
        style={{
          flex: 1,
          marginTop: 60,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: colors.background,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontFamily: fonts.heading2,
              color: colors.textPrimary,
            }}
          >
            Forward to...
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.card,
              borderRadius: 12,
              paddingHorizontal: 12,
              height: 42,
            }}
          >
            <Ionicons
              name="search"
              size={18}
              color={colors.textDim}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search conversations..."
              placeholderTextColor={colors.textDim}
              style={{
                flex: 1,
                fontSize: 15,
                fontFamily: fonts.bodyRegular,
                color: colors.textPrimary,
              }}
            />
          </View>
        </View>

        {/* Thread list */}
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isLoading = sending === item.id;
            return (
              <Pressable
                disabled={!!sending}
                onPress={() => handleForward(item)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  opacity: isLoading ? 0.5 : pressed ? 0.7 : 1,
                  backgroundColor: pressed ? colors.card : "transparent",
                })}
              >
                {item.avatarUrl ? (
                  <Image
                    source={{ uri: item.avatarUrl }}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.accent,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: fonts.bodyBold,
                        color: "#fff",
                      }}
                    >
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 15,
                      fontFamily: fonts.bodyMedium,
                      color: colors.textPrimary,
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 13,
                      fontFamily: fonts.bodyRegular,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {item.role}
                  </Text>
                </View>
                {isLoading && (
                  <Ionicons
                    name="hourglass-outline"
                    size={18}
                    color={colors.textDim}
                  />
                )}
              </Pressable>
            );
          }}
        />
      </Animated.View>
    </Backdrop>
    </Modal>
  );
}
