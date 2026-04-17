import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Pressable, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, StyleSheet, Keyboard, TextInput, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { PlanSession } from "@/types/programs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

interface Props {
  token: string | null;
  onNavigate?: (path: string) => void;
  onMessageCoach?: (text: string) => void | Promise<void>;
  canMessageCoach?: boolean;
}

export function PremiumPlanPanel({
  token,
  onNavigate,
  onMessageCoach,
  canMessageCoach,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<PlanSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinSession, setCheckinSession] = useState<PlanSession | null>(null);
  const [rpe, setRpe] = useState("");
  const [soreness, setSoreness] = useState("");
  const [fatigue, setFatigue] = useState("");
  const [notes, setNotes] = useState("");
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const mutedSurface = isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9";

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ items: PlanSession[] }>("/premium-plan", {
        token,
        forceRefresh: true,
        skipCache: true,
      });
      const list = (data.items ?? []).filter((s) => s && s.id);
      setItems(list);
      const weeks = Array.from(
        new Set(list.map((s) => Number(s.weekNumber)).filter((v) => Number.isFinite(v)))
      ).sort((a, b) => a - b);
      if (weeks.length) {
        setActiveWeek((prev) => (prev != null && weeks.includes(prev) ? prev : weeks[0]));
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to load training.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const weeks = useMemo(() => {
    return Array.from(
      new Set(items.map((s) => Number(s.weekNumber)).filter((v) => Number.isFinite(v)))
    ).sort((a, b) => a - b);
  }, [items]);

  const visibleSessions = useMemo(() => {
    if (activeWeek == null) return [];
    return items
      .filter((s) => Number(s.weekNumber) === Number(activeWeek))
      .slice()
      .sort((a, b) => Number(a.sessionNumber) - Number(b.sessionNumber));
  }, [activeWeek, items]);

  const weekStats = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const s of visibleSessions) {
      for (const ex of s.exercises ?? []) {
        total += 1;
        if (ex.completed) done += 1;
      }
    }
    return { total, done };
  }, [visibleSessions]);

  const nextSession = useMemo(() => {
    const incomplete = visibleSessions.find((s) => (s.exercises ?? []).some((e) => !e.completed));
    return incomplete ?? visibleSessions[0] ?? null;
  }, [visibleSessions]);

  const openSessionExercise = (session: PlanSession, requestedIndex?: number) => {
    if (!onNavigate) return;
    const exercises = session.exercises ?? [];
    if (!exercises.length) return;
    const incompleteIndex = exercises.findIndex((exercise) => !exercise.completed);
    const targetIndex = requestedIndex != null && requestedIndex >= 0 && requestedIndex < exercises.length
      ? requestedIndex
      : incompleteIndex >= 0 ? incompleteIndex : 0;
    const target = exercises[targetIndex];
    if (!target) return;
    const sessionIds = exercises.map((exercise) => String(exercise.id)).join(",");
    onNavigate(`/programs/exercise/${target.id}?sessionIds=${encodeURIComponent(sessionIds)}&index=${targetIndex}`);
  };

  const submitCheckin = async () => {
    if (!token || !checkinSession) return;
    const parsedRpe = Number(rpe);
    const parsedSoreness = Number(soreness);
    const parsedFatigue = Number(fatigue);
    if (isNaN(parsedRpe) || isNaN(parsedSoreness) || isNaN(parsedFatigue)) {
      setCheckinError("Enter valid numbers.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest(`/premium-plan/sessions/${checkinSession.id}/complete`, {
        method: "POST",
        token,
        body: { rpe: parsedRpe, soreness: parsedSoreness, fatigue: parsedFatigue, notes },
      });
      setCheckinOpen(false);
      void load();
    } catch (err: any) {
      setCheckinError(err?.message ?? "Failed to save check-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token || (!isLoading && items.length === 0)) return null;

  return (
    <View className="gap-5">
      <View
        className="rounded-[24px] px-5 py-5 gap-3 border"
        style={{
          backgroundColor: isDark ? "rgba(34,197,94,0.08)" : "#ECFDF5",
          borderColor: isDark ? "rgba(34,197,94,0.2)" : "#A7F3D0",
          ...(isDark ? Shadows.none : Shadows.sm),
        }}
      >
        <View className="flex-row items-center gap-2">
          <Feather name="star" size={16} color={colors.accent} />
          <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]" style={{ color: colors.accent }}>
            Your training
          </Text>
        </View>
        <Text className="text-xl font-clash text-app font-bold">This week</Text>
        {weekStats.total > 0 && activeWeek != null && (
          <View className="mt-2 rounded-2xl px-4 py-3 border" style={{ borderColor: borderSoft, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#F8FAFC" }}>
            <Text className="text-sm font-outfit text-app font-semibold">Week {activeWeek}: {weekStats.done}/{weekStats.total} exercises done</Text>
            {nextSession && <Text className="text-xs font-outfit text-secondary mt-1">Up next: Session {nextSession.sessionNumber}</Text>}
          </View>
        )}
      </View>

      {weeks.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {weeks.map((week) => (
            <Pressable
              key={week}
              onPress={() => setActiveWeek(week)}
              className="px-4 py-2 rounded-full border"
              style={{
                backgroundColor: activeWeek === week ? colors.text : "transparent",
                borderColor: activeWeek === week ? colors.text : borderSoft,
              }}
            >
              <Text className={`text-[11px] font-outfit font-bold uppercase tracking-[1.4px] ${activeWeek === week ? "text-app" : "text-secondary"}`} style={{ color: activeWeek === week ? colors.background : colors.textSecondary }}>
                Week {week}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.accent} className="py-10" />
      ) : (
        visibleSessions.map((session) => (
          <View key={session.id} className="rounded-[24px] px-5 py-5 gap-4 border" style={{ backgroundColor: colors.card, borderColor: borderSoft, ...(isDark ? Shadows.none : Shadows.sm) }}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-clash text-app font-bold">Session {session.sessionNumber}{session.title ? ` • ${session.title}` : ""}</Text>
                {session.notes && <Text className="text-sm font-outfit text-secondary mt-1">{session.notes}</Text>}
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable onPress={() => openSessionExercise(session)} className="px-3 py-1.5 rounded-full" style={{ backgroundColor: colors.accent }}>
                  <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.5px] text-white">Start</Text>
                </Pressable>
                <Pressable onPress={() => { setCheckinSession(session); setCheckinOpen(true); }} className="px-3 py-1.5 rounded-full" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.1)" : "#F0FDF4" }}>
                  <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.5px]" style={{ color: colors.accent }}>Log</Text>
                </Pressable>
              </View>
            </View>
            <View className="gap-2.5">
              {(session.exercises ?? []).map((ex) => (
                <Pressable key={ex.id} onPress={() => openSessionExercise(session, (session.exercises ?? []).findIndex(e => e.id === ex.id))} className="rounded-2xl border px-4 py-3" style={{ backgroundColor: ex.completed ? (isDark ? "rgba(34,197,94,0.1)" : "#F0FDF4") : "transparent", borderColor: ex.completed ? (isDark ? "rgba(34,197,94,0.3)" : "#86EFAC") : borderSoft }}>
                  <Text className="text-sm font-outfit text-app font-semibold">{ex.exercise?.name ?? "Exercise"}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))
      )}

      {/* CHECKIN MODAL */}
      <Modal visible={checkinOpen} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <View className="bg-card rounded-t-[32px] p-6" style={{ backgroundColor: colors.card }}>
              <View className="flex-row justify-between mb-6">
                <Text className="text-xl font-clash font-bold text-app">Session Check-in</Text>
                <TouchableOpacity onPress={() => setCheckinOpen(false)}><Feather name="x" size={24} color={colors.text} /></TouchableOpacity>
              </View>
              <View className="gap-4">
                <TextInput value={rpe} onChangeText={setRpe} placeholder="RPE (1-10)" keyboardType="number-pad" className="bg-background rounded-2xl px-4 py-3 text-app" />
                <TextInput value={soreness} onChangeText={setSoreness} placeholder="Soreness (0-10)" keyboardType="number-pad" className="bg-background rounded-2xl px-4 py-3 text-app" />
                <TextInput value={fatigue} onChangeText={setFatigue} placeholder="Fatigue (0-10)" keyboardType="number-pad" className="bg-background rounded-2xl px-4 py-3 text-app" />
                <TextInput value={notes} onChangeText={setNotes} placeholder="Notes..." multiline className="bg-background rounded-2xl px-4 py-3 text-app min-h-[80]" />
                {checkinError && <Text className="text-red-500 text-center">{checkinError}</Text>}
                <Pressable onPress={submitCheckin} disabled={isSubmitting} className="bg-accent rounded-full py-4 items-center" style={{ opacity: isSubmitting ? 0.7 : 1 }}>
                  <Text className="text-white font-bold">{isSubmitting ? "Saving..." : "Submit Check-in"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
