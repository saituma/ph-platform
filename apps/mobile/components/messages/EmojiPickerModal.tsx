import React, { useCallback } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Feather } from "@/components/ui/theme-icons";

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

const CATEGORIES = Array.from(
  new Set(EMOJI_ITEMS.map((item) => item.category)),
);

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> =
  {
    "Smileys & Emotion": "smile",
    "People & Body": "user",
    "Animals & Nature": "feather",
    "Food & Drink": "coffee",
    "Travel & Places": "map-pin",
    Activities: "activity",
    Objects: "package",
    Symbols: "hash",
    Flags: "flag",
  };

export function EmojiPickerModal({
  open,
  onClose,
  onSelectEmoji,
}: {
  open: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}) {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>(CATEGORIES[0] ?? "");

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setCategory(CATEGORIES[0] ?? "");
  }, [open]);

  const renderEmojiItem = useCallback(({ item }: { item: EmojiItem }) => (
    <Pressable
      onPress={() => onSelectEmoji(item.emoji)}
      className="mb-2 items-center justify-center rounded-[16px] border"
      style={{
        width: `${100 / 8}%`,
        height: 46,
        borderColor: isDark
          ? "rgba(255,255,255,0.08)"
          : colors.borderSubtle,
        backgroundColor: colors.backgroundSecondary,
      }}
    >
      <Text className="text-[24px]">{item.emoji}</Text>
    </Pressable>
  ), [onSelectEmoji, isDark, colors.borderSubtle, colors.backgroundSecondary]);

  const normalizedQuery = query.trim().toLowerCase();
  const items = React.useMemo(() => {
    const categoryItems = category
      ? EMOJI_ITEMS.filter((item) => item.category === category)
      : EMOJI_ITEMS;
    if (!normalizedQuery) return categoryItems;
    return categoryItems
      .filter((item) => item.search.includes(normalizedQuery))
      .slice(0, 600);
  }, [category, normalizedQuery]);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          className="px-5 flex-row items-center justify-between"
          style={{ paddingTop: Math.max(insets.top + 10, 18), paddingBottom: 12 }}
        >
          <Pressable
            onPress={onClose}
            className="h-11 w-11 rounded-2xl items-center justify-center border"
            style={{
              borderColor: isDark
                ? "rgba(255,255,255,0.10)"
                : "rgba(15,23,42,0.06)",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(15,23,42,0.03)",
            }}
          >
            <Feather name="x" size={20} color={colors.text} />
          </Pressable>
          <Text
            className="text-base font-clash font-bold"
            style={{ color: colors.text }}
          >
            Emojis
          </Text>
          <View className="h-11 w-11" />
        </View>

        <View className="px-5 pb-4">
          <View
            className="rounded-[22px] border px-4 py-3 flex-row items-center gap-3"
            style={{
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.borderSubtle,
            }}
          >
            <Feather name="search" size={18} color={colors.textSecondary} />
            <TextInput
              placeholder="Search emojis (e.g. happy, soccer)"
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 15,
                fontFamily: "Outfit-Medium",
              }}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length ? (
              <Pressable onPress={() => setQuery("")}>
                <Feather name="x-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          <View className="mt-3 flex-row flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const selected = c === category;
              const icon = CATEGORY_ICONS[c] ?? "circle";
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  className="h-10 px-3 rounded-full border flex-row items-center gap-2"
                  style={{
                    borderColor: selected ? colors.accent : colors.borderSubtle,
                    backgroundColor: selected
                      ? isDark
                        ? "rgba(34,197,94,0.18)"
                        : "rgba(34,197,94,0.12)"
                      : colors.backgroundSecondary,
                  }}
                >
                  <Feather
                    name={icon}
                    size={16}
                    color={selected ? colors.accent : colors.textSecondary}
                  />
                  <Text
                    className="text-[12px] font-outfit font-bold"
                    style={{
                      color: selected ? colors.accent : colors.textSecondary,
                    }}
                  >
                    {c.split(" ")[0]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FlashList
          data={items}
          keyExtractor={(item) => item.key}
          numColumns={8}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom + 24, 28),
          }}
          renderItem={renderEmojiItem}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Modal>
  );
}
