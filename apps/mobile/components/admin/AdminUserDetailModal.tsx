import React, { useState, useEffect } from "react";
import { View, Modal, Platform, TextInput, Alert } from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { AdminUser, UserOnboardingPayload } from "@/types/admin";
import { SmallAction } from "./AdminShared";
import { apiRequest } from "@/lib/api";

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
  const [onboarding, setOnboarding] = useState<UserOnboardingPayload | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setTierDraft(user.programTier ?? "");
      setOnboarding(null);
      setError(null);
    }
  }, [user?.id]);

  const loadOnboarding = async () => {
    if (!token || !user?.id) return;
    setOnboardingLoading(true);
    setError(null);
    try {
      const res = await apiRequest<UserOnboardingPayload>(`/admin/users/${user.id}/onboarding`, { token, skipCache: true });
      setOnboarding(res);
    } catch (e) {
      setError("Failed to load onboarding.");
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleDelete = () => {
    if (!user?.id) return;
    Alert.alert("Delete user", `Delete ${user.email ?? "this user"}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(user.id!).then(onClose) },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ThemedScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-1">
              <Text className="text-2xl font-clash font-bold text-app">{user?.name ?? "User"}</Text>
              <Text className="text-xs font-outfit text-secondary">ID: {user?.id ?? "—"}</Text>
            </View>
            <SmallAction label="Close" tone="neutral" onPress={onClose} />
          </View>

          <View className="rounded-[28px] border p-5 mb-4 bg-card" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" }}>
            {error && <Text className="text-sm font-outfit text-red-400 mb-2">{error}</Text>}
            <Text className="text-sm font-outfit text-secondary">Email: {user?.email ?? "—"}</Text>
            <Text className="text-sm font-outfit text-secondary">Role: {user?.role ?? "—"}</Text>
            <Text className="text-sm font-outfit text-secondary">Status: {user?.isBlocked ? "Blocked" : "Active"}</Text>
            <Text className="text-sm font-outfit text-secondary">Tier: {user?.programTier ?? "—"}</Text>
            <Text className="text-sm font-outfit text-secondary">Athlete: {user?.athleteName ?? "—"}</Text>
          </View>

          <View className="rounded-[28px] border p-5 mb-4 bg-card" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" }}>
            <Text className="text-lg font-clash font-bold text-app mb-4">Actions</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              <SmallAction 
                label={user?.isBlocked ? "Unblock" : "Block"} 
                tone={user?.isBlocked ? "success" : "danger"} 
                onPress={() => user?.id && onToggleBlock(user.id, !user.isBlocked)} 
                disabled={isBusy} 
              />
              <SmallAction label="Delete" tone="danger" onPress={handleDelete} disabled={isBusy} />
              <SmallAction label="Load Onboarding" tone="neutral" onPress={loadOnboarding} disabled={onboardingLoading} />
            </View>

            <Text className="text-xs font-outfit text-secondary mb-2 uppercase">Update Program Tier</Text>
            <View className="flex-row gap-2">
              <TextInput
                value={tierDraft}
                onChangeText={setTierDraft}
                placeholder="e.g. PHP_Premium"
                className="flex-1 rounded-2xl border px-4 py-2 text-app bg-background"
                style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
              />
              <SmallAction 
                label="Save" 
                tone="success" 
                onPress={() => user?.athleteId && user?.id && onSaveTier(user.athleteId, user.id, tierDraft)} 
                disabled={isBusy} 
              />
            </View>
          </View>

          {onboardingLoading ? (
            <Skeleton width="100%" height={100} />
          ) : onboarding ? (
            <View className="rounded-[28px] border p-5 bg-card" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" }}>
              <Text className="font-clash font-bold text-app mb-2">Onboarding Data</Text>
              <Text className="text-xs font-outfit text-secondary" style={{ fontVariant: ["tabular-nums"] }}>
                {JSON.stringify(onboarding, null, 2)}
              </Text>
            </View>
          ) : null}
        </ThemedScrollView>
      </View>
    </Modal>
  );
}
