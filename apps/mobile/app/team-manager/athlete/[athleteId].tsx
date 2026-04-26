import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { Shadows } from "@/constants/theme";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { Feather } from "@/components/ui/theme-icons";
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
  const { colors } = useAppTheme();
  return (
    <Text
      style={{
        fontSize: 11,
        fontFamily: "Outfit",
        color: colors.textSecondary,
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
  const { colors, isDark } = useAppTheme();

  return (
    <View style={{ marginBottom: 18 }}>
      <FieldLabel label={label} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}…`}
        placeholderTextColor={colors.textSecondary}
        style={{
          borderRadius: 14,
          borderWidth: 1,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 14 : 12,
          fontSize: 15,
          fontFamily: "Outfit",
          color: colors.text,
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
          minHeight: multiline ? 96 : undefined,
          textAlignVertical: multiline ? "top" : "auto",
        }}
      />
    </View>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  const { colors, isDark } = useAppTheme();
  return (
    <View style={{ marginBottom: 18 }}>
      <FieldLabel label={label} />
      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
        }}
      >
        <Text style={{ fontSize: 15, fontFamily: "Outfit", color: colors.textSecondary }}>
          {value || "—"}
        </Text>
      </View>
    </View>
  );
}

export default function AthleteDetailScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { athleteId: athleteIdParam } = useLocalSearchParams<{ athleteId: string }>();
  const athleteId = Number(athleteIdParam);

  const { token } = useAppSelector((state) => state.user);

  const [athlete, setAthlete] = useState<AthleteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
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
      style={{ flex: 1, backgroundColor: colors.background }}
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
          backgroundColor: colors.background,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            marginRight: 14,
            padding: 4,
          })}
        >
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 18,
            fontFamily: "OutfitBold",
            color: colors.text,
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
            <Text style={{ fontSize: 14, fontFamily: "Outfit", color: "#ef4444" }}>{error}</Text>
            <Pressable onPress={() => loadAthlete(true)} style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, fontFamily: "OutfitBold", color: colors.accent }}>
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
                  borderRadius: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.accent + "22",
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{ color: colors.accent, fontFamily: "ClashDisplay-Bold", fontSize: 26 }}
                >
                  {initials}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "TelmaBold",
                  color: colors.text,
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
                    fontFamily: "Outfit",
                    color: colors.textSecondary,
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
                borderRadius: 20,
                borderWidth: 1,
                padding: 20,
                backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                ...(isDark ? Shadows.none : Shadows.md),
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "OutfitBold",
                  color: colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
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
                placeholder="e.g. Improve 5K time, build endurance…"
              />
              <EditableField
                label="Equipment Notes"
                value={equipment}
                onChangeText={setEquipment}
                multiline
                placeholder="e.g. Needs new running shoes, GPS watch…"
              />
              <EditableField
                label="Growth Notes"
                value={growthNotes}
                onChangeText={setGrowthNotes}
                multiline
                placeholder="Progress observations, areas to focus on…"
              />

              {saveError ? (
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Outfit",
                    color: "#ef4444",
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
                    fontFamily: "Outfit",
                    color: "#22c55e",
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
                  borderRadius: 14,
                  height: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.accent,
                  opacity: pressed || saving ? 0.75 : 1,
                })}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text
                    style={{ fontSize: 16, fontFamily: "OutfitBold", color: "#fff", letterSpacing: 0.1 }}
                  >
                    Save Changes
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Danger zone card */}
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                padding: 20,
                backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                borderColor: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.10)",
                ...(isDark ? Shadows.none : Shadows.md),
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "OutfitBold",
                  color: "#ef4444",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
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
                  borderRadius: 14,
                  borderWidth: 1,
                  padding: 14,
                  backgroundColor: isDark
                    ? "rgba(239,68,68,0.08)"
                    : "rgba(239,68,68,0.05)",
                  borderColor: isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.15)",
                  opacity: pressed || resettingPassword ? 0.7 : 1,
                })}
              >
                {resettingPassword ? (
                  <ActivityIndicator color="#ef4444" size="small" />
                ) : (
                  <Feather name="lock" size={20} color="#ef4444" />
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: "OutfitBold",
                      color: "#ef4444",
                    }}
                  >
                    Reset Password
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Outfit",
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    Send a password reset email to this athlete
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color="#ef4444" />
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
