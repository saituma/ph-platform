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
  Trophy,
  Medal,
  TrendingUp,
  Timer,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import {
  fetchLeaderboard,
  type SocialLeaderboardItem,
} from "@/services/tracking/socialService";

const WINDOW_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "All time", value: 0 },
] as const;

export default function TeamLeaderboardScreen() {
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const { token, appRole } = useAppSelector((s) => s.user);

  const [items, setItems] = useState<SocialLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [windowDays, setWindowDays] = useState(7);

  if (appRole !== "team_manager") {
    return <ReplaceOnce href="/(tabs)" />;
  }

  const load = useCallback(
    async (force = false) => {
      if (!token) return;
      try {
        const res = await fetchLeaderboard(token, {
          windowDays,
          limit: 100,
          useTeamFeed: true,
        });
        setItems(res.items ?? []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [token, windowDays],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const totalKm = items.reduce((sum, i) => sum + (i.kmTotal ?? 0), 0);
  const totalMinutes = items.reduce((sum, i) => sum + (i.durationMinutesTotal ?? 0), 0);

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
          Leaderboard
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
        {/* Window picker */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {WINDOW_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setWindowDays(opt.value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 100,
                backgroundColor:
                  windowDays === opt.value ? p.accent : p.cardWhite,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Outfit-Bold",
                  color:
                    windowDays === opt.value
                      ? p.buttonPrimaryText
                      : p.textSecondary,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Team totals */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <View
            style={{
              flex: 1,
              borderRadius: 16,
              backgroundColor: p.cardWhite,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: `${p.accent}18`,
              }}
            >
              <TrendingUp size={18} color={p.accent} />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Outfit-Bold",
                  color: p.textPrimary,
                }}
              >
                {totalKm.toFixed(1)} km
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Outfit-Regular",
                  color: p.textMuted,
                }}
              >
                Team total
              </Text>
            </View>
          </View>
          <View
            style={{
              flex: 1,
              borderRadius: 16,
              backgroundColor: p.cardWhite,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: `${p.info}18`,
              }}
            >
              <Timer size={18} color={p.info} />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Outfit-Bold",
                  color: p.textPrimary,
                }}
              >
                {Math.round(totalMinutes)}m
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Outfit-Regular",
                  color: p.textMuted,
                }}
              >
                Total time
              </Text>
            </View>
          </View>
        </View>

        {loading && items.length === 0 ? (
          <LoadingPlaceholder />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <Animated.View entering={FadeInDown.duration(280)} style={{ gap: 8 }}>
            {/* Top 3 podium */}
            {items.length >= 3 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <PodiumCard item={items[1]} rank={2} />
                <PodiumCard item={items[0]} rank={1} isFirst />
                <PodiumCard item={items[2]} rank={3} />
              </View>
            )}

            {/* Remaining list */}
            <View
              style={{
                borderRadius: 22,
                backgroundColor: p.cardWhite,
                overflow: "hidden",
              }}
            >
              {(items.length < 3 ? items : items.slice(3)).map(
                (item, index) => (
                  <LeaderboardRow
                    key={item.userId}
                    item={item}
                    rank={items.length < 3 ? index + 1 : index + 4}
                    isFirst={index === 0}
                  />
                ),
              )}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function PodiumCard({
  item,
  rank,
  isFirst,
}: {
  item: SocialLeaderboardItem;
  rank: number;
  isFirst?: boolean;
}) {
  const p = useAdminPastel();
  const medalColor =
    rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : "#CD7F32";
  const initials = (item.name ?? "?")
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        paddingTop: isFirst ? 0 : 20,
      }}
    >
      <View
        style={{
          borderRadius: 18,
          backgroundColor: p.cardWhite,
          padding: 14,
          alignItems: "center",
          gap: 6,
          width: "100%",
          borderWidth: isFirst ? 2 : 0,
          borderColor: medalColor,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -10,
            alignSelf: "center",
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: medalColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Outfit-Bold",
              color: "#fff",
            }}
          >
            {rank}
          </Text>
        </View>
        <View
          style={{
            width: isFirst ? 48 : 40,
            height: isFirst ? 48 : 40,
            borderRadius: isFirst ? 16 : 13,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: p.cardSage,
            overflow: "hidden",
            marginTop: 6,
          }}
        >
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <Text
              style={{
                fontSize: isFirst ? 16 : 14,
                fontFamily: "Outfit-Bold",
                color: p.accent,
              }}
            >
              {initials}
            </Text>
          )}
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 12,
            fontFamily: "Outfit-Bold",
            color: p.textPrimary,
            textAlign: "center",
          }}
        >
          {item.name?.split(" ")[0]}
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Outfit-Bold",
            color: p.accent,
          }}
        >
          {item.kmTotal.toFixed(1)} km
        </Text>
      </View>
    </View>
  );
}

function LeaderboardRow({
  item,
  rank,
  isFirst,
}: {
  item: SocialLeaderboardItem;
  rank: number;
  isFirst: boolean;
}) {
  const p = useAdminPastel();
  const initials = (item.name ?? "?")
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View>
      {!isFirst && (
        <View
          style={{ height: 1, backgroundColor: p.divider, marginLeft: 66 }}
        />
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 12,
        }}
      >
        <Text
          style={{
            width: 24,
            fontSize: 14,
            fontFamily: "Outfit-Bold",
            color: p.textMuted,
            textAlign: "center",
          }}
        >
          {rank}
        </Text>
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
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
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
            {item.name}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Outfit-Regular",
              color: p.textMuted,
            }}
          >
            {Math.round(item.durationMinutesTotal)}min
          </Text>
        </View>
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Outfit-Bold",
            color: p.accent,
          }}
        >
          {item.kmTotal.toFixed(1)} km
        </Text>
      </View>
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
      <Trophy size={36} color={p.textMuted} />
      <Text
        style={{
          fontSize: 16,
          fontFamily: "Outfit-Bold",
          color: p.textPrimary,
          textAlign: "center",
        }}
      >
        No activity yet
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
        When your athletes log runs, rankings will appear here.
      </Text>
    </View>
  );
}

function LoadingPlaceholder() {
  const p = useAdminPastel();
  return (
    <View style={{ gap: 8 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={{
            borderRadius: 18,
            backgroundColor: p.cardWhite,
            height: 60,
            opacity: 0.5,
          }}
        />
      ))}
    </View>
  );
}
