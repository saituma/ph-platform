import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  TextInput,
  View,
  Linking,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Image as ExpoImage } from "expo-image";
import * as Clipboard from "expo-clipboard";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";

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
  const insets = useAppSafeAreaInsets();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GifResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<GifResult | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const optionsRef = React.useRef<BottomSheetModal>(null);

  const normalizedQuery = query.trim();
  const isTrending = !normalizedQuery;

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

  React.useEffect(() => {
    const modal = optionsRef.current;
    if (!modal) return;
    if (selected) modal.present();
    else modal.dismiss();
  }, [selected]);

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
            {query.length ? (
              <Pressable
                onPress={() => setQuery("")}
                className="h-8 w-8 items-center justify-center"
              >
                <Feather
                  name="x-circle"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            ) : null}
            {loading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : null}
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom + 24, 28),
          }}
          ListHeaderComponent={
            <View className="mb-4">
              <Text
                className="text-[11px] font-outfit font-bold uppercase tracking-[1.2px]"
                style={{ color: colors.textSecondary }}
              >
                {isTrending ? "Trending" : "Results"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelectGif(item.url)}
              onLongPress={() => setSelected(item)}
              delayLongPress={220}
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
                source={{ uri: item.previewUrl }}
                style={{ width: "100%", height: 140 }}
                contentFit="cover"
                transition={180}
              />
            </Pressable>
          )}
          ListEmptyComponent={
            loading ? (
              <View className="flex-1 items-center justify-center pt-16">
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : (
              <View className="flex-1 items-center justify-center px-8 pt-16">
                <Text
                  className="text-sm font-outfit text-center"
                  style={{ color: colors.textSecondary }}
                >
                  {isTrending
                    ? "No GIFs available right now."
                    : "No matches. Try a different search."}
                </Text>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        <BottomSheetModal
          ref={optionsRef}
          index={0}
          snapPoints={["42%"]}
          onDismiss={() => setSelected(null)}
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
          <BottomSheetView className="px-6 pb-8">
            {selected ? (
              <>
                <View className="rounded-[22px] overflow-hidden border"
                  style={{ borderColor: colors.borderSubtle, backgroundColor: colors.backgroundSecondary }}
                >
                  <ExpoImage
                    source={{ uri: selected.previewUrl }}
                    style={{ width: "100%", height: 140 }}
                    contentFit="cover"
                    transition={180}
                  />
                </View>

                <View className="mt-5 flex-row gap-3">
                  <Pressable
                    onPress={() => {
                      const gif = selected;
                      setSelected(null);
                      onSelectGif(gif.url);
                    }}
                    className="flex-1 h-12 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <Text className="font-outfit font-bold text-white">Send</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setPreviewOpen(true)}
                    className="h-12 w-12 rounded-2xl items-center justify-center border"
                    style={{ borderColor: colors.borderSubtle, backgroundColor: colors.backgroundSecondary }}
                  >
                    <Feather name="maximize-2" size={18} color={colors.text} />
                  </Pressable>
                </View>

                <View className="mt-3 flex-row gap-3">
                  <Pressable
                    onPress={async () => {
                      try {
                        await Clipboard.setStringAsync(selected.url);
                      } finally {
                        setSelected(null);
                      }
                    }}
                    className="flex-1 h-12 rounded-2xl items-center justify-center border flex-row gap-2"
                    style={{ borderColor: colors.borderSubtle, backgroundColor: colors.backgroundSecondary }}
                  >
                    <Feather name="copy" size={18} color={colors.textSecondary} />
                    <Text className="font-outfit font-bold" style={{ color: colors.text }}>
                      Copy link
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      try {
                        await Linking.openURL(selected.url);
                      } finally {
                        setSelected(null);
                      }
                    }}
                    className="flex-1 h-12 rounded-2xl items-center justify-center border flex-row gap-2"
                    style={{ borderColor: colors.borderSubtle, backgroundColor: colors.backgroundSecondary }}
                  >
                    <Feather name="external-link" size={18} color={colors.textSecondary} />
                    <Text className="font-outfit font-bold" style={{ color: colors.text }}>
                      Open
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </BottomSheetView>
        </BottomSheetModal>

        <Modal
          visible={previewOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewOpen(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}
            onPress={() => setPreviewOpen(false)}
          >
            <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}>
              {selected ? (
                <ExpoImage
                  source={{ uri: selected.url }}
                  style={{ width: "100%", height: 320, borderRadius: 20 }}
                  contentFit="contain"
                />
              ) : null}
              <View className="mt-4 items-center">
                <Text className="text-[12px] font-outfit" style={{ color: "rgba(255,255,255,0.75)" }}>
                  Tap anywhere to close
                </Text>
              </View>
            </View>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}
