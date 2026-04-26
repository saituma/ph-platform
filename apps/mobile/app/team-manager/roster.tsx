import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Shadows } from "@/constants/theme";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { Feather } from "@/components/ui/theme-icons";
import { fetchRoster, type RosterResponse } from "@/services/teamManager/rosterService";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

type Member = NonNullable<RosterResponse["members"]>[number];

function AthletePill({ member, onPress }: { member: Member; onPress: () => void }) {
  const { colors, isDark } = useAppTheme();
  const initials = getInitials(member.name);
  const typeLabel =
    member.athleteType === "youth"
      ? "Youth"
      : member.athleteType === "adult"
        ? "Adult"
        : null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 20,
          borderWidth: 1,
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          ...(isDark ? Shadows.none : Shadows.sm),
        }}
      >
        {/* Avatar circle */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accent + "22",
            marginRight: 14,
          }}
        >
          <Text style={{ color: colors.accent, fontFamily: "ClashDisplay-Bold", fontSize: 15 }}>
            {initials}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 15, fontFamily: "OutfitBold", color: colors.text }}
          >
            {member.name ?? `Athlete #${member.athleteId}`}
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, fontFamily: "Outfit", color: colors.textSecondary, marginTop: 2 }}
          >
            {[typeLabel, typeof member.age === "number" ? `${member.age}y` : null]
              .filter(Boolean)
              .join(" • ") || "—"}
          </Text>
        </View>

        <Feather
          name="chevron-right"
          size={18}
          color={isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.3)"}
        />
      </View>
    </Pressable>
  );
}

export default function TeamManagerRosterScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { token, appRole } = useAppSelector((state) => state.user);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  if (appRole !== "team_manager") {
    return <ReplaceOnce href="/(tabs)" />;
  }

  const [data, setData] = useState<RosterResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetchRoster(token, forceRefresh);
        setData(res ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load roster");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [bootstrapReady, token],
  );

  useEffect(() => {
    if (!canLoad) return;
    void load(false);
  }, [canLoad, load]);

  const teamName = data?.team?.name?.trim() || "My Team";
  const allMembers = useMemo(
    () => (Array.isArray(data?.members) ? data!.members! : []),
    [data],
  );
  const memberCount = data?.team?.memberCount ?? allMembers.length;

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allMembers;
    return allMembers.filter((m) => (m.name ?? "").toLowerCase().includes(q));
  }, [allMembers, search]);

  const isInitialLoading = loading && !data;

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
      <ThemedScrollView
        onRefresh={() => load(true)}
        contentContainerStyle={{ paddingBottom: 56 + insets.bottom }}
      >
        {/* Header */}
        <View style={{ paddingTop: 40, marginBottom: 24, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <View
              style={{ height: 32, width: 6, borderRadius: 99, backgroundColor: colors.accent }}
            />
            <Text
              numberOfLines={1}
              style={{ fontSize: 44, fontFamily: "TelmaBold", color: colors.text, letterSpacing: -0.5 }}
            >
              Roster
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontFamily: "Outfit", color: colors.textSecondary }}>
            {teamName}
            {memberCount > 0 ? ` • ${memberCount} member${memberCount !== 1 ? "s" : ""}` : ""}
          </Text>
        </View>

        {/* Search bar */}
        <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 14,
              borderWidth: 1,
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
              gap: 10,
            }}
          >
            <Feather name="search" size={18} color={colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search athletes…"
              placeholderTextColor={colors.textSecondary}
              style={{
                flex: 1,
                fontSize: 15,
                fontFamily: "Outfit",
                color: colors.text,
                paddingVertical: 0,
              }}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Feather name="x-circle" size={17} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={{ paddingHorizontal: 24, gap: 12 }}>
          {!canLoad ? (
            <Text style={{ fontSize: 14, fontFamily: "Outfit", color: colors.textSecondary }}>
              Waiting for auth bootstrap…
            </Text>
          ) : isInitialLoading ? (
            <>
              <Skeleton width="100%" height={72} borderRadius={20} />
              <Skeleton width="100%" height={72} borderRadius={20} />
              <Skeleton width="100%" height={72} borderRadius={20} />
            </>
          ) : error ? (
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                padding: 20,
                backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                borderColor: "rgba(239,68,68,0.2)",
              }}
            >
              <Text style={{ fontSize: 14, fontFamily: "Outfit", color: "#ef4444" }}>
                {error}
              </Text>
              <Pressable
                onPress={() => load(true)}
                style={{ marginTop: 12 }}
              >
                <Text style={{ fontSize: 14, fontFamily: "OutfitBold", color: colors.accent }}>
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : filteredMembers.length === 0 ? (
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                padding: 32,
                alignItems: "center",
                backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
              }}
            >
              <Feather name="users" size={36} color={colors.textSecondary} />
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "OutfitBold",
                  color: colors.text,
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                {search ? "No athletes match your search" : "No team members yet"}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Outfit",
                  color: colors.textSecondary,
                  marginTop: 6,
                  textAlign: "center",
                }}
              >
                {search ? "Try a different name" : "Athletes will appear here once they join."}
              </Text>
            </View>
          ) : (
            <>
              {loading && (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginBottom: 4 }} />
              )}
              {filteredMembers.map((member) => (
                <AthletePill
                  key={member.athleteId}
                  member={member}
                  onPress={() =>
                    router.push(`/team-manager/athlete/${member.athleteId}` as any)
                  }
                />
              ))}
            </>
          )}
        </View>
      </ThemedScrollView>
    </View>
  );
}
