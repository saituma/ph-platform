import React, { useCallback, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  ChevronLeft,
  BarChart3,
  MapPin,
  Clock,
  Gauge,
  Heart,
  MessageCircle,
  ChevronDown,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import {
  fetchRunFeed,
  type SocialRunFeedItem,
  type SocialSort,
} from "@/services/tracking/socialService";

const SORT_OPTIONS: { label: string; value: SocialSort }[] = [
  { label: "Recent", value: "date_desc" },
  { label: "Longest", value: "distance_desc" },
  { label: "Most commented", value: "comments_desc" },
];

function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatPace(pace: number | null) {
  if (!pace || pace <= 0) return null;
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export default function TeamActivityScreen() {
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const { token, appRole } = useAppSelector((s) => s.user);

  const [items, setItems] = useState<SocialRunFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SocialSort>("date_desc");
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  if (appRole !== "team_manager") {
    return <ReplaceOnce href="/(tabs)" />;
  }

  const load = useCallback(
    async (reset = true) => {
      if (!token) return;
      try {
        const res = await fetchRunFeed(token, {
          limit: 20,
          cursor: reset ? null : nextCursor,
          sort,
          useTeamFeed: true,
        });
        if (reset) {
          setItems(res.items ?? []);
        } else {
          setItems((prev) => [...prev, ...(res.items ?? [])]);
        }
        setNextCursor(res.nextCursor ?? null);
      } catch {
        // silent
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token, sort, nextCursor],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(true);
    }, [token, sort]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    load(false);
  }, [nextCursor, loadingMore, load]);

  const totalRuns = items.length;
  const totalKm = items.reduce((sum, i) => sum + (i.distanceMeters ?? 0), 0) / 1000;

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      {/* Nav bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingBottom: 12,
          paddingTop: insets.top + 10,
          backgroundColor: p.pageBg,
          borderBottomWidth: 1,
          borderBottomColor: p.divider,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? p.accentSoft : p.cardWhite,
          })}
        >
          <ChevronLeft size={19} color={p.textSecondary} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontSize: 17,
            fontFamily: "Outfit-Bold",
            letterSpacing: -0.2,
            color: p.textPrimary,
          }}
        >
          Athlete Activity
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={p.accent}
            colors={[p.accent]}
          />
        }
      >
        {/* Sort pills */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setSort(opt.value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 100,
                backgroundColor: sort === opt.value ? p.accent : p.cardWhite,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Outfit-Bold",
                  color: sort === opt.value ? p.buttonPrimaryText : p.textSecondary,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Summary */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <View
            style={{
              flex: 1,
              borderRadius: 16,
              backgroundColor: p.cardWhite,
              padding: 14,
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 22, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
              {totalRuns}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted }}>
              Runs
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              borderRadius: 16,
              backgroundColor: p.cardWhite,
              padding: 14,
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 22, fontFamily: "Outfit-Bold", color: p.accent }}>
              {totalKm.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted }}>
              Total km
            </Text>
          </View>
        </View>

        {loading && items.length === 0 ? (
          <LoadingPlaceholder />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <Animated.View entering={FadeInDown.duration(280)} style={{ gap: 12 }}>
            {items.map((run) => (
              <RunCard key={run.runLogId} run={run} />
            ))}

            {nextCursor && (
              <Pressable
                onPress={loadMore}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 14,
                  borderRadius: 100,
                  backgroundColor: p.accentSoft,
                  opacity: pressed || loadingMore ? 0.6 : 1,
                })}
              >
                <ChevronDown size={16} color={p.accent} />
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: p.accent }}>
                  {loadingMore ? "Loading..." : "Load more"}
                </Text>
              </Pressable>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function RunCard({ run }: { run: SocialRunFeedItem }) {
  const p = useAdminPastel();
  const initials = (run.name ?? "?")
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const pace = formatPace(run.avgPace);

  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: p.cardWhite,
        padding: 16,
      }}
    >
      {/* Header: avatar + name + date */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: p.cardSage,
            overflow: "hidden",
          }}
        >
          {run.avatarUrl ? (
            <Image
              source={{ uri: run.avatarUrl }}
              style={{ width: 36, height: 36 }}
            />
          ) : (
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Outfit-Bold",
                color: p.accent,
              }}
            >
              {initials}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 14,
              fontFamily: "Outfit-Bold",
              color: p.textPrimary,
            }}
          >
            {run.name}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Outfit-Regular",
              color: p.textMuted,
            }}
          >
            {formatDate(run.date)}
          </Text>
        </View>
      </View>

      {/* Stats grid */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <StatChip
          icon={MapPin}
          value={formatDistance(run.distanceMeters)}
          accent={p.accent}
        />
        <StatChip
          icon={Clock}
          value={formatDuration(run.durationSeconds)}
          accent={p.info}
        />
        {pace && (
          <StatChip icon={Gauge} value={pace} accent={p.warning} />
        )}
      </View>

      {/* Engagement row */}
      {((run.likeCount ?? 0) > 0 || (run.commentCount ?? 0) > 0) && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: p.divider,
          }}
        >
          {(run.likeCount ?? 0) > 0 && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Heart
                size={13}
                color={run.userLiked ? p.danger : p.textMuted}
                fill={run.userLiked ? p.danger : "transparent"}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Outfit-Regular",
                  color: p.textSecondary,
                }}
              >
                {run.likeCount}
              </Text>
            </View>
          )}
          {(run.commentCount ?? 0) > 0 && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <MessageCircle size={13} color={p.textMuted} />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Outfit-Regular",
                  color: p.textSecondary,
                }}
              >
                {run.commentCount}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function StatChip({
  icon: Icon,
  value,
  accent,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  value: string;
  accent: string;
}) {
  const p = useAdminPastel();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 100,
        backgroundColor: `${accent}12`,
      }}
    >
      <Icon size={12} color={accent} />
      <Text
        style={{
          fontSize: 12,
          fontFamily: "Outfit-Bold",
          color: accent,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function EmptyState() {
  const p = useAdminPastel();
  return (
    <View
      style={{
        borderRadius: 22,
        backgroundColor: p.cardSage,
        padding: 32,
        alignItems: "center",
        gap: 10,
      }}
    >
      <BarChart3 size={36} color={p.textMuted} />
      <Text
        style={{
          fontSize: 16,
          fontFamily: "Outfit-Bold",
          color: p.textPrimary,
          textAlign: "center",
        }}
      >
        No runs logged yet
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontFamily: "Outfit-Regular",
          color: p.textSecondary,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        When athletes track their runs, their activity will show up here.
      </Text>
    </View>
  );
}

function LoadingPlaceholder() {
  const p = useAdminPastel();
  return (
    <View style={{ gap: 12 }}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            borderRadius: 18,
            backgroundColor: p.cardWhite,
            height: 100,
            opacity: 0.5,
          }}
        />
      ))}
    </View>
  );
}
