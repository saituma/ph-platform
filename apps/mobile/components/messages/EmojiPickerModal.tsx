import React, { useCallback, useRef } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";

type EmojiSourceItem = {
  name: string;
  unified: string;
  short_name: string;
  short_names?: string[];
  category: string;
  has_img_apple?: boolean;
  has_img_google?: boolean;
  has_img_twitter?: boolean;
};

type EmojiItem = {
  key: string;
  emoji: string;
  category: string;
  search: string;
};

const unifiedToEmoji = (unified: string) =>
  unified
    .split("-")
    .map((hex) => String.fromCodePoint(parseInt(hex, 16)))
    .join("");

const EMOJI_ITEMS: EmojiItem[] = (() => {
  const raw = require("emoji-datasource/emoji.json") as EmojiSourceItem[];
  return raw
    .filter(
      (item) =>
        Boolean(item?.unified) &&
        (item.has_img_apple || item.has_img_google || item.has_img_twitter),
    )
    .map((item) => {
      const names = [
        item.short_name,
        ...(Array.isArray(item.short_names) ? item.short_names : []),
        item.name,
      ]
        .filter(Boolean)
        .join(" ");
      return {
        key: item.unified,
        emoji: unifiedToEmoji(item.unified),
        category: item.category,
        search: names.toLowerCase(),
      };
    });
})();

const CATEGORIES = Array.from(new Set(EMOJI_ITEMS.map((i) => i.category)));

const CATEGORY_EMOJI: Record<string, string> = {
  "Smileys & Emotion": "😀",
  "People & Body": "🤸",
  "Animals & Nature": "🐶",
  "Food & Drink": "🍕",
  "Travel & Places": "✈️",
  Activities: "⚽",
  Objects: "💡",
  Symbols: "#️⃣",
  Flags: "🏳️",
};

const COLS = 8;

export function EmojiPickerModal({
  open,
  onClose,
  onSelectEmoji,
}: {
  open: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}) {
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>(CATEGORIES[0] ?? "");
  const inputRef = useRef<TextInput>(null);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setCategory(CATEGORIES[0] ?? "");
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const items = React.useMemo(() => {
    if (normalizedQuery) {
      return EMOJI_ITEMS.filter((item) =>
        item.search.includes(normalizedQuery),
      ).slice(0, 200);
    }
    return EMOJI_ITEMS.filter((item) => item.category === category);
  }, [category, normalizedQuery]);

  const renderEmojiItem = useCallback(
    ({ item }: { item: EmojiItem }) => (
      <Pressable
        onPress={() => onSelectEmoji(item.emoji)}
        style={({ pressed }) => ({
          width: `${100 / COLS}%`,
          padding: 3,
        })}
      >
        {({ pressed }) => (
          <View
            style={{
              aspectRatio: 1,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: pressed ? p.accentSoft : p.inputBg,
              borderWidth: 1,
              borderColor: pressed ? p.accent : p.divider,
            }}
          >
            <Text style={{ fontSize: 22, lineHeight: 28 }}>{item.emoji}</Text>
          </View>
        )}
      </Pressable>
    ),
    [onSelectEmoji, p],
  );

  return (
    <Modal
      visible={open}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: p.pageBg }}>
        {/* Header */}
        <View
          style={{
            paddingTop: Math.max(insets.top + 8, 16),
            paddingHorizontal: 20,
            paddingBottom: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: p.divider,
          }}
        >
          <Text
            style={{
              fontFamily: "ClashDisplay-Bold",
              fontSize: 20,
              color: p.textPrimary,
              letterSpacing: -0.4,
            }}
          >
            Emoji
          </Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              height: 36,
              width: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed
                ? "rgba(255,255,255,0.12)"
                : "rgba(255,255,255,0.07)",
            })}
          >
            <Text style={{ fontSize: 18, color: p.textSecondary }}>✕</Text>
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: p.inputBg,
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 10,
              gap: 10,
              borderWidth: 1,
              borderColor: p.divider,
            }}
          >
            <Text style={{ fontSize: 16 }}>🔍</Text>
            <TextInput
              ref={inputRef}
              placeholder="Search emoji…"
              placeholderTextColor={p.textMuted}
              value={query}
              onChangeText={setQuery}
              style={{
                flex: 1,
                color: p.textPrimary,
                fontSize: 15,
                fontFamily: "Outfit-Regular",
                paddingVertical: 0,
              }}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Text style={{ fontSize: 14, color: p.textMuted }}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Category tabs — only visible when not searching */}
        {!normalizedQuery && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 12,
              gap: 8,
              flexDirection: "row",
            }}
            keyboardShouldPersistTaps="handled"
          >
            {CATEGORIES.map((c) => {
              const selected = c === category;
              const icon = CATEGORY_EMOJI[c] ?? "😶";
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 100,
                    backgroundColor: selected
                      ? p.accentSoft
                      : p.inputBg,
                    borderWidth: 1,
                    borderColor: selected ? p.accent : p.divider,
                  }}
                >
                  <Text style={{ fontSize: 14, lineHeight: 18 }}>{icon}</Text>
                  <Text
                    style={{
                      fontFamily: "Outfit-SemiBold",
                      fontSize: 12,
                      color: selected ? p.accent : p.textSecondary,
                    }}
                  >
                    {c.split(" ")[0]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Emoji grid */}
        <FlashList
          data={items}
          keyExtractor={(item) => item.key}
          numColumns={COLS}
          contentContainerStyle={{
            paddingHorizontal: 8,
            paddingBottom: Math.max(insets.bottom + 24, 28),
          }}
          renderItem={renderEmojiItem}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View
              style={{
                paddingTop: 48,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 40 }}>🤷</Text>
              <Text
                style={{
                  marginTop: 12,
                  fontFamily: "Outfit-Regular",
                  fontSize: 14,
                  color: p.textSecondary,
                }}
              >
                No emojis found
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}
