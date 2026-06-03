import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { useNutritionDay } from "@/components/nutrition/useNutritionDay";
import { useSleepData } from "@/components/sleep/useSleepData";
import { useWellbeingData } from "@/hooks/useWellbeingData";
import {
  fetchAthleteAchievements,
  fetchAthleteAttendance,
  fetchAthleteInjuries,
  fetchAthleteProgress,
  fetchAthleteRuns,
  fetchAthleteTraining,
  type HistoryRange,
  type ManagerAchievements,
  type ManagerAttendance,
  type ManagerInjury,
  type ManagerProgressEntry,
  type ManagerRun,
  type ManagerTraining,
} from "@/services/teamManager/athleteDataService";

/**
 * Read-only detail for a team manager (or co-manager) viewing one of their athletes.
 * The manager is authorized server-side only for athletes on a team they manage; every
 * read is scoped by team. No edit affordances.
 */
export function AthleteHealthDetail({ athleteId, athleteUserId }: { athleteId: number; athleteUserId: number }) {
  const { capabilities } = useAppSelector((s) => s.user);
  const showNutrition = Boolean(capabilities?.nutrition || capabilities?.nutritionReview);
  const showSleep = Boolean(capabilities?.sleep);
  const showWellbeing = Boolean(capabilities?.wellbeing);

  const [range, setRange] = useState<HistoryRange>("30d");

  return (
    <View style={{ gap: 14 }}>
      <RangeToggle range={range} onChange={setRange} />
      <TrainingSection athleteId={athleteId} range={range} />
      <AchievementsSection athleteId={athleteId} />
      <AttendanceSection athleteId={athleteId} range={range} />
      <RunsSection athleteId={athleteId} range={range} />
      <ProgressSection athleteId={athleteId} range={range} />
      <InjuriesSection athleteId={athleteId} range={range} />
      {showNutrition ? <NutritionSection athleteUserId={athleteUserId} /> : null}
      {showSleep ? <SleepSection athleteUserId={athleteUserId} range={range} /> : null}
      {showWellbeing ? <WellbeingSection athleteUserId={athleteUserId} range={range} /> : null}
    </View>
  );
}

function useAsyncData<T>(fetcher: () => Promise<T> | null, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const promise = fetcher();
    if (!promise) {
      setLoading(false);
      return;
    }
    setLoading(true);
    promise
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading };
}

function RangeToggle({ range, onChange }: { range: HistoryRange; onChange: (r: HistoryRange) => void }) {
  const p = useAdminPastel();
  const options: Array<{ key: HistoryRange; label: string }> = [
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "all", label: "All" },
  ];
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: p.cardWhite,
        borderRadius: 999,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((o) => {
        const active = o.key === range;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            onPress={() => onChange(o.key)}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: active ? p.accent : "transparent",
            }}
          >
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 13,
                color: active ? p.buttonPrimaryText : p.textSecondary,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const p = useAdminPastel();
  return (
    <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, padding: 18, gap: 12 }}>
      <View>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}>{title}</Text>
        {subtitle ? (
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Empty({ label }: { label: string }) {
  const p = useAdminPastel();
  return <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textMuted }}>{label}</Text>;
}

function StatRow({ label, value }: { label: string; value: string }) {
  const p = useAdminPastel();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textPrimary }}>{value}</Text>
    </View>
  );
}

function Loading() {
  const p = useAdminPastel();
  return <ActivityIndicator color={p.accent} />;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sleepRangeFor(range: HistoryRange): "week" | "month" | "all" {
  return range === "7d" ? "week" : range === "30d" ? "month" : "all";
}

function cutoffKey(range: HistoryRange): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function TrainingSection({ athleteId, range }: { athleteId: number; range: HistoryRange }) {
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<ManagerTraining>(
    () => (token ? fetchAthleteTraining(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  return (
    <SectionCard title="Training & Programs">
      {loading ? (
        <Loading />
      ) : data ? (
        <View style={{ gap: 10 }}>
          <StatRow
            label="Programs"
            value={`${data.totals.programsCompleted}/${data.totals.programsAssigned} completed`}
          />
          <StatRow label="Sessions completed" value={`${data.totals.sessionsCompleted}`} />
          <StatRow label="Workouts logged" value={`${data.totals.workoutsLogged}`} />
          {data.programs.length ? (
            <View style={{ gap: 6, marginTop: 4 }}>
              {data.programs.slice(0, 8).map((pr) => (
                <StatRow
                  key={pr.programId}
                  label={pr.name}
                  value={pr.completedAt ? `Done ${fmtDate(pr.completedAt)}` : pr.status}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <Empty label="No training data." />
      )}
    </SectionCard>
  );
}

function AchievementsSection({ athleteId }: { athleteId: number }) {
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<ManagerAchievements>(
    () => (token ? fetchAthleteAchievements(token, athleteId) : null),
    [token, athleteId],
  );
  const unlocked = data?.achievements.filter((a) => a.unlocked) ?? [];
  return (
    <SectionCard title="Achievements" subtitle={data ? `${unlocked.length}/${data.achievements.length} unlocked` : undefined}>
      {loading ? (
        <Loading />
      ) : data ? (
        <View style={{ gap: 8 }}>
          <StatRow label="Exercise check-ins" value={`${data.stats.exerciseCompletions}`} />
          <StatRow label="Full sessions" value={`${data.stats.sessionRuns}`} />
          <StatRow label="Training days" value={`${data.stats.trainingDays}`} />
          {data.achievements.map((a) => (
            <StatRow key={a.key} label={a.title} value={a.unlocked ? fmtDate(a.unlockedAt) : "Locked"} />
          ))}
        </View>
      ) : (
        <Empty label="No achievement data." />
      )}
    </SectionCard>
  );
}

function AttendanceSection({ athleteId, range }: { athleteId: number; range: HistoryRange }) {
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<{ attendance: ManagerAttendance[] }>(
    () => (token ? fetchAthleteAttendance(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  const rows = data?.attendance ?? [];
  const present = rows.filter((r) => r.status === "present" || r.checkInAt != null).length;
  return (
    <SectionCard title="Attendance" subtitle={rows.length ? `${present}/${rows.length} present` : undefined}>
      {loading ? (
        <Loading />
      ) : rows.length ? (
        <View style={{ gap: 8 }}>
          {rows.slice(0, 20).map((r) => (
            <StatRow key={r.id} label={`${r.sessionName} · ${fmtDate(r.startsAt)}`} value={r.status} />
          ))}
        </View>
      ) : (
        <Empty label="No attendance records." />
      )}
    </SectionCard>
  );
}

function RunsSection({ athleteId, range }: { athleteId: number; range: HistoryRange }) {
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<{ runs: ManagerRun[] }>(
    () => (token ? fetchAthleteRuns(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  const runs = data?.runs ?? [];
  const totalKm = runs.reduce((s, r) => s + r.distanceMeters / 1000, 0);
  return (
    <SectionCard title="Running" subtitle={runs.length ? `${runs.length} runs · ${totalKm.toFixed(1)} km` : undefined}>
      {loading ? (
        <Loading />
      ) : runs.length ? (
        <View style={{ gap: 8 }}>
          {runs.slice(0, 20).map((r) => (
            <StatRow
              key={r.id}
              label={fmtDate(r.date)}
              value={`${(r.distanceMeters / 1000).toFixed(2)} km · ${Math.round(r.durationSeconds / 60)} min`}
            />
          ))}
        </View>
      ) : (
        <Empty label="No runs logged." />
      )}
    </SectionCard>
  );
}

function ProgressSection({ athleteId, range }: { athleteId: number; range: HistoryRange }) {
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<{ entries: ManagerProgressEntry[] }>(
    () => (token ? fetchAthleteProgress(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  const entries = data?.entries ?? [];
  return (
    <SectionCard title="Progress · Strength & body">
      {loading ? (
        <Loading />
      ) : entries.length ? (
        <View style={{ gap: 8 }}>
          {entries.slice(0, 20).map((e) => {
            const label =
              e.type === "measurement"
                ? `${e.label ?? "Measure"} · ${fmtDate(e.entryDate)}`
                : `${e.exerciseName ?? e.label ?? "Entry"} · ${fmtDate(e.entryDate)}`;
            const value =
              e.type === "measurement"
                ? e.valueCm != null
                  ? `${e.valueCm} cm`
                  : "—"
                : e.weightKg != null
                  ? `${e.weightKg} kg${e.reps != null ? ` × ${e.reps}` : ""}`
                  : "—";
            return <StatRow key={e.id} label={label} value={value} />;
          })}
        </View>
      ) : (
        <Empty label="No progress entries." />
      )}
    </SectionCard>
  );
}

function InjuriesSection({ athleteId, range }: { athleteId: number; range: HistoryRange }) {
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<{ injuries: ManagerInjury[] }>(
    () => (token ? fetchAthleteInjuries(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  const injuries = data?.injuries ?? [];
  return (
    <SectionCard title="Injuries">
      {loading ? (
        <Loading />
      ) : injuries.length ? (
        <View style={{ gap: 8 }}>
          {injuries.slice(0, 20).map((i) => (
            <StatRow
              key={i.id}
              label={`${i.bodyPart ?? i.description} · ${fmtDate(i.occurredAt)}`}
              value={i.resolvedAt ? "Resolved" : i.severity}
            />
          ))}
        </View>
      ) : (
        <Empty label="No injuries logged." />
      )}
    </SectionCard>
  );
}

function NutritionSection({ athleteUserId }: { athleteUserId: number }) {
  const { data, loading } = useNutritionDay(undefined, athleteUserId);
  return (
    <SectionCard title="Nutrition · Today">
      {loading ? (
        <Loading />
      ) : data ? (
        <View style={{ gap: 10 }}>
          <StatRow label="Calories" value={`${data.eatenCalories} / ${data.targetCalories} kcal`} />
          {Object.values(data.meals).map((m) => (
            <StatRow
              key={m.label}
              label={m.label}
              value={m.items.length ? `${m.items.reduce((s, i) => s + i.calories, 0)} kcal` : "—"}
            />
          ))}
        </View>
      ) : (
        <Empty label="No nutrition logged." />
      )}
    </SectionCard>
  );
}

function SleepSection({ athleteUserId, range }: { athleteUserId: number; range: HistoryRange }) {
  const { logs, loading } = useSleepData(sleepRangeFor(range), athleteUserId);
  return (
    <SectionCard title="Sleep">
      {loading ? (
        <Loading />
      ) : logs.length ? (
        <View style={{ gap: 8 }}>
          {logs.slice(0, 30).map((l) => (
            <StatRow
              key={l.id}
              label={l.dateKey}
              value={`${(l.totalMinutes / 60).toFixed(1)}h${l.quality != null ? ` · Q${l.quality}` : ""}`}
            />
          ))}
        </View>
      ) : (
        <Empty label="No sleep logged." />
      )}
    </SectionCard>
  );
}

function WellbeingSection({ athleteUserId, range }: { athleteUserId: number; range: HistoryRange }) {
  const { token } = useAppSelector((s) => s.user);
  const { logs, isLoading } = useWellbeingData(token, athleteUserId);
  const cutoff = cutoffKey(range);
  const filtered = cutoff ? logs.filter((l) => l.dateKey >= cutoff) : logs;
  return (
    <SectionCard title="Wellbeing">
      {isLoading ? (
        <Loading />
      ) : filtered.length ? (
        <View style={{ gap: 8 }}>
          {filtered.slice(0, 30).map((l) => (
            <StatRow key={l.id} label={l.dateKey} value={`Mood ${l.mood} · Energy ${l.energy} · Pain ${l.pain}`} />
          ))}
        </View>
      ) : (
        <Empty label="No wellbeing logged." />
      )}
    </SectionCard>
  );
}
