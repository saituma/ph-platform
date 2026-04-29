import React, { useEffect, useState, useMemo } from "react";
import { View, Pressable, Image } from "react-native";
import { useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@/components/ui/theme-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Search, Users as UsersIcon } from "lucide-react-native";

import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { AdminUserDetailModal } from "@/components/admin/AdminUserDetailModal";
import { AdminUser } from "@/types/admin";
import {
  AdminEmptyState,
  AdminHeader,
  AdminInput,
  AdminScreen,
} from "@/components/admin/AdminUI";

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  admin: { color: "#7B61FF", bg: "rgba(123,97,255,0.12)" },
  coach: { color: "#30B0C7", bg: "rgba(48,176,199,0.12)" },
  athlete: { color: "#34C759", bg: "rgba(52,199,89,0.12)" },
  guardian: { color: "#FFB020", bg: "rgba(255,176,32,0.12)" },
  team_coach: { color: "#FF6B6B", bg: "rgba(255,107,107,0.12)" },
};

function getInitialColor(name: string | null | undefined): string {
  const colors = ["#30B0C7", "#7B61FF", "#34C759", "#FFB020", "#FF6B6B"];
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
  return colors[idx];
}

function formatJoinDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function UserCard({
  user,
  onPress,
  isDark,
}: {
  user: AdminUser;
  onPress: () => void;
  isDark: boolean;
}) {
  const initial = (user.name?.trim().charAt(0) ?? user.email?.charAt(0) ?? "?").toUpperCase();
  const accentColor = getInitialColor(user.name ?? user.email);
  const role = user.role ?? "user";
  const roleStyle = ROLE_COLORS[role.toLowerCase()] ?? { color: "#888", bg: "rgba(136,136,136,0.12)" };
  const joinLabel = formatJoinDate(user.createdAt);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 14,
        backgroundColor: isDark
          ? pressed ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)"
          : pressed ? "rgba(15,23,42,0.04)" : "rgba(15,23,42,0.02)",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
      })}
    >
      {/* Avatar */}
      {user.profilePicture ? (
        <Image
          source={{ uri: user.profilePicture }}
          style={{ width: 48, height: 48, borderRadius: 15, flexShrink: 0 }}
        />
      ) : (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${accentColor}20`,
            borderWidth: 1,
            borderColor: `${accentColor}30`,
            flexShrink: 0,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 19,
              color: accentColor,
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
          style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: isDark ? "#F8FAFC" : "#0F172A" }}
          numberOfLines={1}
        >
          {user.name || "(no name)"}
        </Text>
        <Text
          style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.45)", marginTop: 2 }}
          numberOfLines={1}
        >
          {user.email}
        </Text>
        {(user.programTier || user.athleteType) && (
          <Text
            style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.3)", marginTop: 2 }}
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
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: "#EF4444", letterSpacing: 0.8 }}>
            BLOCKED
          </Text>
        ) : joinLabel ? (
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.3)" }}>
            {joinLabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function AdminUsersScreen() {
  const { isDark } = useAppTheme();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const { users, loading, error, isBusy, load, updateBlockedStatus, deleteUser, updateProgramTier } = useAdminUsers(token, !!bootstrapReady);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    load();
  }, [load]);

  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId) ?? null, [users, selectedUserId]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const blockedCount = useMemo(() => users.filter(u => u.isBlocked).length, [users]);

  return (
    <AdminScreen>
      <ThemedScrollView
        onRefresh={() => load(searchQuery.trim() ? searchQuery.trim() : undefined, true)}
      >
        <Animated.View
          entering={FadeInDown.delay(60).duration(360)}
          style={{ marginBottom: 18 }}
        >
          <AdminHeader
            eyebrow="Directory"
            title="Users"
            subtitle={
              loading && users.length === 0
                ? "Loading users"
                : `${users.length} registered · ${blockedCount > 0 ? `${blockedCount} blocked` : "none blocked"}`
            }
            tone="success"
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

        {/* User list */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(360)}
          style={{ paddingHorizontal: 24, paddingBottom: 60 }}
        >
          {loading && users.length === 0 ? (
            <View style={{ gap: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} width="100%" height={76} borderRadius={20} />
              ))}
            </View>
          ) : error ? (
            <View
              style={{
                padding: 24,
                borderRadius: 20,
                backgroundColor: "rgba(239,68,68,0.08)",
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.18)",
                alignItems: "center",
              }}
            >
              <Feather name="alert-circle" size={22} color="#EF4444" style={{ marginBottom: 10 }} />
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: "#EF4444", textAlign: "center" }}>
                {error}
              </Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <AdminEmptyState
              icon={UsersIcon}
              title={searchQuery ? "No matching users" : "No users found"}
              description={
                searchQuery
                  ? "Clear the search or try another name, email, or role."
                  : "Users will appear here after they register."
              }
              tone="success"
            />
          ) : (
            <View style={{ gap: 8 }}>
              {filteredUsers.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  isDark={isDark}
                  onPress={() => u.id != null && setSelectedUserId(u.id)}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </ThemedScrollView>

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
