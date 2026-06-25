import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { KeyboardAvoidingView } from "@/components/native/KeyboardAvoidingView";
import { router } from "expo-router";
import {
  Users,
  ChevronRight,
  Search,
  XCircle,
  AlertCircle,
} from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Skeleton } from "@/components/Skeleton";
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
  const p = useAdminPastel();
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
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 22,
        backgroundColor: p.cardWhite,
        paddingHorizontal: 16,
        paddingVertical: 14,
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: p.accentSoft,
          marginRight: 14,
        }}
      >
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.accent }}>{initials}</Text>
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontFamily: "Outfit-Bold",
            color: p.textPrimary,
          }}
        >
          {member.name ?? `Athlete #${member.athleteId}`}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 12,
            fontFamily: "Outfit-Regular",
            color: p.textMuted,
          }}
        >
          {[typeLabel, typeof member.age === "number" ? `${member.age}y` : null]
            .filter(Boolean)
            .join(" · ") || "—"}
        </Text>
      </View>

      <ChevronRight size={16} color={p.textMuted} />
    </Pressable>
  );
}

export default function TeamManagerRosterScreen() {
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const { token, appRole } = useAppSelector((state) => state.user);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const isTeamManager = appRole === "team_manager";
  const canLoad = Boolean(token && bootstrapReady && isTeamManager);

  const [data, setData] = useState<RosterResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(
    async (_forceRefresh?: boolean) => {
      if (!token || !bootstrapReady || !isTeamManager) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetchRoster(token);
        setData(res ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load roster");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [bootstrapReady, isTeamManager, token],
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
  const showMemberRows = canLoad && !isInitialLoading && !error && filteredMembers.length > 0;

  const renderMember = useCallback(
    ({ item }: { item: Member; }) => (
      <AthletePill
        member={item}
        onPress={() => router.push(`/team-manager/athlete/${item.athleteId}` as any)}
      />
    ),
    [],
  );

  const ListHeader = useCallback(
    () => (
      <View>
        <View style={{ paddingTop: 36, paddingHorizontal: 24, marginBottom: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  height: 32,
                  width: 6,
                  borderRadius: 100,
                  backgroundColor: p.accent,
                }}
              />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 40,
                  fontFamily: "Outfit-Bold",
                  letterSpacing: -0.5,
                  color: p.textPrimary,
                }}
              >
                Roster
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", lineHeight: 20, color: p.textSecondary }}>
            {teamName}
            {memberCount > 0 ? ` · ${memberCount} member${memberCount !== 1 ? "s" : ""}` : ""}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 22,
              backgroundColor: p.inputBg,
              paddingHorizontal: 14,
              paddingVertical: 11,
              gap: 10,
            }}
          >
            <Search size={18} color={p.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search athletes..."
              placeholderTextColor={p.textMuted}
              style={{
                flex: 1,
                fontSize: 15,
                fontFamily: "Outfit-Regular",
                paddingVertical: 0,
                color: p.textPrimary,
              }}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <XCircle size={17} color={p.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {loading && data ? (
          <ActivityIndicator
            size="small"
            color={p.accent}
            style={{ marginBottom: 12 }}
          />
        ) : null}
      </View>
    ),
    [data, loading, memberCount, p, search, teamName],
  );

  const EmptyState = useCallback(() => {
    if (!canLoad) {
      return (
        <View style={{ paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textMuted }}>
            Waiting for auth bootstrap...
          </Text>
        </View>
      );
    }

    if (isInitialLoading) {
      return (
        <View style={{ paddingHorizontal: 24, gap: 10 }}>
          <Skeleton width="100%" height={76} borderRadius={22} />
          <Skeleton width="100%" height={76} borderRadius={22} />
          <Skeleton width="100%" height={76} borderRadius={22} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={{ paddingHorizontal: 24 }}>
          <View
            style={{
              borderRadius: 22,
              backgroundColor: p.dangerSoft,
              padding: 32,
              alignItems: "center",
            }}
          >
            <AlertCircle size={28} color={p.danger} />
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Outfit-Bold",
                textAlign: "center",
                color: p.danger,
                marginTop: 10,
              }}
            >
              {error}
            </Text>
            <Pressable
              onPress={() => load(true)}
              style={{ marginTop: 14, paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: p.accent }}>Try again</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: 24 }}>
        <View
          style={{
            borderRadius: 22,
            backgroundColor: p.cardWhite,
            padding: 32,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: p.accentSoft,
              marginBottom: 16,
            }}
          >
            <Users size={32} color={p.accent} />
          </View>
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Outfit-Bold",
              textAlign: "center",
              color: p.textPrimary,
            }}
          >
            {search ? "No athletes match your search" : "No team members yet"}
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Outfit-Regular",
              marginTop: 6,
              textAlign: "center",
              lineHeight: 20,
              color: p.textSecondary,
            }}
          >
            {search
              ? "Try a different name"
              : "Athletes will appear here once they join your team."}
          </Text>
        </View>
      </View>
    );
  }, [canLoad, data, error, isInitialLoading, load, p, search]);

  if (!isTeamManager) {
    return <ReplaceOnce href="/(tabs)" />;
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: p.pageBg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <FlashList
        data={showMemberRows ? filteredMembers : []}
        renderItem={renderMember}
        keyExtractor={(item: Member) => String(item.athleteId)}
        estimatedItemSize={72}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom, paddingHorizontal: showMemberRows ? 24 : 0 }}
        refreshControl={
          <RefreshControl
            refreshing={loading && Boolean(data)}
            onRefresh={() => load(true)}
            tintColor={p.accent}
          />
        }
      />
      </KeyboardAvoidingView>
    </View>
  );
}
