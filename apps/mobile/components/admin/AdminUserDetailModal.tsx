import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  TextInput,
  Alert,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { AdminUser, UserOnboardingPayload } from "@/types/admin";
import { apiRequest } from "@/lib/api";
import { AdaptiveSheet } from "@/components/native/AdaptiveSheet";
import { showNativeActionMenu } from "@/components/native/NativeActionMenu";
import type { LucideIcon } from "lucide-react-native";
import {
  X,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  KeyRound,
  ChevronDown,
  UserCircle,
} from "lucide-react-native";

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
  const p = useAdminPastel();
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
      const res = await apiRequest<UserOnboardingPayload>(
        `/admin/users/${user.id}/onboarding`,
        { token, skipCache: true },
      );
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
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(user.id!).then(onClose),
      },
    ]);
  };

  const handleResetPassword = async () => {
    if (!token || !user?.id) return;
    try {
      setError(null);
      await apiRequest(`/admin/users/${user.id}/reset-password`, {
        method: "POST",
        token,
        body: { temporaryPassword: passwordDraft.trim() || undefined },
      });
      Alert.alert(
        "Password Reset",
        "Temporary password has been emailed to the user.",
      );
      setPasswordDraft("");
    } catch (e: any) {
      setError(e.message || "Failed to reset password");
    }
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
      <View style={{ flex: 1, backgroundColor: p.pageBg }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 24,
            paddingTop: 32,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: p.divider,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 22,
                color: p.textPrimary,
              }}
            >
              {user?.name ?? "User"}
            </Text>
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 12,
                color: p.textSecondary,
                marginTop: 2,
              }}
            >
              User ID {user?.id ?? "—"} •{" "}
              {user?.programTier ?? "No Tier"}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 100,
              backgroundColor: p.inputBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} color={p.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error banner */}
          {error && (
            <View
              style={{
                backgroundColor: p.dangerSoft,
                borderWidth: 1,
                borderColor: p.danger,
                padding: 14,
                borderRadius: 16,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 13,
                  color: p.danger,
                }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* Account Card */}
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 16,
              color: p.textPrimary,
              marginBottom: 8,
            }}
          >
            Account Context
          </Text>
          <View
            style={{
              backgroundColor: p.cardLavender,
              borderRadius: 28,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <InfoRow label="Role" value={user?.role ?? "—"} p={p} />
            <InfoRow label="Email" value={user?.email ?? "—"} p={p} />
            <InfoRow
              label="Status"
              value={user?.isBlocked ? "Blocked" : "Active"}
              p={p}
              valueColor={user?.isBlocked ? p.danger : p.success}
              badge
              badgeBg={user?.isBlocked ? p.dangerSoft : p.successSoft}
            />
            <InfoRow
              label="Created At"
              value={
                user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "—"
              }
              p={p}
            />
            <InfoRow
              label="Cognito"
              value={user?.cognitoSub ?? "—"}
              p={p}
              small
            />
          </View>

          {/* Athlete Profile Card */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 16,
                color: p.textPrimary,
              }}
            >
              Athlete Data
            </Text>
            {athlete?.profilePicture && (
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 100,
                  backgroundColor: p.accentSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserCircle size={20} color={p.accent} />
              </View>
            )}
          </View>
          <View
            style={{
              backgroundColor: p.cardMint,
              borderRadius: 28,
              padding: 20,
              marginBottom: 24,
            }}
          >
            {athleteLoading ? (
              <View style={{ gap: 12 }}>
                <Skeleton width="100%" height={20} />
                <Skeleton width="100%" height={20} />
                <Skeleton width="100%" height={20} />
              </View>
            ) : athlete ? (
              <>
                <InfoRow
                  label="Athlete ID"
                  value={String(athlete.id ?? "—")}
                  p={p}
                />
                <InfoRow
                  label="Birth Date"
                  value={athlete.birthDate ?? "—"}
                  p={p}
                />
                <InfoRow
                  label="Team"
                  value={athlete.team ?? "None"}
                  p={p}
                  bold
                />
                <InfoRow
                  label="Training / Week"
                  value={`${athlete.trainingPerWeek ?? "—"} days`}
                  p={p}
                />
                <InfoRow
                  label="Created At"
                  value={
                    athlete.createdAt
                      ? new Date(athlete.createdAt).toLocaleDateString()
                      : "—"
                  }
                  p={p}
                />
                {!!athlete.injuries &&
                  athlete.injuries !== "None" &&
                  athlete.injuries !== "" && (
                    <View
                      style={{
                        marginTop: 10,
                        backgroundColor: p.dangerSoft,
                        borderRadius: 16,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: p.danger,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Outfit-Bold",
                          fontSize: 10,
                          color: p.danger,
                          textTransform: "uppercase",
                          letterSpacing: 1.2,
                          marginBottom: 4,
                        }}
                      >
                        Reported Injuries
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Outfit-Regular",
                          fontSize: 13,
                          color: p.textPrimary,
                        }}
                      >
                        {String(athlete.injuries)}
                      </Text>
                    </View>
                  )}
              </>
            ) : (
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 13,
                  color: p.textSecondary,
                  fontStyle: "italic",
                }}
              >
                No dedicated athlete profile associated with this account.
              </Text>
            )}
          </View>

          {/* Streak Card */}
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 16,
              color: p.textPrimary,
              marginBottom: 8,
            }}
          >
            Activity Streak
          </Text>
          <View
            style={{
              backgroundColor: p.accentSoft,
              borderRadius: 28,
              padding: 20,
              marginBottom: 24,
            }}
          >
            {user?.streakCurrent != null ? (
              <>
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                  <View style={{ flex: 1, backgroundColor: p.cardWhite, borderRadius: 18, padding: 14, alignItems: "center" }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 26, color: p.accent }}>
                      {user.streakCurrent ?? 0}
                    </Text>
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted, marginTop: 2 }}>
                      Current Streak
                    </Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: p.cardWhite, borderRadius: 18, padding: 14, alignItems: "center" }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 26, color: p.accent }}>
                      {user.streakLongest ?? 0}
                    </Text>
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted, marginTop: 2 }}>
                      Best Streak
                    </Text>
                  </View>
                </View>
                <InfoRow label="Total Days" value={`${user.streakTotalDays ?? 0}`} p={p} />
                <InfoRow label="Total Sessions" value={`${user.streakTotalSessions ?? 0}`} p={p} />
                <InfoRow label="Total Minutes" value={`${user.streakTotalMinutes ?? 0} min`} p={p} />
                <InfoRow
                  label="Last Activity"
                  value={user.streakLastActivity ?? "—"}
                  p={p}
                />
                {user.streakUpdatedAt ? (
                  <InfoRow
                    label="Synced"
                    value={new Date(user.streakUpdatedAt).toLocaleDateString()}
                    p={p}
                    small
                  />
                ) : null}
              </>
            ) : (
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, fontStyle: "italic" }}>
                No streak data yet — user hasn't synced activity.
              </Text>
            )}
          </View>

          {/* Password Settings */}
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 16,
              color: p.textPrimary,
              marginBottom: 8,
            }}
          >
            Password Manager
          </Text>
          <View
            style={{
              backgroundColor: p.cardPeach,
              borderRadius: 28,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 12,
                color: p.textSecondary,
                lineHeight: 18,
                marginBottom: 12,
              }}
            >
              Resetting generates a temporary password and invalidates existing
              user sessions automatically. You may assign a specific password or
              leave blank for a secure random hash.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput
                value={passwordDraft}
                onChangeText={setPasswordDraft}
                placeholder="Auto-generate secure hash"
                placeholderTextColor={p.textMuted}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  backgroundColor: p.inputBg,
                  borderWidth: 1,
                  borderColor: p.inputBorder,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontFamily: "Outfit-Regular",
                  fontSize: 14,
                  color: p.textPrimary,
                }}
                autoCapitalize="none"
                secureTextEntry
              />
              <PillButton
                label="Reset"
                icon={KeyRound}
                color={p.danger}
                bg={p.dangerSoft}
                onPress={handleResetPassword}
                disabled={isBusy}
              />
            </View>
          </View>

          {/* Admin Controls */}
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 16,
              color: p.textPrimary,
              marginBottom: 8,
            }}
          >
            Admin Modifiers
          </Text>
          <View
            style={{
              backgroundColor: p.cardWhite,
              borderRadius: 28,
              padding: 20,
            }}
          >
            {/* Tier selector */}
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 10,
                color: p.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 8,
              }}
            >
              Swap Program Tier
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={openTierPicker}
              style={{
                borderRadius: 16,
                backgroundColor: p.inputBg,
                borderWidth: 1,
                borderColor: p.inputBorder,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginBottom: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Text
                  style={{
                    fontFamily: "Outfit-Regular",
                    fontSize: 11,
                    color: p.textMuted,
                    marginBottom: 2,
                  }}
                >
                  Selected tier
                </Text>
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 14,
                    color: p.textPrimary,
                  }}
                >
                  {tierLabel}
                </Text>
              </View>
              <ChevronDown size={16} color={p.textMuted} />
            </Pressable>
            <View
              style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}
            >
              <PillButton
                label="Change tier"
                color={p.cardWhite}
                bg={p.accent}
                onPress={() =>
                  user?.athleteId && user?.id
                    ? onSaveTier(user.athleteId, user.id, normalizedTier)
                    : Promise.resolve()
                }
                disabled={isBusy || !user?.athleteId || !user?.id}
              />
              <PillButton
                label="Refresh"
                icon={RefreshCw}
                color={p.textSecondary}
                bg={p.inputBg}
                onPress={loadAthleteData}
                disabled={isBusy || athleteLoading}
              />
            </View>

            {/* Network Rules */}
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 10,
                color: p.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 8,
              }}
            >
              Network Rules
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <PillButton
                label={user?.isBlocked ? "Restore Access" : "Block User"}
                icon={user?.isBlocked ? ShieldCheck : ShieldOff}
                color={user?.isBlocked ? p.cardWhite : p.danger}
                bg={user?.isBlocked ? p.success : p.dangerSoft}
                onPress={() =>
                  user?.id && onToggleBlock(user.id, !user.isBlocked)
                }
                disabled={isBusy}
              />
              <PillButton
                label="Purge Account"
                icon={Trash2}
                color={p.danger}
                bg={p.dangerSoft}
                onPress={handleDelete}
                disabled={isBusy}
              />
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </AdaptiveSheet>
  );
}

/* ── Sub-components ─────────────────────────────── */

function InfoRow({
  label,
  value,
  p,
  valueColor,
  bold,
  small,
  badge,
  badgeBg,
}: {
  label: string;
  value: string;
  p: ReturnType<typeof useAdminPastel>;
  valueColor?: string;
  bold?: boolean;
  small?: boolean;
  badge?: boolean;
  badgeBg?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          fontFamily: "Outfit-Regular",
          fontSize: 13,
          color: p.textSecondary,
        }}
      >
        {label}
      </Text>
      {badge ? (
        <View
          style={{
            backgroundColor: badgeBg,
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 100,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 12,
              color: valueColor ?? p.textPrimary,
            }}
          >
            {value}
          </Text>
        </View>
      ) : (
        <Text
          style={{
            fontFamily: bold ? "Outfit-Bold" : "Outfit-Regular",
            fontSize: small ? 11 : 13,
            color: valueColor ?? p.textPrimary,
            maxWidth: "60%",
            textAlign: "right",
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      )}
    </View>
  );
}

function PillButton({
  label,
  icon: Icon,
  color,
  bg,
  onPress,
  disabled,
}: {
  label: string;
  icon?: LucideIcon;
  color: string;
  bg: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: bg,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 100,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {Icon && <Icon size={14} color={color} />}
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 12,
          color,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
