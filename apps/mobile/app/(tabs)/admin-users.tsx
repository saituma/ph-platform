import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AdminUser = {
  id?: number;
  cognitoSub?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  profilePicture?: string | null;
  isBlocked?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  athleteId?: number | null;
  athleteName?: string | null;
  athleteAge?: number | null;
  athleteType?: string | null;
  programTier?: string | null;
  onboardingCompleted?: boolean | null;
  guardianProgramTier?: string | null;
};

type UserOnboardingPayload = {
  guardian?: unknown;
  athlete?: unknown;
};

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function SmallAction({
  label,
  tone,
  onPress,
  disabled,
}: {
  label: string;
  tone: "neutral" | "success" | "danger";
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const tint =
    tone === "success"
      ? colors.accent
      : tone === "danger"
        ? colors.danger
        : colors.text;
  const bg =
    tone === "success"
      ? isDark
        ? `${colors.accent}18`
        : `${colors.accent}12`
      : tone === "danger"
        ? isDark
          ? `${colors.danger}18`
          : `${colors.danger}10`
        : isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(15,23,42,0.04)";
  const border =
    tone === "success"
      ? isDark
        ? `${colors.accent}30`
        : `${colors.accent}24`
      : tone === "danger"
        ? isDark
          ? `${colors.danger}30`
          : `${colors.danger}24`
        : isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15,23,42,0.06)";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 16,
          borderWidth: 1,
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        className="text-[12px] font-outfit-semibold"
        style={{ color: tint }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AdminUsersScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [userDetailOpenId, setUserDetailOpenId] = useState<number | null>(null);
  const [userDetailBusy, setUserDetailBusy] = useState(false);
  const [userDetailError, setUserDetailError] = useState<string | null>(null);
  const [userTierDraft, setUserTierDraft] = useState<string>("");

  const [onboarding, setOnboarding] = useState<UserOnboardingPayload | null>(
    null,
  );
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ users?: AdminUser[] }>(
          "/admin/users?limit=50",
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setUsers(Array.isArray(res?.users) ? res.users : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [bootstrapReady, token],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const selectedUser = useMemo(() => {
    if (userDetailOpenId == null) return null;
    return users.find((u) => u.id === userDetailOpenId) ?? null;
  }, [userDetailOpenId, users]);

  useEffect(() => {
    setUserDetailError(null);
    setOnboarding(null);
    setOnboardingError(null);
    if (selectedUser?.programTier) {
      setUserTierDraft(String(selectedUser.programTier));
    } else {
      setUserTierDraft("");
    }
  }, [selectedUser?.id, selectedUser?.programTier]);

  const updateUserInList = useCallback(
    (userId: number, patch: Partial<AdminUser>) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
      );
    },
    [],
  );

  const toggleBlocked = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    if (!selectedUser?.id) return;
    const currentBlocked = Boolean(selectedUser.isBlocked);
    setUserDetailBusy(true);
    setUserDetailError(null);
    try {
      const res = await apiRequest<{ user?: { isBlocked?: boolean | null } }>(
        `/admin/users/${selectedUser.id}/block`,
        {
          method: "POST",
          token,
          body: { blocked: !currentBlocked },
          skipCache: true,
        },
      );
      const nextBlocked = Boolean(res?.user?.isBlocked);
      updateUserInList(selectedUser.id, { isBlocked: nextBlocked });
    } catch (e) {
      setUserDetailError(
        e instanceof Error ? e.message : "Failed to update blocked status",
      );
    } finally {
      setUserDetailBusy(false);
    }
  }, [
    bootstrapReady,
    selectedUser?.id,
    selectedUser?.isBlocked,
    token,
    updateUserInList,
  ]);

  const deleteUser = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    if (!selectedUser?.id) return;
    Alert.alert(
      "Delete user",
      `Delete ${selectedUser.email ?? selectedUser.name ?? "this user"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setUserDetailBusy(true);
            setUserDetailError(null);
            try {
              await apiRequest(`/admin/users/${selectedUser.id}`, {
                method: "DELETE",
                token,
                skipCache: true,
              });
              setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
              setUserDetailOpenId(null);
            } catch (e) {
              setUserDetailError(
                e instanceof Error ? e.message : "Failed to delete user",
              );
            } finally {
              setUserDetailBusy(false);
            }
          },
        },
      ],
    );
  }, [
    bootstrapReady,
    selectedUser?.email,
    selectedUser?.id,
    selectedUser?.name,
    token,
  ]);

  const loadOnboarding = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    if (!selectedUser?.id) return;
    setOnboardingLoading(true);
    setOnboardingError(null);
    try {
      const res = await apiRequest<UserOnboardingPayload>(
        `/admin/users/${selectedUser.id}/onboarding`,
        {
          token,
          skipCache: true,
        },
      );
      setOnboarding(res ?? null);
    } catch (e) {
      setOnboardingError(
        e instanceof Error ? e.message : "Failed to load onboarding",
      );
      setOnboarding(null);
    } finally {
      setOnboardingLoading(false);
    }
  }, [bootstrapReady, selectedUser?.id, token]);

  const saveProgramTier = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    if (!selectedUser?.athleteId) {
      setUserDetailError("No athlete record for this user.");
      return;
    }
    const tier = userTierDraft.trim();
    if (!tier) {
      setUserDetailError("Program tier is required.");
      return;
    }
    setUserDetailBusy(true);
    setUserDetailError(null);
    try {
      const res = await apiRequest<{
        athlete?: { currentProgramTier?: string | null };
      }>("/admin/users/program-tier", {
        method: "POST",
        token,
        body: { athleteId: selectedUser.athleteId, programTier: tier },
        skipCache: true,
      });
      const nextTier = res?.athlete?.currentProgramTier ?? tier;
      if (selectedUser.id)
        updateUserInList(selectedUser.id, { programTier: nextTier });
    } catch (e) {
      setUserDetailError(
        e instanceof Error ? e.message : "Failed to update program tier",
      );
    } finally {
      setUserDetailBusy(false);
    }
  }, [
    bootstrapReady,
    selectedUser?.athleteId,
    selectedUser?.id,
    token,
    updateUserInList,
    userTierDraft,
  ]);

  const headerLine = useMemo(() => {
    if (loading) return "Loading…";
    if (error) return "Error";
    return `${users.length} users`;
  }, [error, loading, users.length]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView onRefresh={() => load(true)}>
        <View className="pt-6 mb-4">
          <View className="flex-row items-center gap-3 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <View className="flex-1">
              <Text
                className="text-4xl font-telma-bold text-app tracking-tight"
                numberOfLines={1}
              >
                Users
              </Text>
              <Text
                className="text-[12px] font-outfit text-secondary"
                numberOfLines={1}
              >
                {headerLine}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="rounded-[28px] border p-5"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          {loading && users.length === 0 ? (
            <View className="gap-2">
              <Skeleton width="85%" height={14} />
              <Skeleton width="92%" height={14} />
              <Skeleton width="78%" height={14} />
            </View>
          ) : error ? (
            <Text selectable className="text-sm font-outfit text-red-400">
              {error}
            </Text>
          ) : users.length === 0 ? (
            <Text className="text-sm font-outfit text-secondary">
              No users found.
            </Text>
          ) : (
            <View className="gap-3">
              {users.map((u, idx) => (
                <Pressable
                  key={String(u.id ?? idx)}
                  className="rounded-2xl border px-4 py-3"
                  accessibilityRole="button"
                  onPress={() => {
                    if (typeof u.id === "number") setUserDetailOpenId(u.id);
                  }}
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(15,23,42,0.03)",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(15,23,42,0.06)",
                  }}
                >
                  <Text
                    className="text-[13px] font-clash font-bold text-app"
                    numberOfLines={1}
                  >
                    {u.name ?? "(no name)"}
                  </Text>
                  <Text
                    selectable
                    className="text-[12px] font-outfit text-secondary"
                    numberOfLines={1}
                  >
                    {u.email ?? ""}
                  </Text>
                  <View className="flex-row items-center gap-3 mt-1">
                    <Text
                      className="text-[11px] font-outfit text-secondary"
                      numberOfLines={1}
                    >
                      Role: {u.role ?? "—"}
                    </Text>
                    {u.programTier ? (
                      <Text
                        className="text-[11px] font-outfit text-secondary"
                        numberOfLines={1}
                      >
                        Tier: {u.programTier}
                      </Text>
                    ) : null}
                    {u.isBlocked ? (
                      <Text
                        className="text-[11px] font-outfit text-red-400"
                        numberOfLines={1}
                      >
                        Blocked
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Modal
          visible={userDetailOpenId != null}
          animationType="slide"
          presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
          onRequestClose={() => setUserDetailOpenId(null)}
        >
          <View
            style={{
              flex: 1,
              paddingTop: insets.top,
              backgroundColor: isDark ? colors.background : "#FFFFFF",
            }}
          >
            <ThemedScrollView
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 24 + insets.bottom,
              }}
            >
              <View className="pt-4 mb-4 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text
                    className="text-2xl font-clash font-bold text-app"
                    numberOfLines={1}
                  >
                    {selectedUser?.name ?? "User"}
                  </Text>
                  <Text
                    className="text-[12px] font-outfit text-secondary"
                    numberOfLines={1}
                    selectable
                  >
                    ID: {selectedUser?.id ?? "—"}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setUserDetailOpenId(null)}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      opacity: pressed ? 0.85 : 1,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(15,23,42,0.04)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(15,23,42,0.08)",
                    },
                  ]}
                >
                  <Text className="text-[12px] font-outfit-semibold text-app">
                    Close
                  </Text>
                </Pressable>
              </View>

              <View
                className="rounded-[28px] border p-5 mb-4"
                style={{
                  backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
                  ...(isDark ? Shadows.none : Shadows.md),
                }}
              >
                {userDetailError ? (
                  <Text selectable className="text-sm font-outfit text-red-400">
                    {userDetailError}
                  </Text>
                ) : null}

                <Text
                  className="text-[12px] font-outfit text-secondary"
                  selectable
                >
                  Email: {selectedUser?.email ?? "—"}
                </Text>
                <Text
                  className="text-[12px] font-outfit text-secondary"
                  selectable
                >
                  Role: {selectedUser?.role ?? "—"}
                </Text>
                <Text
                  className="text-[12px] font-outfit text-secondary"
                  selectable
                >
                  Blocked: {selectedUser?.isBlocked ? "Yes" : "No"}
                </Text>
                <Text
                  className="text-[12px] font-outfit text-secondary"
                  selectable
                >
                  Tier: {selectedUser?.programTier ?? "—"}
                </Text>
                <Text
                  className="text-[12px] font-outfit text-secondary"
                  selectable
                >
                  Onboarding complete:{" "}
                  {selectedUser?.onboardingCompleted ? "Yes" : "No"}
                </Text>
                <Text
                  className="text-[12px] font-outfit text-secondary"
                  selectable
                >
                  Athlete: {selectedUser?.athleteName ?? "—"}
                </Text>
              </View>

              <View
                className="rounded-[28px] border p-5 mb-4"
                style={{
                  backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
                  ...(isDark ? Shadows.none : Shadows.md),
                }}
              >
                <Text className="text-base font-clash font-bold text-app mb-3">
                  Actions
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <SmallAction
                    label={selectedUser?.isBlocked ? "Unblock" : "Block"}
                    tone={selectedUser?.isBlocked ? "success" : "danger"}
                    onPress={toggleBlocked}
                    disabled={userDetailBusy || !selectedUser?.id}
                  />
                  <SmallAction
                    label="Delete"
                    tone="danger"
                    onPress={deleteUser}
                    disabled={userDetailBusy || !selectedUser?.id}
                  />
                  <SmallAction
                    label={onboarding ? "Reload onboarding" : "Load onboarding"}
                    tone="neutral"
                    onPress={loadOnboarding}
                    disabled={
                      onboardingLoading || userDetailBusy || !selectedUser?.id
                    }
                  />
                </View>

                <View className="mt-4">
                  <Text className="text-[12px] font-outfit text-secondary mb-2">
                    Program tier (athlete only)
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <View
                      className="flex-1 rounded-2xl border px-3 py-2"
                      style={{
                        borderColor: isDark
                          ? "rgba(255,255,255,0.10)"
                          : "rgba(15,23,42,0.10)",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(15,23,42,0.03)",
                      }}
                    >
                      <TextInput
                        value={userTierDraft}
                        onChangeText={setUserTierDraft}
                        placeholder="e.g. PHP_Premium"
                        className="text-[12px] font-outfit text-app"
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <SmallAction
                      label="Save tier"
                      tone="success"
                      onPress={saveProgramTier}
                      disabled={userDetailBusy || !selectedUser?.athleteId}
                    />
                  </View>
                  <Text className="text-[11px] font-outfit text-secondary mt-2">
                    Tip: tier must match backend enum (e.g. PHP_Premium).
                  </Text>
                </View>
              </View>

              {onboardingLoading ? (
                <View
                  className="rounded-[28px] border p-5 mb-4"
                  style={{
                    backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.06)",
                    ...(isDark ? Shadows.none : Shadows.md),
                  }}
                >
                  <Skeleton width="80%" height={14} />
                  <View className="h-2" />
                  <Skeleton width="92%" height={14} />
                </View>
              ) : onboardingError ? (
                <View
                  className="rounded-[28px] border p-5 mb-4"
                  style={{
                    backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.06)",
                    ...(isDark ? Shadows.none : Shadows.md),
                  }}
                >
                  <Text selectable className="text-sm font-outfit text-red-400">
                    {onboardingError}
                  </Text>
                </View>
              ) : onboarding ? (
                <View
                  className="rounded-[28px] border p-5"
                  style={{
                    backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.06)",
                    ...(isDark ? Shadows.none : Shadows.md),
                  }}
                >
                  <Text className="text-base font-clash font-bold text-app mb-3">
                    Onboarding payload
                  </Text>
                  <Text
                    selectable
                    className="text-[12px] font-outfit text-secondary"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {safeJson(onboarding)}
                  </Text>
                </View>
              ) : null}
            </ThemedScrollView>
          </View>
        </Modal>
      </ThemedScrollView>
    </View>
  );
}
