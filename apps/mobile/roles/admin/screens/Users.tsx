import React, { useState, useMemo, useCallback } from "react";
import { View, Pressable, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useAppSelector } from "@/store/hooks";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Search, Users as UsersIcon, AlertCircle } from "lucide-react-native";

import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { AdminUserDetailModal } from "@/components/admin/AdminUserDetailModal";
import { AdminUser } from "@/types/admin";
import {
  AdminEmptyState,
  AdminHeader,
  AdminInput,
  AdminScreen,
  useAdminPastel,
} from "@/components/admin/AdminUI";

const CARD_COLORS = ["cardSage", "cardPeach", "cardLavender", "cardMint"] as const;

function isAiCoachUser(user: AdminUser) {
  const email = String(user.email ?? "").trim().toLowerCase();
  const name = String(user.name ?? "").trim().toLowerCase();
  return email === "ai-coach@football-performance.ai" || name === "ai coach";
}

function getRoleBadgeStyle(role: string, p: ReturnType<typeof useAdminPastel>) {
  switch (role.toLowerCase()) {
    case "admin":
      return { color: p.accent, bg: p.accentSoft };
    case "coach":
    case "team_coach":
      return { color: p.success, bg: `${p.success}18` };
    case "athlete":
      return { color: p.textSecondary, bg: p.cardMint };
    case "guardian":
      return { color: p.warning, bg: `${p.warning}18` };
    default:
      return { color: p.textMuted, bg: `${p.textMuted}18` };
  }
}

function formatJoinDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

const UserCard = React.memo(function UserCard({
  user,
  onPress,
  index,
}: {
  user: AdminUser;
  onPress: () => void;
  index: number;
}) {
  const p = useAdminPastel();
  const initial = (user.name?.trim().charAt(0) ?? user.email?.charAt(0) ?? "?").toUpperCase();
  const role = user.role ?? "user";
  const roleStyle = getRoleBadgeStyle(role, p);
  const joinLabel = formatJoinDate(user.createdAt);
  const cardColorKey = CARD_COLORS[index % CARD_COLORS.length];
  const cardBg = p[cardColorKey];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 16,
        gap: 14,
        backgroundColor: cardBg,
        borderRadius: 28,
        opacity: pressed ? 0.85 : 1,
        shadowColor: p.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
      })}
    >
      {/* Avatar */}
      {user.profilePicture ? (
        <Image
          source={{ uri: user.profilePicture }}
          style={{ width: 48, height: 48, borderRadius: 16, flexShrink: 0 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
        />
      ) : (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: p.cardWhite,
            flexShrink: 0,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 19,
              color: p.accent,
              lineHeight: 22,
            }}
          >
            {initial}
          </Text>
        </View>
      )}

      {/* Main info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary }}
          numberOfLines={1}
        >
          {user.name || "(no name)"}
        </Text>
        <Text
          style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary, marginTop: 2 }}
          numberOfLines={1}
        >
          {user.email}
        </Text>
        {(user.programTier || user.athleteType) && (
          <Text
            style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted, marginTop: 2 }}
            numberOfLines={1}
          >
            {[user.programTier, user.athleteType].filter(Boolean).join(" · ")}
          </Text>
        )}
      </View>

      {/* Right side */}
      <View style={{ alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            backgroundColor: roleStyle.bg,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 10,
              color: roleStyle.color,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {role}
          </Text>
        </View>
        {user.isBlocked ? (
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: p.danger, letterSpacing: 0.8 }}>
            BLOCKED
          </Text>
        ) : joinLabel ? (
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: p.textMuted }}>
            {joinLabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

export default function AdminUsersScreen() {
  const p = useAdminPastel();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const { users, loading, error, isBusy, load, updateBlockedStatus, deleteUser, updateProgramTier } = useAdminUsers(token, !!bootstrapReady);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const visibleUsers = useMemo(() => users.filter((u) => !isAiCoachUser(u)), [users]);

  const selectedUser = useMemo(() => visibleUsers.find(u => u.id === selectedUserId) ?? null, [visibleUsers, selectedUserId]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return visibleUsers;
    const q = searchQuery.toLowerCase().trim();
    return visibleUsers.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }, [visibleUsers, searchQuery]);

  const blockedCount = useMemo(() => visibleUsers.filter(u => u.isBlocked).length, [visibleUsers]);

  const renderItem = useCallback(
    ({ item, index }: { item: AdminUser; index: number }) => (
      <UserCard
        user={item}
        index={index}
        onPress={() => item.id != null && setSelectedUserId(item.id)}
      />
    ),
    [],
  );

  const ListHeader = useMemo(
    () => (
      <Animated.View entering={FadeInDown.delay(60).duration(360)} style={{ marginBottom: 18 }}>
        <AdminHeader
          title="Users"
          subtitle={
            loading && users.length === 0
              ? "Loading users"
              : `${visibleUsers.length} registered · ${blockedCount > 0 ? `${blockedCount} blocked` : "none blocked"}`
          }
        />
        <View style={{ paddingHorizontal: 20 }}>
          <AdminInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, email, or role"
            leftIcon={Search}
            onClear={() => setSearchQuery("")}
            autoCapitalize="none"
          />
        </View>
      </Animated.View>
    ),
    [loading, users.length, visibleUsers.length, blockedCount, searchQuery],
  );

  const ListEmpty = useMemo(
    () =>
      loading && users.length === 0 ? (
        <View style={{ paddingHorizontal: 24, gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={80} borderRadius={28} />
          ))}
        </View>
      ) : error ? (
        <View style={{ margin: 24, padding: 24, borderRadius: 28, backgroundColor: `${p.danger}10`, alignItems: "center" }}>
          <AlertCircle size={22} color={p.danger} style={{ marginBottom: 10 }} />
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.danger, textAlign: "center" }}>
            {error}
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 24 }}>
          <AdminEmptyState
            icon={UsersIcon}
            title={searchQuery ? "No matching users" : "No users found"}
            description={
              searchQuery
                ? "Clear the search or try another name, email, or role."
                : "Users will appear here after they register."
            }
          />
        </View>
      ),
    [loading, users.length, error, searchQuery, p.danger],
  );

  return (
    <AdminScreen>
      <FlashList<AdminUser>
        data={filteredUsers}
        keyExtractor={(u: AdminUser) => String(u.id)}
        renderItem={renderItem}
        estimatedItemSize={82}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={loading && users.length > 0}
            onRefresh={() => load(undefined, true)}
          />
        }
        keyboardShouldPersistTaps="handled"
      />

      <AdminUserDetailModal
        user={selectedUser}
        visible={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onToggleBlock={updateBlockedStatus}
        onDelete={deleteUser}
        onSaveTier={updateProgramTier}
        token={token}
        isBusy={isBusy}
      />
    </AdminScreen>
  );
}
