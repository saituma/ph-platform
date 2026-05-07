import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  Lock,
} from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Skeleton } from "@/components/Skeleton";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import {
  fetchAthleteDetail,
  updateAthlete,
  resetAthletePassword,
  normalizeAthleteDetail,
  type AthleteDetail,
  type AthleteUpdateData,
} from "@/services/teamManager/rosterService";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function FieldLabel({ label }: { label: string }) {
  const p = useAdminPastel();
  return (
    <Text
      style={{
        fontSize: 11,
        fontFamily: "Outfit-Bold",
        color: p.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 6,
      }}
    >
      {label}
    </Text>
  );
}

function EditableField({
  label,
  value,
  onChangeText,
  multiline = false,
  keyboardType = "default",
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
  placeholder?: string;
}) {
  const p = useAdminPastel();

  return (
    <View style={{ marginBottom: 18 }}>
      <FieldLabel label={label} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}...`}
        placeholderTextColor={p.textMuted}
        style={{
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 14 : 12,
          fontSize: 15,
          fontFamily: "Outfit-Regular",
          color: p.textPrimary,
          backgroundColor: p.inputBg,
          minHeight: multiline ? 96 : undefined,
          textAlignVertical: multiline ? "top" : "auto",
        }}
      />
    </View>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  const p = useAdminPastel();
  return (
    <View style={{ marginBottom: 18 }}>
      <FieldLabel label={label} />
      <View
        style={{
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: p.inputBg,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Outfit-Regular",
            color: p.textMuted,
          }}
        >
          {value || "—"}
        </Text>
      </View>
    </View>
  );
}

export default function AthleteDetailScreen() {
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const { athleteId: athleteIdParam } = useLocalSearchParams<{ athleteId: string }>();
  const athleteId = Number(athleteIdParam);

  const { token, appRole } = useAppSelector((state) => state.user);

  if (appRole !== "team_manager") {
    return <ReplaceOnce href="/(tabs)" />;
  }

  const [athlete, setAthlete] = useState<AthleteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [trainingFreq, setTrainingFreq] = useState("");
  const [performanceGoals, setPerformanceGoals] = useState("");
  const [equipment, setEquipment] = useState("");
  const [growthNotes, setGrowthNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAthlete = useCallback(
    async (forceRefresh = false) => {
      if (!token || !athleteId) return;
      setLoading(true);
      setError(null);
      try {
        const raw = await fetchAthleteDetail(token, athleteId, forceRefresh);
        const detail = normalizeAthleteDetail(raw);
        setAthlete(detail);
        setDisplayName(detail.name ?? "");
        setTrainingFreq(detail.trainingFrequency != null ? String(detail.trainingFrequency) : "");
        setPerformanceGoals(detail.performanceGoals ?? "");
        setEquipment(detail.equipment ?? "");
        setGrowthNotes(detail.growthNotes ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load athlete");
      } finally {
        setLoading(false);
      }
    },
    [token, athleteId],
  );

  useEffect(() => {
    void loadAthlete(false);
  }, [loadAthlete]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (!token || !athleteId) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload: AthleteUpdateData = {};
      const freq = parseInt(trainingFreq, 10);
      if (!Number.isNaN(freq) && freq > 0) payload.trainingFrequency = freq;
      if (performanceGoals.trim()) payload.performanceGoals = performanceGoals.trim();
      if (equipment.trim()) payload.equipment = equipment.trim();
      if (growthNotes.trim()) payload.growthNotes = growthNotes.trim();
      await updateAthlete(token, athleteId, payload);
      setSaveSuccess(true);
      successTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }, [token, athleteId, trainingFreq, performanceGoals, equipment, growthNotes]);

  const handleResetPassword = useCallback(() => {
    const name = athlete?.name ?? "this athlete";
    Alert.alert(
      "Reset Password",
      `Send a password reset email to ${name}? They will receive an email to set a new password.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            if (!token || !athleteId) return;
            setResettingPassword(true);
            try {
              await resetAthletePassword(token, athleteId);
              Alert.alert("Done", "Password reset email sent.");
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error ? e.message : "Failed to send password reset",
              );
            } finally {
              setResettingPassword(false);
            }
          },
        },
      ],
    );
  }, [token, athleteId, athlete?.name]);

  const athleteName = athlete?.name ?? (loading ? "" : `Athlete #${athleteId}`);
  const initials = getInitials(athleteName);
  const typeLabel =
    athlete?.athleteType === "youth"
      ? "Youth"
      : athlete?.athleteType === "adult"
        ? "Adult"
        : null;
  const ageLabel = typeof athlete?.age === "number" ? `${athlete.age}y` : null;
  const subLabel = [typeLabel, ageLabel].filter(Boolean).join(" • ");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.pageBg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Back header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: p.pageBg,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? p.accentSoft : p.cardWhite,
            marginRight: 14,
          })}
        >
          <ArrowLeft size={20} color={p.textPrimary} />
        </Pressable>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 18,
            fontFamily: "Outfit-Bold",
            color: p.textPrimary,
            letterSpacing: -0.2,
          }}
        >
          {loading ? "Athlete" : athleteName}
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom, paddingHorizontal: 24 }}
      >
        {loading ? (
          <View style={{ gap: 16, paddingTop: 24 }}>
            <Skeleton width={80} height={80} borderRadius={40} />
            <Skeleton width="60%" height={22} borderRadius={8} />
            <Skeleton width="40%" height={16} borderRadius={8} />
            <Skeleton width="100%" height={52} borderRadius={14} />
            <Skeleton width="100%" height={52} borderRadius={14} />
            <Skeleton width="100%" height={96} borderRadius={14} />
          </View>
        ) : error ? (
          <View style={{ paddingTop: 24 }}>
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.danger }}>{error}</Text>
            <Pressable onPress={() => loadAthlete(true)} style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: p.accent }}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Avatar + identity */}
            <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 28 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: p.accentSoft,
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{ color: p.accent, fontFamily: "Outfit-Bold", fontSize: 26 }}
                >
                  {initials}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "Outfit-Bold",
                  color: p.textPrimary,
                  letterSpacing: -0.3,
                  textAlign: "center",
                }}
              >
                {athleteName}
              </Text>
              {subLabel ? (
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Outfit-Regular",
                    color: p.textSecondary,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  {subLabel}
                </Text>
              ) : null}
            </View>

            {/* Editable card */}
            <View
              style={{
                borderRadius: 22,
                padding: 20,
                backgroundColor: p.cardWhite,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Outfit-Bold",
                  color: p.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 1.0,
                  marginBottom: 16,
                }}
              >
                Profile
              </Text>

              <ReadonlyField label="Display Name" value={displayName} />

              <EditableField
                label="Training Frequency (days/week)"
                value={trainingFreq}
                onChangeText={setTrainingFreq}
                keyboardType="numeric"
                placeholder="e.g. 3"
              />
              <EditableField
                label="Performance Goals"
                value={performanceGoals}
                onChangeText={setPerformanceGoals}
                multiline
                placeholder="e.g. Improve 5K time, build endurance..."
              />
              <EditableField
                label="Equipment Notes"
                value={equipment}
                onChangeText={setEquipment}
                multiline
                placeholder="e.g. Needs new running shoes, GPS watch..."
              />
              <EditableField
                label="Growth Notes"
                value={growthNotes}
                onChangeText={setGrowthNotes}
                multiline
                placeholder="Progress observations, areas to focus on..."
              />

              {saveError ? (
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Outfit-Regular",
                    color: p.danger,
                    marginBottom: 10,
                  }}
                >
                  {saveError}
                </Text>
              ) : null}
              {saveSuccess ? (
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Outfit-Regular",
                    color: p.success,
                    marginBottom: 10,
                  }}
                >
                  Changes saved.
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => ({
                  borderRadius: 100,
                  height: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: p.accent,
                  opacity: pressed || saving ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                {saving ? (
                  <ActivityIndicator color={p.buttonPrimaryText} size="small" />
                ) : (
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "Outfit-Bold",
                      color: p.buttonPrimaryText,
                      letterSpacing: 0.1,
                    }}
                  >
                    Save Changes
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Danger zone card */}
            <View
              style={{
                borderRadius: 22,
                padding: 20,
                backgroundColor: p.dangerSoft,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Outfit-Bold",
                  color: p.danger,
                  textTransform: "uppercase",
                  letterSpacing: 1.0,
                  marginBottom: 14,
                }}
              >
                Account Actions
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={handleResetPassword}
                disabled={resettingPassword}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 22,
                  padding: 14,
                  backgroundColor: p.cardWhite,
                  opacity: pressed || resettingPassword ? 0.7 : 1,
                })}
              >
                {resettingPassword ? (
                  <ActivityIndicator color={p.danger} size="small" />
                ) : (
                  <Lock size={20} color={p.danger} />
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: "Outfit-Bold",
                      color: p.danger,
                    }}
                  >
                    Reset Password
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Outfit-Regular",
                      color: p.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    Send a password reset email to this athlete
                  </Text>
                </View>
                <ChevronRight size={17} color={p.danger} />
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
