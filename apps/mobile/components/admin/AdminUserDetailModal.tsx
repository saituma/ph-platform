import React, { useMemo, useState, useEffect } from "react";
import { View, TextInput, Alert, ScrollView, Pressable } from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { AdminUser, UserOnboardingPayload } from "@/types/admin";
import { SmallAction } from "./AdminShared";
import { apiRequest } from "@/lib/api";
import { AdaptiveSheet } from "@/components/native/AdaptiveSheet";
import { showNativeActionMenu } from "@/components/native/NativeActionMenu";

interface Props {
  user: AdminUser | null;
  visible: boolean;
  onClose: () => void;
  onToggleBlock: (userId: number, blocked: boolean) => Promise<any>;
  onDelete: (userId: number) => Promise<any>;
  onSaveTier: (athleteId: number, userId: number, tier: string) => Promise<any>;
  token: string | null;
  isBusy: boolean;
}

export function AdminUserDetailModal({
  user,
  visible,
  onClose,
  onToggleBlock,
  onDelete,
  onSaveTier,
  token,
  isBusy,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const [tierDraft, setTierDraft] = useState("");
  const [passwordDraft, setPasswordDraft] = useState("");
  
  const [athlete, setAthlete] = useState<any>(null);
  const [athleteLoading, setAthleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && visible) {
      setTierDraft(user.programTier ?? "");
      setPasswordDraft("");
      loadAthleteData();
    }
  }, [user?.id, visible]);

  const loadAthleteData = async () => {
    if (!token || !user?.id) return;
    setAthleteLoading(true);
    setError(null);
    try {
      const res = await apiRequest<UserOnboardingPayload>(`/admin/users/${user.id}/onboarding`, { token, skipCache: true });
      setAthlete(res?.athlete ?? null);
    } catch (e) {
      setError("Failed to load athlete context.");
    } finally {
      setAthleteLoading(false);
    }
  };

  const handleDelete = () => {
    if (!user?.id) return;
    Alert.alert("Delete user", `Delete ${user.email ?? "this user"}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(user.id!).then(onClose) },
    ]);
  };

  const handleResetPassword = async () => {
    if (!token || !user?.id) return;
    try {
      setError(null);
      await apiRequest(`/admin/users/${user.id}/reset-password`, {
        method: "POST",
        token,
        body: { temporaryPassword: passwordDraft.trim() || undefined }
      });
      Alert.alert("Password Reset", "Temporary password has been emailed to the user.");
      setPasswordDraft("");
    } catch (e: any) {
      setError(e.message || "Failed to reset password");
    }
  };

  const CardStyle = {
    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
  };

  const tierOptions = useMemo(
    () => ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"] as const,
    [],
  );
  const normalizedTier = tierDraft.trim() || "PHP";
  const tierLabel = normalizedTier.replaceAll("_", " ");
  const openTierPicker = () => {
    showNativeActionMenu({
      title: "Select tier",
      message: "Choose the program tier for this user.",
      options: [
        ...tierOptions.map((tier) => ({
          label: tier.replaceAll("_", " "),
          onPress: () => setTierDraft(tier),
        })),
        { label: "Cancel", cancel: true },
      ],
    });
  };

  return (
    <AdaptiveSheet
      visible={visible}
      variant="page"
      onClose={onClose}
      keyboardAvoiding={false}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-row justify-between items-center px-6 pt-8 pb-4 border-b" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
          <View className="flex-1">
            <Text className="text-2xl font-telma-bold text-app">{user?.name ?? "User"}</Text>
            <Text className="text-xs font-outfit text-secondary">User ID {user?.id ?? "—"} • {user?.programTier ?? "No Tier"}</Text>
          </View>
          <SmallAction label="Close" tone="neutral" onPress={onClose} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {error && (
            <View className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-4">
              <Text className="text-sm font-outfit text-red-500">{error}</Text>
            </View>
          )}

          {/* Account Card */}
          <Text className="text-lg font-clash-semibold text-app mb-2">Account Context</Text>
          <View className="rounded-[28px] border p-5 mb-6" style={CardStyle}>
            <View className="flex-row justify-between mb-3"><Text className="text-sm font-outfit text-secondary">Role</Text><Text className="text-sm font-clash-medium text-app">{user?.role ?? "—"}</Text></View>
            <View className="flex-row justify-between mb-3"><Text className="text-sm font-outfit text-secondary">Email</Text><Text className="text-sm font-outfit text-app">{user?.email ?? "—"}</Text></View>
            <View className="flex-row justify-between mb-3"><Text className="text-sm font-outfit text-secondary">Status</Text><Text className={`text-sm font-clash-medium ${user?.isBlocked ? "text-red-400" : "text-[#10B981]"}`}>{user?.isBlocked ? "Blocked" : "Active"}</Text></View>
            <View className="flex-row justify-between mb-3"><Text className="text-sm font-outfit text-secondary">Created At</Text><Text className="text-sm font-outfit text-app">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</Text></View>
            <View className="flex-row justify-between"><Text className="text-sm font-outfit text-secondary">Cognito</Text><Text className="text-xs font-outfit text-accent max-w-[60%]">{user?.cognitoSub ?? "—"}</Text></View>
          </View>

          {/* Athlete Profile Card */}
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-lg font-clash-semibold text-app">Athlete Data</Text>
            {athlete?.profilePicture && (
              <View className="h-10 w-10 rounded-full border border-accent overflow-hidden">
                <View className="flex-1 bg-accent/20 items-center justify-center">
                   <Text className="text-[10px] font-telma-bold text-accent">PHOTO</Text>
                </View>
              </View>
            )}
          </View>
          <View className="rounded-[28px] border p-5 mb-6" style={CardStyle}>
            {athleteLoading ? (
              <View className="gap-3"><Skeleton width="100%" height={20} /><Skeleton width="100%" height={20} /><Skeleton width="100%" height={20} /></View>
            ) : athlete ? (
              <>
                <View className="flex-row justify-between mb-3"><Text className="text-sm font-outfit text-secondary">Athlete ID</Text><Text className="text-sm font-outfit text-app">{athlete.id ?? "—"}</Text></View>
                <View className="flex-row justify-between mb-3"><Text className="text-sm font-outfit text-secondary">Birth Date</Text><Text className="text-sm font-outfit text-app">{athlete.birthDate ?? "—"}</Text></View>
                <View className="flex-row justify-between mb-3"><Text className="text-sm font-outfit text-secondary">Team</Text><Text className="text-sm font-clash-medium text-app">{athlete.team ?? "None"}</Text></View>
                <View className="flex-row justify-between mb-3"><Text className="text-sm font-outfit text-secondary">Training / Week</Text><Text className="text-sm font-outfit text-app">{athlete.trainingPerWeek ?? "—"} days</Text></View>
                <View className="flex-row justify-between mb-3"><Text className="text-sm font-outfit text-secondary">Created At</Text><Text className="text-sm font-outfit text-app">{athlete.createdAt ? new Date(athlete.createdAt).toLocaleDateString() : "—"}</Text></View>
                {!!athlete.injuries && athlete.injuries !== "None" && athlete.injuries !== "" && (
                   <View className="mt-2 bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                     <Text className="text-[11px] font-outfit-bold text-red-500 uppercase tracking-widest mb-1">Reported Injuries</Text>
                     <Text className="text-sm font-outfit text-app">{String(athlete.injuries)}</Text>
                   </View>
                )}
              </>
            ) : (
              <Text className="text-sm font-outfit text-secondary italic">No dedicated athlete profile associated with this account.</Text>
            )}
          </View>

          {/* Password Settings */}
          <Text className="text-lg font-clash-semibold text-app mb-2">Password Manager</Text>
          <View className="rounded-[28px] border p-5 mb-6" style={CardStyle}>
            <Text className="text-[12px] font-outfit text-secondary leading-5 mb-3">
              Resetting generates a temporary password and invalidates existing user sessions automatically. You may assign a specific password or leave blank for a secure random hash.
            </Text>
            <View className="flex-row gap-2 items-center">
               <TextInput
                 value={passwordDraft}
                 onChangeText={setPasswordDraft}
                 placeholder="Auto-generate secure hash"
                 placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                 className="flex-1 rounded-2xl border px-4 py-3 text-app font-outfit bg-background"
                 style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
                 autoCapitalize="none"
                 secureTextEntry
               />
               <SmallAction label="Reset" tone="danger" onPress={handleResetPassword} disabled={isBusy} />
            </View>
          </View>

          {/* Admin Controls */}
          <Text className="text-lg font-clash-semibold text-app mb-2">Admin Modifiers</Text>
          <View className="rounded-[28px] border p-5 bg-card" style={CardStyle}>
             <Text className="text-[11px] font-outfit-semibold text-secondary mb-2 uppercase tracking-widest">Swap Program Tier</Text>
             <View className="gap-2 mb-6">
                <Pressable
                  accessibilityRole="button"
                  onPress={openTierPicker}
                  className="rounded-2xl border border-app/10 bg-background px-4 py-3 active:opacity-90"
                >
                  <Text className="text-[12px] font-outfit text-secondary mb-1">Selected tier</Text>
                  <Text className="text-[14px] font-clash font-bold text-app">{tierLabel}</Text>
                </Pressable>
                <View className="flex-row gap-2">
                  <SmallAction
                    label="Change tier"
                    tone="success"
                    onPress={() =>
                      user?.athleteId && user?.id
                        ? onSaveTier(user.athleteId, user.id, normalizedTier)
                        : Promise.resolve()
                    }
                    disabled={isBusy || !user?.athleteId || !user?.id}
                  />
                  <SmallAction
                    label="Refresh"
                    tone="neutral"
                    onPress={loadAthleteData}
                    disabled={isBusy || athleteLoading}
                  />
                </View>
             </View>

             <Text className="text-[11px] font-outfit-semibold text-secondary mb-2 uppercase tracking-widest">Network Rules</Text>
             <View className="flex-row flex-wrap gap-2">
                <SmallAction 
                  label={user?.isBlocked ? "Restore Access" : "Block User"} 
                  tone={user?.isBlocked ? "success" : "danger"} 
                  onPress={() => user?.id && onToggleBlock(user.id, !user.isBlocked)} 
                  disabled={isBusy} 
                />
                <SmallAction label="Purge Account" tone="danger" onPress={handleDelete} disabled={isBusy} />
             </View>
          </View>

        </ScrollView>
      </View>
    </AdaptiveSheet>
  );
}
