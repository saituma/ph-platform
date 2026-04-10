import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";

import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ChatMessage } from "@/constants/messages";

type ReactionsListModalProps = {
  open: boolean;
  onClose: () => void;
  reactions: ChatMessage["reactions"] | undefined;
  resolveUserName: (userId: number) => string;
};

export function ReactionsListModal({
  open,
  onClose,
  reactions,
  resolveUserName,
}: ReactionsListModalProps) {
  const { colors, isDark } = useAppTheme();

  const items = useMemo(() => {
    const flat: { key: string; emoji: string; userId: number }[] = [];
    for (const r of reactions ?? []) {
      for (const userId of r.userIds ?? []) {
        flat.push({ key: `${r.emoji}-${userId}`, emoji: r.emoji, userId });
      }
    }
    return flat;
  }, [reactions]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end"
        style={{
          backgroundColor: isDark ? "rgba(0,0,0,0.45)" : "rgba(15,23,42,0.25)",
        }}
        onPress={onClose}
      >
        <Pressable className="px-5 pb-8" onPress={() => {}}>
          <View
            className="rounded-3xl border px-4 py-4"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.borderSubtle,
            }}
          >
            <Text
              className="text-xs font-outfit mb-3"
              style={{ color: colors.textSecondary }}
            >
              Reactions
            </Text>

            {items.length === 0 ? (
              <Text className="text-sm" style={{ color: colors.textDim }}>
                No reactions yet.
              </Text>
            ) : (
              <ScrollView
                style={{ maxHeight: 360 }}
                contentContainerStyle={{ paddingBottom: 4 }}
                showsVerticalScrollIndicator={false}
              >
                {items.map((it) => (
                  <View
                    key={it.key}
                    className="flex-row items-center gap-3 py-2"
                  >
                    <Text className="text-xl">{it.emoji}</Text>
                    <Text
                      className="text-sm"
                      style={{ color: colors.textPrimary }}
                    >
                      {resolveUserName(it.userId)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
