import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
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

  const cardBg = isDark ? "hsl(220, 8%, 13%)" : "#fff";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View
        style={[
          styles.pillAvatar,
          { backgroundColor: isDark ? `${colors.accent}20` : `${colors.accent}18` },
        ]}
      >
        <Text style={[styles.pillInitials, { color: colors.accent }]}>{initials}</Text>
      </View>

      <View style={styles.pillInfo}>
        <Text
          numberOfLines={1}
          style={[
            styles.pillName,
            { color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,10%)" },
          ]}
        >
          {member.name ?? `Athlete #${member.athleteId}`}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.pillMeta,
            { color: isDark ? "hsl(220,5%,50%)" : "hsl(220,5%,48%)" },
          ]}
        >
          {[typeLabel, typeof member.age === "number" ? `${member.age}y` : null]
            .filter(Boolean)
            .join(" · ") || "—"}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={16}
        color={isDark ? "hsl(220,5%,35%)" : "hsl(220,5%,60%)"}
      />
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

  const labelColor = isDark ? "hsl(220, 5%, 52%)" : "hsl(220, 5%, 46%)";
  const cardBg = isDark ? "hsl(220, 8%, 13%)" : "#fff";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)";
  const screenBg = isDark ? colors.background : "#F4F6F8";

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

  const goAddAthlete = useCallback(() => {
    router.push("/team-manager/add-athlete" as any);
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      <ThemedScrollView
        onRefresh={() => load(true)}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.titleAccent, { backgroundColor: colors.accent }]} />
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  { color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)" },
                ]}
              >
                Roster
              </Text>
            </View>

            {/* Add athlete button in header */}
            <Pressable
              onPress={goAddAthlete}
              accessibilityLabel="Add athlete"
              style={({ pressed }) => [
                styles.headerAddBtn,
                {
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.82 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <Ionicons name="person-add" size={16} color="#000" />
              <Text style={styles.headerAddBtnText}>Add Athlete</Text>
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: labelColor }]}>
            {teamName}
            {memberCount > 0 ? ` · ${memberCount} member${memberCount !== 1 ? "s" : ""}` : ""}
          </Text>
        </View>

        {/* ── Search bar ── */}
        <View style={styles.searchWrap}>
          <View
            style={[
              styles.searchInner,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={labelColor} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search athletes…"
              placeholderTextColor={labelColor}
              style={[
                styles.searchInput,
                { color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)" },
              ]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={17} color={labelColor} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Content ── */}
        <View style={styles.list}>
          {!canLoad ? (
            <Text style={[styles.waitText, { color: labelColor }]}>
              Waiting for auth bootstrap…
            </Text>
          ) : isInitialLoading ? (
            <>
              <Skeleton width="100%" height={76} borderRadius={20} />
              <Skeleton width="100%" height={76} borderRadius={20} />
              <Skeleton width="100%" height={76} borderRadius={20} />
            </>
          ) : error ? (
            <View style={[styles.stateCard, { backgroundColor: cardBg, borderColor: "rgba(239,68,68,0.18)" }]}>
              <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
              <Text style={[styles.stateTitle, { color: colors.danger, marginTop: 10 }]}>
                {error}
              </Text>
              <Pressable onPress={() => load(true)} style={styles.stateAction}>
                <Text style={[styles.stateActionText, { color: colors.accent }]}>Try again</Text>
              </Pressable>
            </View>
          ) : filteredMembers.length === 0 ? (
            <View style={[styles.stateCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? `${colors.accent}15` : `${colors.accent}12` }]}>
                <Ionicons name="people-outline" size={32} color={colors.accent} />
              </View>
              <Text
                style={[
                  styles.stateTitle,
                  { color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,10%)" },
                ]}
              >
                {search ? "No athletes match your search" : "No team members yet"}
              </Text>
              <Text style={[styles.stateSub, { color: labelColor }]}>
                {search
                  ? "Try a different name"
                  : "Add your first athlete to get started."}
              </Text>
              {!search && (
                <Pressable
                  onPress={goAddAthlete}
                  style={({ pressed }) => [
                    styles.emptyAddBtn,
                    { backgroundColor: colors.accent, opacity: pressed ? 0.82 : 1 },
                  ]}
                >
                  <Ionicons name="person-add-outline" size={16} color="#000" />
                  <Text style={styles.emptyAddBtnText}>Add First Athlete</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              {loading && (
                <ActivityIndicator
                  size="small"
                  color={colors.accent}
                  style={{ marginBottom: 4 }}
                />
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

      {/* ── Floating Add Button ── */}
      <Pressable
        onPress={goAddAthlete}
        accessibilityLabel="Add athlete"
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.accent,
            bottom: insets.bottom + 82,
            shadowColor: colors.accent,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Ionicons name="add" size={28} color="#000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingTop: 36,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleAccent: {
    height: 32,
    width: 6,
    borderRadius: 99,
  },
  title: {
    fontSize: 40,
    fontFamily: "TelmaBold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Outfit",
    lineHeight: 20,
  },
  headerAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  headerAddBtnText: {
    fontSize: 13,
    fontFamily: "Outfit-SemiBold",
    color: "#000",
  },
  searchWrap: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  searchInner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Outfit",
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: 24,
    gap: 10,
  },
  waitText: {
    fontSize: 14,
    fontFamily: "Outfit",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pillAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  pillInitials: {
    fontFamily: "ClashDisplay-Bold",
    fontSize: 15,
  },
  pillInfo: {
    flex: 1,
    gap: 3,
  },
  pillName: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  pillMeta: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  stateCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
  },
  stateSub: {
    fontSize: 13,
    fontFamily: "Outfit",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  stateAction: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stateActionText: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontFamily: "Outfit-SemiBold",
    color: "#000",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});
