import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { useNutritionDay } from "@/components/nutrition/useNutritionDay";
import { useSleepData } from "@/components/sleep/useSleepData";
import {
  fetchAthleteAchievements,
  fetchAthleteAttendance,
  fetchAthleteBookings,
  fetchAthleteEngagement,
  fetchAthleteInjuries,
  fetchAthleteNutritionCompliance,
  fetchAthleteProgress,
  fetchAthleteRuns,
  fetchAthleteTraining,
  fetchAthleteWellbeing,
  type HistoryRange,
  type ManagerAchievements,
  type ManagerAttendance,
  type ManagerBooking,
  type ManagerEngagement,
  type ManagerInjury,
  type ManagerNutritionCompliance,
  type ManagerProgressEntry,
  type ManagerRun,
  type ManagerTraining,
  type ManagerWellbeing,
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
      <EngagementSection athleteId={athleteId} range={range} />
      <TrainingSection athleteId={athleteId} range={range} />
      <AchievementsSection athleteId={athleteId} />
      <AttendanceSection athleteId={athleteId} range={range} />
      <BookingsSection athleteId={athleteId} range={range} />
      <RunsSection athleteId={athleteId} range={range} />
      <ProgressSection athleteId={athleteId} range={range} />
      {showNutrition ? <NutritionSection athleteId={athleteId} athleteUserId={athleteUserId} range={range} /> : null}
      {showSleep ? <SleepSection athleteUserId={athleteUserId} range={range} /> : null}
      {showWellbeing ? <WellbeingSection athleteId={athleteId} range={range} /> : null}
      <InjuriesSection athleteId={athleteId} range={range} />
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

function EngagementSection({ athleteId, range }: { athleteId: number; range: HistoryRange }) {
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<ManagerEngagement>(
    () => (token ? fetchAthleteEngagement(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  const rangeLabel = range === "7d" ? "last 7 days" : range === "30d" ? "last 30 days" : "all time";
  return (
    <SectionCard title="Engagement" subtitle={rangeLabel}>
      {loading ? (
        <Loading />
      ) : data ? (
        <View style={{ gap: 10 }}>
          <StatRow label="Last active" value={data.lastActiveAt ? fmtDate(data.lastActiveAt) : "—"} />
          <StatRow label="Sessions completed" value={`${data.counts.sessionsCompleted}`} />
          <StatRow label="Runs" value={`${data.counts.runs}`} />
          <StatRow label="Wellbeing check-ins" value={`${data.counts.wellbeingLogs}`} />
          <StatRow label="Sleep logs" value={`${data.counts.sleepLogs}`} />
          <StatRow label="Nutrition days logged" value={`${data.counts.nutritionDays}`} />
          <StatRow label="Progress entries" value={`${data.counts.progressEntries}`} />
          <StatRow
            label="Attendance"
            value={data.attendance.pct != null ? `${data.attendance.pct}% (${data.attendance.present}/${data.attendance.total})` : "—"}
          />
        </View>
      ) : (
        <Empty label="No engagement data." />
      )}
    </SectionCard>
  );
}

function BookingsSection({ athleteId, range }: { athleteId: number; range: HistoryRange }) {
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<{ bookings: ManagerBooking[] }>(
    () => (token ? fetchAthleteBookings(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  const bookings = data?.bookings ?? [];
  return (
    <SectionCard title="Session bookings" subtitle={bookings.length ? `${bookings.length} bookings` : undefined}>
      {loading ? (
        <Loading />
      ) : bookings.length ? (
        <View style={{ gap: 8 }}>
          {bookings.slice(0, 20).map((b) => (
            <StatRow
              key={b.id}
              label={`${(b.type ?? "session").replace(/_/g, " ")} · ${fmtDate(b.startsAt)}`}
              value={b.status ?? "—"}
            />
          ))}
        </View>
      ) : (
        <Empty label="No bookings." />
      )}
    </SectionCard>
  );
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

function NutritionSection({
  athleteId,
  athleteUserId,
  range,
}: {
  athleteId: number;
  athleteUserId: number;
  range: HistoryRange;
}) {
  const { token } = useAppSelector((s) => s.user);
  const { data: today, loading: todayLoading } = useNutritionDay(undefined, athleteUserId);
  const { data: compliance, loading: complianceLoading } = useAsyncData<ManagerNutritionCompliance>(
    () => (token ? fetchAthleteNutritionCompliance(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  return (
    <SectionCard
      title="Nutrition"
      subtitle={
        compliance
          ? compliance.compliancePct != null
            ? `${compliance.compliancePct}% logged · ${compliance.daysLogged}/${compliance.daysInRange} days`
            : `${compliance.daysLogged} days logged`
          : undefined
      }
    >
      {complianceLoading ? (
        <Loading />
      ) : compliance ? (
        <View style={{ gap: 10 }}>
          <StatRow label="Days logged" value={`${compliance.daysLogged}${compliance.daysInRange ? ` / ${compliance.daysInRange}` : ""}`} />
          {compliance.targetCalories != null ? (
            <StatRow label="Daily target" value={`${compliance.targetCalories} kcal`} />
          ) : null}
          {today ? (
            <>
              <StatRow label="Today" value={`${today.eatenCalories} / ${today.targetCalories} kcal`} />
              {Object.values(today.meals).map((m) => (
                <StatRow
                  key={m.label}
                  label={m.label}
                  value={m.items.length ? `${m.items.reduce((s, i) => s + i.calories, 0)} kcal` : "—"}
                />
              ))}
            </>
          ) : todayLoading ? (
            <Loading />
          ) : null}
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

function WellbeingSection({ athleteId, range }: { athleteId: number; range: HistoryRange }) {
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<{ logs: ManagerWellbeing[] }>(
    () => (token ? fetchAthleteWellbeing(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  const logs = data?.logs ?? [];
  return (
    <SectionCard title="Wellbeing" subtitle={logs.length ? `${logs.length} submissions` : undefined}>
      {loading ? (
        <Loading />
      ) : logs.length ? (
        <View style={{ gap: 8 }}>
          {logs.slice(0, 60).map((l) => (
            <StatRow key={l.id} label={l.dateKey} value={`Mood ${l.mood} · Energy ${l.energy} · Pain ${l.pain}`} />
          ))}
        </View>
      ) : (
        <Empty label="No wellbeing logged." />
      )}
    </SectionCard>
  );
}
