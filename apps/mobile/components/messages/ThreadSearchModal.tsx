import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Modal, Pressable, TextInput, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import Animated, { FadeIn } from "react-native-reanimated";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Feather } from "@/components/ui/theme-icons";
import { fonts } from "@/constants/theme";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { apiRequest } from "@/lib/api";

type SearchResult = {
  id: number; content: string; senderId: number;
  receiverId: number; createdAt: string; contentType: string;
};

type Props = {
  visible: boolean;
  threadId: string; // "123" for DM, "group:45" for group
  token?: string | null;
  onClose: () => void;
  onJumpToMessage: (messageId: number) => void;
};

function buildSearchUrl(threadId: string, query: string) {
  const q = encodeURIComponent(query);
  if (threadId.startsWith("group:")) {
    return `/chat/groups/${threadId.slice(6)}/messages/search?q=${q}`;
  }
  return `/messages/search?q=${q}&threadId=${threadId}`;
}

function HighlightedText({ text, highlight, baseColor, accentColor }: {
  text: string; highlight: string; baseColor: string; accentColor: string;
}) {
  if (!highlight.trim()) return <Text style={{ color: baseColor }}>{text}</Text>;
  const re = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(re);
  return (
    <Text>
      {parts.map((part, i) =>
        re.test(part)
          ? <Text key={i} style={{ color: accentColor, fontFamily: fonts.bodyBold }}>{part}</Text>
          : <Text key={i} style={{ color: baseColor }}>{part}</Text>,
      )}
    </Text>
  );
}

function formatTs(iso: string) {
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ThreadSearchModal({ visible, threadId, token, onClose, onJumpToMessage }: Props) {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (visible) {
      setQuery(""); setResults([]); setError(null); setSearched(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim() || !token) { setResults([]); setSearched(false); return; }
    setLoading(true); setError(null);
    try {
      const data = await apiRequest<{ results: SearchResult[] }>(buildSearchUrl(threadId, q), { token });
      setResults(data.results); setSearched(true);
    } catch {
      setError("Search failed. Please try again."); setResults([]); setSearched(true);
    } finally { setLoading(false); }
  }, [threadId, token]);

  const onChangeText = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(text), 300);
  }, [performSearch]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleSelect = useCallback((id: number) => {
    Keyboard.dismiss(); onJumpToMessage(id); onClose();
  }, [onJumpToMessage, onClose]);

  const surface = isDark ? colors.surfaceHigh : colors.surface;
  const tp = colors.textPrimary;
  const ts = colors.textSecondary;
  const ac = colors.accent;

  const renderItem = useCallback(({ item }: { item: SearchResult }) => (
    <Pressable
      onPress={() => handleSelect(item.id)}
      style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.borderSubtle }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ color: tp, fontFamily: fonts.labelBold, fontSize: 14 }}>#{item.senderId}</Text>
        <Text style={{ color: ts, fontFamily: fonts.bodyRegular, fontSize: 12 }}>{formatTs(item.createdAt)}</Text>
      </View>
      <HighlightedText text={item.content} highlight={query} baseColor={ts} accentColor={ac} />
    </Pressable>
  ), [handleSelect, query, tp, ts, ac, colors.borderSubtle]);

  const CenterMsg = ({ text, color }: { text: string; color: string }) => (
    <View style={{ paddingTop: 40, alignItems: "center", paddingHorizontal: 24 }}>
      <Text style={{ color, fontFamily: fonts.bodyRegular, fontSize: 14 }}>{text}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        {/* Search bar */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 0.5, borderBottomColor: colors.borderSubtle }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: surface, borderRadius: 10, paddingHorizontal: 10, height: 38 }}>
            <Feather name="search" size={16} color={ts} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={onChangeText}
              placeholder="Search in conversation..."
              placeholderTextColor={ts}
              style={{ flex: 1, marginLeft: 8, color: tp, fontFamily: fonts.bodyRegular, fontSize: 15, padding: 0 }}
              returnKeyType="search"
              autoCorrect={false}
            />
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ color: ac, fontFamily: fonts.labelMedium, fontSize: 15 }}>Cancel</Text>
          </Pressable>
        </View>

        {/* States */}
        {loading && <View style={{ paddingTop: 40, alignItems: "center" }}><ActivityIndicator color={ac} /></View>}
        {error && <CenterMsg text={error} color={colors.coral} />}
        {!loading && !error && searched && results.length === 0 && <CenterMsg text="No messages found" color={ts} />}

        {/* Results */}
        <FlashList
          data={results}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom }}
        />
      </Animated.View>
    </Modal>
  );
}
