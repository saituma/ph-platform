import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Feather } from "@/components/ui/theme-icons";
import { apiRequest } from "@/lib/api";

type GifResult = {
  id: string;
  url: string;
  previewUrl: string;
};

export function GifPickerModal({
  open,
  onClose,
  token,
  onSelectGif,
}: {
  open: boolean;
  onClose: () => void;
  token: string | null;
  onSelectGif: (url: string) => void;
}) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GifResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  const search = React.useCallback(
    async (value: string) => {
      if (!token) return;
      const clean = value.trim();
      setLoading(true);
      try {
        const res = await apiRequest<{ results?: GifResult[] }>(
          `/giphy/search?q=${encodeURIComponent(clean)}`,
          {
            token,
            suppressStatusCodes: [400, 401, 403, 404, 429],
            skipCache: true,
          },
        );
        setResults(Array.isArray(res?.results) ? res.results : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    void search("");
  }, [open, search]);

  // Debounced search
  React.useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      void search(query);
    }, 250);
    return () => clearTimeout(id);
  }, [open, query, search]);

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
          <View className="flex-1 px-4">
            <Text
              className="text-base font-clash font-bold text-center"
              style={{ color: colors.text }}
            >
              GIFs
            </Text>
            <Text
              className="mt-0.5 text-[12px] font-outfit text-center"
              style={{ color: colors.textSecondary }}
            >
              Powered by GIPHY
            </Text>
          </View>
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
              placeholder="Search GIFs (e.g. celebration)"
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
            {loading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : null}
          </View>
        </View>

        <View className="flex-1 px-5">
          {results.length ? (
            <View className="flex-row flex-wrap justify-between">
              {results.map((gif) => (
                <Pressable
                  key={gif.id}
                  onPress={() => onSelectGif(gif.url)}
                  className="mb-3 overflow-hidden rounded-[18px] border"
                  style={{
                    width: "48%",
                    borderColor: colors.borderSubtle,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(15,23,42,0.03)",
                  }}
                >
                  <ExpoImage
                    source={{ uri: gif.previewUrl }}
                    style={{ width: "100%", height: 140 }}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </View>
          ) : loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <View className="flex-1 items-center justify-center px-8">
              <Text
                className="text-sm font-outfit text-center"
                style={{ color: colors.textSecondary }}
              >
                Search to find a GIF to send.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

