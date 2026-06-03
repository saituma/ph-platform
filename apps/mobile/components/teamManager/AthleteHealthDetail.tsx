import React, { useEffect, useState } from "react";
import { ActivityIndicator, LayoutAnimation, Platform, Pressable, UIManager, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
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

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Read-only detail for a team manager (or co-manager) viewing one of their athletes.
 * Every read is scoped server-side to a team the manager owns or co-manages.
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
      <EngagementOverview athleteId={athleteId} range={range} />
      <TrainingSection athleteId={athleteId} range={range} />
      <AttendanceSection athleteId={athleteId} range={range} />
      <RunningSection athleteId={athleteId} range={range} />
      {showNutrition ? <NutritionSection athleteId={athleteId} athleteUserId={athleteUserId} range={range} /> : null}
      <AchievementsSection athleteId={athleteId} />
      <BookingsSection athleteId={athleteId} range={range} />
      <ProgressSection athleteId={athleteId} range={range} />
      {showSleep ? <SleepSection athleteUserId={athleteUserId} range={range} /> : null}
      {showWellbeing ? <WellbeingSection athleteId={athleteId} range={range} /> : null}
      <InjuriesSection athleteId={athleteId} range={range} />
    </View>
  );
}

/* ----------------------------- data ----------------------------- */

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

/* --------------------------- primitives -------------------------- */

type Tone = "positive" | "negative" | "warn" | "neutral";

function useTone() {
  const p = useAdminPastel();
  return (tone: Tone): { bg: string; fg: string } => {
    switch (tone) {
      case "positive":
        return { bg: p.successSoft, fg: p.success };
      case "negative":
        return { bg: p.dangerSoft, fg: p.danger };
      case "warn":
        return { bg: p.warningSoft, fg: p.warning };
      default:
        return { bg: p.border, fg: p.textSecondary };
    }
  };
}

function Pill({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const toneOf = useTone();
  const c = toneOf(tone);
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: c.fg, textTransform: "capitalize" }}>{label}</Text>
    </View>
  );
}

function Bar({ pct, tone = "accent" }: { pct: number; tone?: "accent" | "muted" }) {
  const p = useAdminPastel();
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ height: 6, borderRadius: 999, backgroundColor: p.border, overflow: "hidden" }}>
      <View
        style={{ width: `${clamped}%`, height: "100%", borderRadius: 999, backgroundColor: tone === "accent" ? p.accent : p.textMuted }}
      />
    </View>
  );
}

function StatTile({ value, label }: { value: string | number; label: string }) {
  const p = useAdminPastel();
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: "30%",
        minWidth: 92,
        backgroundColor: p.pageBg,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 4,
      }}
    >
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: p.textPrimary }}>{value}</Text>
      <Text
        style={{ fontFamily: "Outfit-SemiBold", fontSize: 10, color: p.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function Row({ label, value, tone }: { label: string; value?: string; tone?: Tone }) {
  const p = useAdminPastel();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
      {tone ? (
        <Pill label={value ?? ""} tone={tone} />
      ) : (
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textPrimary }}>{value}</Text>
      )}
    </View>
  );
}

function Empty({ label }: { label: string }) {
  const p = useAdminPastel();
  return <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textMuted }}>{label}</Text>;
}

function Loading() {
  const p = useAdminPastel();
  return <ActivityIndicator color={p.accent} style={{ alignSelf: "flex-start" }} />;
}

function Section({
  title,
  summary,
  defaultOpen = false,
  loading,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}) {
  const p = useAdminPastel();
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(180, "easeInEaseOut", "opacity"));
    setOpen((o) => !o);
  };
  return (
    <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, overflow: "hidden" }}>
      <Pressable
        accessibilityRole="button"
        onPress={toggle}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 18 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}>{title}</Text>
          {summary ? (
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted, marginTop: 2 }}>
              {summary}
            </Text>
          ) : null}
        </View>
        {loading ? (
          <ActivityIndicator color={p.textMuted} size="small" />
        ) : (
          <ChevronDown size={18} color={p.textMuted} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
        )}
      </Pressable>
      {open ? <View style={{ paddingHorizontal: 18, paddingBottom: 18, gap: 12 }}>{children}</View> : null}
    </View>
  );
}

function RangeToggle({ range, onChange }: { range: HistoryRange; onChange: (r: HistoryRange) => void }) {
  const p = useAdminPastel();
  const options: Array<{ key: HistoryRange; label: string }> = [
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "all", label: "All time" },
  ];
  return (
    <View style={{ flexDirection: "row", backgroundColor: p.cardWhite, borderRadius: 999, padding: 4, gap: 4 }}>
      {options.map((o) => {
        const active = o.key === range;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            onPress={() => onChange(o.key)}
            style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 999, backgroundColor: active ? p.accent : "transparent" }}
          >
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: active ? p.buttonPrimaryText : p.textSecondary }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ----------------------------- helpers --------------------------- */

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sleepRangeFor(range: HistoryRange): "week" | "month" | "all" {
  return range === "7d" ? "week" : range === "30d" ? "month" : "all";
}

function attendanceTone(status: string, checkInAt: string | null): Tone {
  const s = status.toLowerCase();
  if (s === "present" || checkInAt != null) return "positive";
  if (s === "absent") return "negative";
  if (s === "excused" || s === "late") return "warn";
  return "neutral";
}

function bookingTone(status: string | null): Tone {
  const s = (status ?? "").toLowerCase();
  if (s === "confirmed") return "positive";
  if (s === "pending") return "warn";
  if (s === "declined" || s === "cancelled") return "negative";
  return "neutral";
}

function severityTone(severity: string): Tone {
  const s = severity.toLowerCase();
  if (s === "severe") return "negative";
  if (s === "moderate") return "warn";
  return "neutral";
}

/* ---------------------------- sections --------------------------- */

function EngagementOverview({ athleteId, range }: { athleteId: number; range: HistoryRange }) {
  const p = useAdminPastel();
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<ManagerEngagement>(
    () => (token ? fetchAthleteEngagement(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  const rangeLabel = range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "All time";

  return (
    <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}>Engagement</Text>
        <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 11, color: p.textMuted }}>{rangeLabel}</Text>
      </View>
      {loading ? (
        <Loading />
      ) : data ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: data.lastActiveAt ? p.success : p.textMuted }} />
            <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 13, color: p.textSecondary }}>
              Last active {data.lastActiveAt ? fmtDate(data.lastActiveAt) : "—"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <StatTile value={data.counts.sessionsCompleted} label="Sessions" />
            <StatTile value={data.counts.runs} label="Runs" />
            <StatTile value={data.counts.wellbeingLogs} label="Wellbeing" />
            <StatTile value={data.counts.sleepLogs} label="Sleep logs" />
            <StatTile value={data.counts.nutritionDays} label="Nutrition days" />
            <StatTile value={data.counts.progressEntries} label="Progress" />
          </View>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 12, color: p.textSecondary }}>Attendance</Text>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: p.textPrimary }}>
                {data.attendance.pct != null ? `${data.attendance.pct}% · ${data.attendance.present}/${data.attendance.total}` : "—"}
              </Text>
            </View>
            <Bar pct={data.attendance.pct ?? 0} />
          </View>
        </>
      ) : (
        <Empty label="No engagement data." />
      )}
    </View>
  );
}

function TrainingSection({ athleteId, range }: { athleteId: number; range: HistoryRange }) {
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<ManagerTraining>(
    () => (token ? fetchAthleteTraining(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  const t = data?.totals;
  const pct = t && t.programsAssigned > 0 ? Math.round((t.programsCompleted / t.programsAssigned) * 100) : 0;
  return (
    <Section
      title="Training & Programs"
      summary={t ? `${t.programsCompleted}/${t.programsAssigned} programs · ${t.sessionsCompleted} sessions` : undefined}
      loading={loading}
      defaultOpen
    >
      {data ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <StatTile value={`${t!.programsCompleted}/${t!.programsAssigned}`} label="Programs" />
            <StatTile value={t!.sessionsCompleted} label="Sessions" />
            <StatTile value={t!.workoutsLogged} label="Workouts" />
          </View>
          {t!.programsAssigned > 0 ? <Bar pct={pct} /> : null}
          {data.programs.length ? (
            <View style={{ gap: 8 }}>
              {data.programs.slice(0, 8).map((pr) => (
                <Row
                  key={pr.programId}
                  label={pr.name}
                  value={pr.completedAt ? "Completed" : pr.status}
                  tone={pr.completedAt ? "positive" : "neutral"}
                />
              ))}
            </View>
          ) : (
            <Empty label="No programs assigned." />
          )}
        </View>
      ) : (
        <Empty label="No training data." />
      )}
    </Section>
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
    <Section
      title="Attendance"
      summary={data ? (rows.length ? `${present}/${rows.length} present` : "No sessions") : undefined}
      loading={loading}
      defaultOpen
    >
      {rows.length ? (
        <View style={{ gap: 8 }}>
          {rows.slice(0, 30).map((r) => (
            <Row
              key={r.id}
              label={`${r.sessionName} · ${fmtDate(r.startsAt)}`}
              value={r.status}
              tone={attendanceTone(r.status, r.checkInAt)}
            />
          ))}
        </View>
      ) : (
        <Empty label="No attendance records." />
      )}
    </Section>
  );
}

function RunningSection({ athleteId, range }: { athleteId: number; range: HistoryRange }) {
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<{ runs: ManagerRun[] }>(
    () => (token ? fetchAthleteRuns(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  const runs = data?.runs ?? [];
  const totalKm = runs.reduce((s, r) => s + r.distanceMeters / 1000, 0);
  const totalMin = runs.reduce((s, r) => s + r.durationSeconds / 60, 0);
  return (
    <Section
      title="Running"
      summary={data ? (runs.length ? `${runs.length} runs · ${totalKm.toFixed(1)} km` : "No runs") : undefined}
      loading={loading}
      defaultOpen
    >
      {runs.length ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <StatTile value={runs.length} label="Runs" />
            <StatTile value={totalKm.toFixed(1)} label="km total" />
            <StatTile value={Math.round(totalMin)} label="min total" />
          </View>
          <View style={{ gap: 8 }}>
            {runs.slice(0, 20).map((r) => (
              <Row
                key={r.id}
                label={fmtDate(r.date)}
                value={`${(r.distanceMeters / 1000).toFixed(2)} km · ${Math.round(r.durationSeconds / 60)} min`}
              />
            ))}
          </View>
        </View>
      ) : (
        <Empty label="No runs logged." />
      )}
    </Section>
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
  const p = useAdminPastel();
  const { token } = useAppSelector((s) => s.user);
  const { data: today } = useNutritionDay(undefined, athleteUserId);
  const { data: compliance, loading } = useAsyncData<ManagerNutritionCompliance>(
    () => (token ? fetchAthleteNutritionCompliance(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  const summary = compliance
    ? compliance.compliancePct != null
      ? `${compliance.compliancePct}% logged · ${compliance.daysLogged}/${compliance.daysInRange} days`
      : `${compliance.daysLogged} days logged`
    : undefined;
  return (
    <Section title="Nutrition" summary={summary} loading={loading} defaultOpen>
      {compliance ? (
        <View style={{ gap: 12 }}>
          {compliance.compliancePct != null ? (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 12, color: p.textSecondary }}>
                  Logging compliance
                </Text>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: p.textPrimary }}>
                  {compliance.compliancePct}%
                </Text>
              </View>
              <Bar pct={compliance.compliancePct} />
            </View>
          ) : (
            <Row label="Days logged" value={`${compliance.daysLogged}`} />
          )}
          {compliance.targetCalories != null ? (
            <Row label="Daily target" value={`${compliance.targetCalories} kcal`} />
          ) : null}
          {today ? (
            <View style={{ gap: 8 }}>
              <Row label="Today" value={`${today.eatenCalories} / ${today.targetCalories} kcal`} />
              {Object.values(today.meals).map((m) => (
                <Row
                  key={m.label}
                  label={m.label}
                  value={m.items.length ? `${m.items.reduce((s, i) => s + i.calories, 0)} kcal` : "—"}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <Empty label="No nutrition logged." />
      )}
    </Section>
  );
}

function AchievementsSection({ athleteId }: { athleteId: number }) {
  const p = useAdminPastel();
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<ManagerAchievements>(
    () => (token ? fetchAthleteAchievements(token, athleteId) : null),
    [token, athleteId],
  );
  const unlocked = data?.achievements.filter((a) => a.unlocked).length ?? 0;
  return (
    <Section
      title="Achievements"
      summary={data ? `${unlocked}/${data.achievements.length} unlocked` : undefined}
      loading={loading}
    >
      {data ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <StatTile value={data.stats.exerciseCompletions} label="Check-ins" />
            <StatTile value={data.stats.sessionRuns} label="Full sessions" />
            <StatTile value={data.stats.trainingDays} label="Training days" />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {data.achievements.map((a) => (
              <View
                key={a.key}
                style={{
                  backgroundColor: a.unlocked ? p.accentSoft : p.border,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  opacity: a.unlocked ? 1 : 0.7,
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: a.unlocked ? p.accent : p.textMuted }}>
                  {a.unlocked ? "✓ " : ""}
                  {a.title}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Empty label="No achievement data." />
      )}
    </Section>
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
    <Section
      title="Session bookings"
      summary={data ? (bookings.length ? `${bookings.length} bookings` : "No bookings") : undefined}
      loading={loading}
    >
      {bookings.length ? (
        <View style={{ gap: 8 }}>
          {bookings.slice(0, 20).map((b) => (
            <Row
              key={b.id}
              label={`${(b.type ?? "session").replace(/_/g, " ")} · ${fmtDate(b.startsAt)}`}
              value={b.status ?? "—"}
              tone={bookingTone(b.status)}
            />
          ))}
        </View>
      ) : (
        <Empty label="No bookings." />
      )}
    </Section>
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
    <Section
      title="Progress · Strength & body"
      summary={data ? (entries.length ? `${entries.length} entries` : "No entries") : undefined}
      loading={loading}
    >
      {entries.length ? (
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
            return <Row key={e.id} label={label} value={value} />;
          })}
        </View>
      ) : (
        <Empty label="No progress entries." />
      )}
    </Section>
  );
}

function SleepSection({ athleteUserId, range }: { athleteUserId: number; range: HistoryRange }) {
  const { logs, loading } = useSleepData(sleepRangeFor(range), athleteUserId);
  const avgH = logs.length ? logs.reduce((s, l) => s + l.totalMinutes / 60, 0) / logs.length : 0;
  return (
    <Section
      title="Sleep"
      summary={!loading ? (logs.length ? `${logs.length} nights · ${avgH.toFixed(1)}h avg` : "No sleep logged") : undefined}
      loading={loading}
    >
      {logs.length ? (
        <View style={{ gap: 8 }}>
          {logs.slice(0, 30).map((l) => (
            <Row
              key={l.id}
              label={l.dateKey}
              value={`${(l.totalMinutes / 60).toFixed(1)}h${l.quality != null ? ` · Q${l.quality}` : ""}`}
            />
          ))}
        </View>
      ) : (
        <Empty label="No sleep logged." />
      )}
    </Section>
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
    <Section
      title="Wellbeing"
      summary={data ? (logs.length ? `${logs.length} submissions` : "No submissions") : undefined}
      loading={loading}
    >
      {logs.length ? (
        <View style={{ gap: 8 }}>
          {logs.slice(0, 60).map((l) => (
            <Row key={l.id} label={l.dateKey} value={`Mood ${l.mood} · Energy ${l.energy} · Pain ${l.pain}`} />
          ))}
        </View>
      ) : (
        <Empty label="No wellbeing logged." />
      )}
    </Section>
  );
}

function InjuriesSection({ athleteId, range }: { athleteId: number; range: HistoryRange }) {
  const { token } = useAppSelector((s) => s.user);
  const { data, loading } = useAsyncData<{ injuries: ManagerInjury[] }>(
    () => (token ? fetchAthleteInjuries(token, athleteId, range) : null),
    [token, athleteId, range],
  );
  const injuries = data?.injuries ?? [];
  const active = injuries.filter((i) => !i.resolvedAt).length;
  return (
    <Section
      title="Injuries"
      summary={data ? (injuries.length ? `${active} active · ${injuries.length} total` : "None logged") : undefined}
      loading={loading}
    >
      {injuries.length ? (
        <View style={{ gap: 8 }}>
          {injuries.slice(0, 20).map((i) => (
            <Row
              key={i.id}
              label={`${i.bodyPart ?? i.description} · ${fmtDate(i.occurredAt)}`}
              value={i.resolvedAt ? "Resolved" : i.severity}
              tone={i.resolvedAt ? "positive" : severityTone(i.severity)}
            />
          ))}
        </View>
      ) : (
        <Empty label="No injuries logged." />
      )}
    </Section>
  );
}
