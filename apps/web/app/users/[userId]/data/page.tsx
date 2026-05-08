"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { skipToken } from "@reduxjs/toolkit/query";
import Link from "next/link";
import {
  ArrowLeft,
  Moon,
  Apple,
  Activity,
  Flame,
  Clock,
  Droplets,
  Zap,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronRight,
  Trophy,
  Target,
  Dumbbell,
  TrendingUp,
  Heart,
  Star,
  Footprints,
  Video,
  CalendarCheck,
  UtensilsCrossed,
  Flag,
  MapPin,
  LinkIcon,
  ExternalLink,
  Camera,
  Play,
  CheckCircle2,
  XCircle,
  ClockIcon,
  HeartPulse,
  Smile,
  AlertTriangle,
} from "lucide-react";
import { AdminShell } from "../../../../components/admin/shell";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { Card, CardContent } from "../../../../components/ui/card";
import { cn } from "../../../../lib/utils";
import {
  useGetSleepLogsQuery,
  useReviewSleepLogMutation,
  type SleepLogRecord,
} from "../../../../lib/api/sleep";
import {
  useGetNutritionLogsQuery,
  useGetNutritionTargetsQuery,
  useReviewNutritionLogMutation,
  useGetFoodDiaryQuery,
  useReviewFoodDiaryMutation,
} from "../../../../lib/api/nutrition";
import {
  useGetAdminRunTrackingQuery,
  useGetAdminTrainingQuestionnairesQuery,
  useGetTrackingGoalsQuery,
} from "../../../../lib/api/tracking";
import {
  useGetVideoUploadsQuery,
  useReviewVideoUploadMutation,
} from "../../../../lib/api/media";
import {
  useGetBookingsQuery,
} from "../../../../lib/api/bookings";
import {
  useGetWellbeingLogsQuery,
  useReviewWellbeingLogMutation,
  type WellbeingLogRecord,
} from "../../../../lib/api/wellbeing";
import {
  useGetUsersQuery,
  useGetUserProgramSectionCompletionsQuery,
} from "../../../../lib/apiSlice";

// ---- Helpers ----

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatPace(pace: number | null | undefined): string {
  if (!pace) return "—";
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function qualityLabel(q: number | null) {
  if (!q) return { label: "—", color: "text-muted-foreground" };
  const map: Record<number, { label: string; color: string }> = {
    1: { label: "Poor", color: "text-red-500" },
    2: { label: "Fair", color: "text-orange-500" },
    3: { label: "Good", color: "text-yellow-500" },
    4: { label: "Great", color: "text-emerald-500" },
    5: { label: "Excellent", color: "text-primary" },
  };
  return map[q] ?? { label: "—", color: "text-muted-foreground" };
}

// ---- Styled primitives ----

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "relative overflow-hidden rounded-[2rem] border border-white/10 bg-card/60 backdrop-blur-xl shadow-2xl p-8",
    className
  )}>
    <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/5 blur-[80px]" />
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, title, subtitle, count }: { icon: any; title: string; subtitle?: string; count?: number }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-black uppercase tracking-tight text-foreground">{title}</h3>
        {subtitle && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {count !== undefined && (
      <Badge variant="outline" className="h-7 px-3 text-[10px] font-black uppercase tracking-widest">
        {count} records
      </Badge>
    )}
  </div>
);

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color?: string }) => (
  <div className="flex items-center gap-3 p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", color || "bg-primary/10 text-primary")}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</p>
      <p className="text-lg font-black tracking-tight text-foreground">{value}</p>
    </div>
  </div>
);

// ---- Tabs ----

type TabKey = "sleep" | "wellbeing" | "nutrition" | "performance" | "training" | "videos" | "bookings";

export default function UserDataPage() {
  const params = useParams();
  const userId = params?.userId ? Number(params.userId) : NaN;
  const isValid = Number.isFinite(userId) && userId > 0;

  const [tab, setTab] = useState<TabKey>("sleep");
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const from = daysAgoIso(Number(range));

  const { data: usersData } = useGetUsersQuery();
  const rawUser = useMemo(
    () => ((usersData?.users ?? []) as any[]).find((u: any) => u.id === userId),
    [usersData, userId],
  );
  const displayName = rawUser?.name ?? rawUser?.email ?? "User";

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "sleep", label: "Sleep", icon: Moon },
    { key: "wellbeing", label: "Wellbeing", icon: HeartPulse },
    { key: "nutrition", label: "Nutrition", icon: Apple },
    { key: "performance", label: "Runs & Activity", icon: Footprints },
    { key: "training", label: "Training Logs", icon: Dumbbell },
    { key: "videos", label: "Video Feedback", icon: Video },
    { key: "bookings", label: "Bookings", icon: CalendarCheck },
  ];

  return (
    <AdminShell
      title={`${displayName} — Data`}
      subtitle={
        <span className="flex items-center gap-2">
          <span className="font-mono opacity-50">#{userId}</span>
          <span className="text-muted-foreground/30">•</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Athlete Intelligence</span>
        </span>
      }
    >
      <div className="mx-auto max-w-7xl space-y-8 pb-24">
        {/* Back bar */}
        <Button variant="outline" size="sm" className="gap-1.5 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10" render={<Link href={`/users/${userId}`} />}>
          <ArrowLeft className="h-4 w-4" />
          Back to User Profile
        </Button>

        {/* Tab bar + range filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            {tabs.map((t) => (
              <Button
                key={t.key}
                size="sm"
                variant={tab === t.key ? "default" : "outline"}
                className={cn(
                  "gap-2 rounded-2xl text-[11px] font-black uppercase tracking-widest",
                  tab !== t.key && "border-white/10 bg-white/5 hover:bg-white/10"
                )}
                onClick={() => setTab(t.key)}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            {(["7", "30", "90"] as const).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "outline"}
                className={cn(
                  "rounded-xl text-[10px] font-black uppercase tracking-widest",
                  range !== r && "border-white/10 bg-white/5"
                )}
                onClick={() => setRange(r)}
              >
                {r}d
              </Button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {isValid && tab === "sleep" && <SleepTab userId={userId} from={from} range={range} />}
        {isValid && tab === "wellbeing" && <WellbeingTab userId={userId} from={from} range={range} />}
        {isValid && tab === "nutrition" && <NutritionTab userId={userId} from={from} range={range} displayName={displayName} />}
        {isValid && tab === "performance" && <PerformanceTab userId={userId} from={from} />}
        {isValid && tab === "training" && <TrainingTab userId={userId} from={from} />}
        {isValid && tab === "videos" && <VideoFeedbackTab displayName={displayName} userId={userId} />}
        {isValid && tab === "bookings" && <BookingsTab displayName={displayName} userId={userId} />}
      </div>
    </AdminShell>
  );
}

// ========== SLEEP TAB ==========

function SleepTab({ userId, from, range }: { userId: number; from: string; range: string }) {
  const { data, isLoading } = useGetSleepLogsQuery({ userId, from, limit: 90 }, { skip: !userId });
  const logs = data?.logs ?? [];

  const avgMinutes = useMemo(() => {
    if (!logs.length) return 0;
    return Math.round(logs.reduce((s, l) => s + l.totalMinutes, 0) / logs.length);
  }, [logs]);

  const avgQuality = useMemo(() => {
    const rated = logs.filter((l) => l.quality);
    if (!rated.length) return null;
    return (rated.reduce((s, l) => s + (l.quality ?? 0), 0) / rated.length).toFixed(1);
  }, [logs]);

  const bestNight = useMemo(() => {
    if (!logs.length) return null;
    return logs.reduce((best, l) => (l.totalMinutes > best.totalMinutes ? l : best), logs[0]);
  }, [logs]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Avg Duration" value={formatHours(avgMinutes)} icon={Clock} />
        <StatCard label="Avg Quality" value={avgQuality ? `${avgQuality}/5` : "—"} icon={Star} color="bg-amber-500/10 text-amber-500" />
        <StatCard label="Total Logs" value={logs.length} icon={Moon} color="bg-blue-500/10 text-blue-500" />
        <StatCard label="Best Night" value={bestNight ? formatHours(bestNight.totalMinutes) : "—"} icon={Trophy} color="bg-emerald-500/10 text-emerald-500" />
      </div>

      {/* Trend chart */}
      {logs.length > 0 && (
        <GlassCard>
          <SectionTitle icon={TrendingUp} title="Sleep Trend" subtitle={`Last ${range} days`} count={logs.length} />
          <div className="space-y-2">
            {logs.slice(0, 14).map((log) => (
              <div key={log.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16 shrink-0 font-mono">
                  {log.dateKey.slice(5)}
                </span>
                <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      log.totalMinutes >= 420 ? "bg-primary" : log.totalMinutes >= 360 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${Math.min(100, (log.totalMinutes / 600) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-foreground w-14 text-right font-mono">
                  {formatHours(log.totalMinutes)}
                </span>
                <span className={cn("text-xs font-bold w-8 text-right", qualityLabel(log.quality).color)}>
                  {log.quality ? `${log.quality}/5` : ""}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Individual logs */}
      <GlassCard>
        <SectionTitle icon={Moon} title="Sleep Logs" subtitle="Detailed records with coach feedback" />
        {logs.length === 0 ? (
          <EmptyState icon={Moon} text="No sleep logs recorded" />
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 30).map((log) => (
              <SleepLogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function SleepLogCard({ log }: { log: SleepLogRecord }) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(log.coachFeedback ?? "");
  const [reviewLog, { isLoading: isSending }] = useReviewSleepLogMutation();
  const q = qualityLabel(log.quality);

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
      <button className="w-full text-left p-4 hover:bg-white/[0.03] transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
              <Moon className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {new Date(log.dateKey + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              {log.bedTime && (
                <p className="text-[10px] text-muted-foreground/60 font-mono">
                  {log.bedTime} — {log.wakeTime}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-black font-mono">{formatHours(log.totalMinutes)}</span>
            <span className={cn("text-xs font-bold", q.color)}>{q.label}</span>
            {log.coachFeedback && <MessageSquare className="h-3 w-3 text-primary" />}
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground/40" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          {(log.deepMinutes || log.remMinutes || log.lightMinutes) && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Deep", value: log.deepMinutes },
                { label: "REM", value: log.remMinutes },
                { label: "Light", value: log.lightMinutes },
              ].map((s) => (
                <div key={s.label} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{s.label}</p>
                  <p className="text-sm font-bold mt-1">{formatHours(s.value ?? 0)}</p>
                </div>
              ))}
            </div>
          )}

          {log.notes && (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Notes</p>
              <p className="text-xs text-foreground/80">{log.notes}</p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Coach Feedback
            </p>
            {log.coachFeedback ? (
              <p className="text-xs text-foreground bg-primary/5 p-2 rounded-lg">{log.coachFeedback}</p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Add feedback..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && feedback.trim() && reviewLog({ logId: log.id, feedback: feedback.trim() })}
                />
                <Button
                  size="sm"
                  disabled={!feedback.trim() || isSending}
                  onClick={() => reviewLog({ logId: log.id, feedback: feedback.trim() })}
                  className="rounded-xl"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== WELLBEING TAB ==========

const MOOD_LABELS = ["", "Very Low", "Low", "Okay", "Good", "Great"];
const ENERGY_LABELS = ["", "Exhausted", "Tired", "Normal", "Energized", "Peak"];
const PAIN_LABELS = ["", "None", "Mild", "Moderate", "High", "Severe"];

function wellbeingColor(value: number, type: "mood" | "energy" | "pain"): string {
  if (type === "pain") return value >= 4 ? "text-red-500" : value >= 3 ? "text-amber-500" : "text-emerald-500";
  return value <= 2 ? "text-red-500" : value === 3 ? "text-amber-500" : "text-emerald-500";
}

function WellbeingTab({ userId, from, range }: { userId: number; from: string; range: string }) {
  const { data, isLoading } = useGetWellbeingLogsQuery({ userId, from, limit: 90 }, { skip: !userId });
  const logs = data?.logs ?? [];

  const avgMood = useMemo(() => {
    if (!logs.length) return null;
    return (logs.reduce((s, l) => s + l.mood, 0) / logs.length).toFixed(1);
  }, [logs]);

  const avgEnergy = useMemo(() => {
    if (!logs.length) return null;
    return (logs.reduce((s, l) => s + l.energy, 0) / logs.length).toFixed(1);
  }, [logs]);

  const avgPain = useMemo(() => {
    if (!logs.length) return null;
    return (logs.reduce((s, l) => s + l.pain, 0) / logs.length).toFixed(1);
  }, [logs]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Avg Mood" value={avgMood ? `${avgMood}/5` : "—"} icon={Smile} color="bg-amber-500/10 text-amber-500" />
        <StatCard label="Avg Energy" value={avgEnergy ? `${avgEnergy}/5` : "—"} icon={Zap} color="bg-emerald-500/10 text-emerald-500" />
        <StatCard label="Avg Pain" value={avgPain ? `${avgPain}/5` : "—"} icon={AlertTriangle} color="bg-red-500/10 text-red-500" />
        <StatCard label="Total Logs" value={logs.length} icon={HeartPulse} color="bg-primary/10 text-primary" />
      </div>

      {logs.length > 0 && (
        <GlassCard>
          <SectionTitle icon={TrendingUp} title="Wellbeing Trend" subtitle={`Last ${range} days`} count={logs.length} />
          <div className="space-y-2">
            {logs.slice(0, 14).map((log) => (
              <div key={log.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16 shrink-0 font-mono">
                  {log.dateKey.slice(5)}
                </span>
                <div className="flex gap-3 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Smile className="h-3.5 w-3.5 text-amber-500" />
                    <div className="w-16 h-4 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${(log.mood / 5) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold w-4 text-amber-500">{log.mood}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-emerald-500" />
                    <div className="w-16 h-4 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(log.energy / 5) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold w-4 text-emerald-500">{log.energy}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    <div className="w-16 h-4 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${(log.pain / 5) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold w-4 text-red-500">{log.pain}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <SectionTitle icon={HeartPulse} title="Wellbeing Logs" subtitle="Daily check-ins with mood, energy, and pain" />
        {logs.length === 0 ? (
          <EmptyState icon={HeartPulse} text="No wellbeing logs recorded" />
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 30).map((log) => (
              <WellbeingLogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function WellbeingLogCard({ log }: { log: WellbeingLogRecord }) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(log.coachFeedback ?? "");
  const [reviewLog, { isLoading: isSending }] = useReviewWellbeingLogMutation();

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
      <button
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <HeartPulse className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{log.dateKey}</p>
          <div className="flex gap-3 mt-1">
            <span className={cn("text-xs font-bold", wellbeingColor(log.mood, "mood"))}>
              Mood {log.mood}/5
            </span>
            <span className={cn("text-xs font-bold", wellbeingColor(log.energy, "energy"))}>
              Energy {log.energy}/5
            </span>
            <span className={cn("text-xs font-bold", wellbeingColor(log.pain, "pain"))}>
              Pain {log.pain}/5
            </span>
          </div>
        </div>
        {log.coachFeedback && (
          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/30 text-primary">
            Reviewed
          </Badge>
        )}
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3 text-center">
              <Smile className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-black text-amber-500">{log.mood}/5</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{MOOD_LABELS[log.mood]}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3 text-center">
              <Zap className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-lg font-black text-emerald-500">{log.energy}/5</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{ENERGY_LABELS[log.energy]}</p>
            </div>
            <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-3 text-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <p className="text-lg font-black text-red-500">{log.pain}/5</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{PAIN_LABELS[log.pain]}</p>
            </div>
          </div>

          {log.notes && (
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Notes</p>
              <p className="text-sm text-foreground/80">{log.notes}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Coach Feedback</p>
            <textarea
              className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-foreground placeholder-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              rows={2}
              placeholder="Write feedback for this athlete..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <Button
              size="sm"
              className="gap-1.5 rounded-xl"
              disabled={!feedback.trim() || isSending}
              onClick={() => reviewLog({ logId: log.id, feedback: feedback.trim() })}
            >
              <Send className="h-3.5 w-3.5" />
              {isSending ? "Sending..." : "Send Feedback"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== NUTRITION TAB ==========

function NutritionTab({ userId, from, range, displayName }: { userId: number; from: string; range: string; displayName: string }) {
  const { data: logsData, isLoading: logsLoading } = useGetNutritionLogsQuery({ userId, from, limit: 90 }, { skip: !userId });
  const { data: targetsData } = useGetNutritionTargetsQuery(userId, { skip: !userId });
  const { data: foodDiaryData } = useGetFoodDiaryQuery({ q: displayName, limit: 50 });
  const logs = logsData?.logs ?? [];
  const targets = targetsData?.targets;
  const foodDiary = (foodDiaryData?.items ?? []).filter((item: any) => item.userId === userId || item.athleteUserId === userId);

  const avgCalories = useMemo(() => {
    const cals = logs.filter((l: any) => l.calories).map((l: any) => l.calories);
    return cals.length ? Math.round(cals.reduce((s: number, c: number) => s + c, 0) / cals.length) : null;
  }, [logs]);

  const avgProtein = useMemo(() => {
    const vals = logs.filter((l: any) => l.protein).map((l: any) => l.protein);
    return vals.length ? Math.round(vals.reduce((s: number, v: number) => s + v, 0) / vals.length) : null;
  }, [logs]);

  const avgWater = useMemo(() => {
    const vals = logs.filter((l: any) => l.waterIntake).map((l: any) => l.waterIntake);
    return vals.length ? (vals.reduce((s: number, v: number) => s + v, 0) / vals.length).toFixed(1) : null;
  }, [logs]);

  if (logsLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Targets */}
      {targets && (
        <GlassCard className="border-amber-500/20">
          <SectionTitle icon={Target} title="Nutrition Targets" subtitle="Coach-set daily goals" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Calories", value: targets.calories ? `${targets.calories} kcal` : "—" },
              { label: "Protein", value: targets.protein ? `${targets.protein}g` : "—" },
              { label: "Carbs", value: targets.carbs ? `${targets.carbs}g` : "—" },
              { label: "Fats", value: targets.fats ? `${targets.fats}g` : "—" },
            ].map((t) => (
              <div key={t.label} className="text-center p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{t.label}</p>
                <p className="text-lg font-black mt-1">{t.value}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Avg Calories" value={avgCalories ? `${avgCalories}` : "—"} icon={Flame} color="bg-orange-500/10 text-orange-500" />
        <StatCard label="Avg Protein" value={avgProtein ? `${avgProtein}g` : "—"} icon={Dumbbell} color="bg-red-500/10 text-red-500" />
        <StatCard label="Avg Water" value={avgWater ? `${avgWater}L` : "—"} icon={Droplets} color="bg-blue-500/10 text-blue-500" />
        <StatCard label="Total Logs" value={logs.length} icon={Apple} color="bg-green-500/10 text-green-500" />
      </div>

      {/* Individual logs */}
      <GlassCard>
        <SectionTitle icon={Apple} title="Nutrition Logs" subtitle={`Last ${range} days`} count={logs.length} />
        {logs.length === 0 ? (
          <EmptyState icon={Apple} text="No nutrition logs recorded" />
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 30).map((log: any) => (
              <NutritionLogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </GlassCard>

      {/* Food Diary */}
      <GlassCard>
        <SectionTitle icon={UtensilsCrossed} title="Food Diary" subtitle="Photo-based meal tracking" count={foodDiary.length} />
        {foodDiary.length === 0 ? (
          <EmptyState icon={UtensilsCrossed} text="No food diary entries" />
        ) : (
          <div className="space-y-3">
            {foodDiary.slice(0, 20).map((entry: any) => (
              <FoodDiaryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function FoodDiaryCard({ entry }: { entry: any }) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(entry.coachFeedback ?? "");
  const [reviewEntry, { isLoading: isSending }] = useReviewFoodDiaryMutation();

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
      <button className="w-full text-left p-4 hover:bg-white/[0.03] transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
              <UtensilsCrossed className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {entry.dateKey ? new Date(entry.dateKey + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "—"}
              </p>
              {entry.mealType && <p className="text-[10px] text-muted-foreground/60 font-mono capitalize">{entry.mealType}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {entry.coachFeedback && <MessageSquare className="h-3 w-3 text-primary" />}
            {entry.photoUrl && <Camera className="h-3 w-3 text-muted-foreground/60" />}
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground/40" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          {entry.photoUrl && (
            <img src={entry.photoUrl} alt="Meal photo" className="w-full max-h-64 object-cover rounded-xl" />
          )}
          {entry.notes && (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Notes</p>
              <p className="text-xs text-foreground/80">{entry.notes}</p>
            </div>
          )}
          {entry.quantity && (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Quantity</p>
              <p className="text-xs text-foreground/80">{entry.quantity}</p>
            </div>
          )}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Coach Feedback
            </p>
            {entry.coachFeedback ? (
              <p className="text-xs text-foreground bg-primary/5 p-2 rounded-lg">{entry.coachFeedback}</p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Add feedback..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && feedback.trim() && reviewEntry({ entryId: entry.id, feedback: feedback.trim() })}
                />
                <Button
                  size="sm"
                  disabled={!feedback.trim() || isSending}
                  onClick={() => reviewEntry({ entryId: entry.id, feedback: feedback.trim() })}
                  className="rounded-xl"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NutritionLogCard({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(log.coachFeedback ?? "");
  const [reviewLog, { isLoading: isSending }] = useReviewNutritionLogMutation();

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
      <button className="w-full text-left p-4 hover:bg-white/[0.03] transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10">
              <Apple className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {log.dateKey ? new Date(log.dateKey + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "—"}
              </p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 font-mono">
                {log.calories && <span>{log.calories} kcal</span>}
                {log.protein && <span>{log.protein}g protein</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {log.mood && (
              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">
                Mood: {log.mood}/5
              </Badge>
            )}
            {log.coachFeedback && <MessageSquare className="h-3 w-3 text-primary" />}
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground/40" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          {/* Macros grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Calories", value: log.calories ? `${log.calories} kcal` : "—", color: "text-orange-500" },
              { label: "Protein", value: log.protein ? `${log.protein}g` : "—", color: "text-red-500" },
              { label: "Carbs", value: log.carbs ? `${log.carbs}g` : "—", color: "text-amber-500" },
              { label: "Fats", value: log.fats ? `${log.fats}g` : "—", color: "text-blue-500" },
            ].map((m) => (
              <div key={m.label} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{m.label}</p>
                <p className={cn("text-sm font-bold mt-1", m.color)}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Wellness metrics */}
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Water", value: log.waterIntake ? `${log.waterIntake}L` : "—" },
              { label: "Mood", value: log.mood ? `${log.mood}/5` : "—" },
              { label: "Energy", value: log.energy ? `${log.energy}/5` : "—" },
              { label: "Pain", value: log.pain ? `${log.pain}/10` : "—" },
              { label: "Steps", value: log.steps ? log.steps.toLocaleString() : "—" },
            ].map((m) => (
              <div key={m.label} className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{m.label}</p>
                <p className="text-xs font-bold mt-1">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Meals */}
          {(log.breakfast || log.lunch || log.dinner || log.snacks) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: "Breakfast", value: log.breakfast },
                { label: "Lunch", value: log.lunch },
                { label: "Dinner", value: log.dinner },
                { label: "Snacks", value: log.snacks },
              ].filter((m) => m.value).map((m) => (
                <div key={m.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{m.label}</p>
                  <p className="text-xs text-foreground/80">{typeof m.value === "string" ? m.value : JSON.stringify(m.value)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Coach feedback */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Coach Feedback
            </p>
            {log.coachFeedback ? (
              <p className="text-xs text-foreground bg-primary/5 p-2 rounded-lg">{log.coachFeedback}</p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Add feedback..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && feedback.trim() && reviewLog({ logId: log.id, feedback: feedback.trim() })}
                />
                <Button
                  size="sm"
                  disabled={!feedback.trim() || isSending}
                  onClick={() => reviewLog({ logId: log.id, feedback: feedback.trim() })}
                  className="rounded-xl"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== PERFORMANCE TAB ==========

const SPORT_LABELS: Record<string, string> = {
  run: "Run",
  trail_run: "Trail Run",
  walk: "Walk",
  hike: "Hike",
  virtual_run: "Virtual Run",
  treadmill: "Treadmill",
  ride: "Ride",
  virtual_ride: "Virtual Ride",
  e_bike: "E-Bike",
  mountain_bike: "Mountain Bike",
  swim: "Swim",
  open_water_swim: "Open Water Swim",
};

function sportLabel(sport: string | null | undefined): string {
  if (!sport) return "Run";
  return SPORT_LABELS[sport] ?? sport.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function PerformanceTab({ userId, from }: { userId: number; from: string }) {
  const { data, isLoading } = useGetAdminRunTrackingQuery({ userId, from, limit: 100 }, { skip: !userId });
  const allRuns = data?.items ?? [];
  const summary = data?.summary;
  const [sportFilter, setSportFilter] = useState<string>("all");

  const availableSports = useMemo(() => {
    const sports = new Set<string>();
    allRuns.forEach((r) => { if (r.sport) sports.add(r.sport); });
    return Array.from(sports).sort();
  }, [allRuns]);

  const runs = useMemo(
    () => sportFilter === "all" ? allRuns : allRuns.filter((r) => (r.sport || "run") === sportFilter),
    [allRuns, sportFilter],
  );

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Runs" value={summary?.totalRuns ?? runs.length} icon={Footprints} />
        <StatCard
          label="Total Distance"
          value={summary ? `${(summary.totalMeters / 1000).toFixed(1)} km` : "—"}
          icon={TrendingUp}
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          label="Total Time"
          value={summary ? formatDuration(summary.totalSeconds) : "—"}
          icon={Clock}
          color="bg-amber-500/10 text-amber-500"
        />
        <StatCard
          label="Avg Calories"
          value={runs.length ? Math.round(runs.filter((r) => r.calories).reduce((s, r) => s + (r.calories ?? 0), 0) / (runs.filter((r) => r.calories).length || 1)) : "—"}
          icon={Flame}
          color="bg-orange-500/10 text-orange-500"
        />
      </div>

      {/* Run list */}
      <GlassCard>
        <SectionTitle icon={Footprints} title="Run History" subtitle="Tracked runs and activities" count={runs.length} />

        {/* Sport filter */}
        {availableSports.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-5">
            <Button
              size="sm"
              variant={sportFilter === "all" ? "default" : "outline"}
              className={cn(
                "rounded-xl text-[10px] font-black uppercase tracking-widest",
                sportFilter !== "all" && "border-white/10 bg-white/5 hover:bg-white/10"
              )}
              onClick={() => setSportFilter("all")}
            >
              All
            </Button>
            {availableSports.map((sport) => (
              <Button
                key={sport}
                size="sm"
                variant={sportFilter === sport ? "default" : "outline"}
                className={cn(
                  "rounded-xl text-[10px] font-black uppercase tracking-widest",
                  sportFilter !== sport && "border-white/10 bg-white/5 hover:bg-white/10"
                )}
                onClick={() => setSportFilter(sport)}
              >
                {sportLabel(sport)}
              </Button>
            ))}
          </div>
        )}

        {runs.length === 0 ? (
          <EmptyState icon={Footprints} text="No runs tracked" />
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function RunCard({ run }: { run: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
      <button className="w-full text-left p-4 hover:bg-white/[0.03] transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <Footprints className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                {new Date(run.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                {run.sport && run.sport !== "run" && (
                  <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest py-0">
                    {sportLabel(run.sport)}
                  </Badge>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground/60 font-mono">
                {(run.distanceMeters / 1000).toFixed(2)} km • {formatDuration(run.durationSeconds)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {run.effortLevel && (
              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">
                Effort {run.effortLevel}/10
              </Badge>
            )}
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground/40" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Distance", value: `${(run.distanceMeters / 1000).toFixed(2)} km` },
              { label: "Duration", value: formatDuration(run.durationSeconds) },
              { label: "Avg Pace", value: formatPace(run.avgPace) },
              { label: "Calories", value: run.calories ? `${run.calories} kcal` : "—" },
            ].map((s) => (
              <div key={s.label} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{s.label}</p>
                <p className="text-sm font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {run.notes && (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Notes</p>
              <p className="text-xs text-foreground/80">{run.notes}</p>
            </div>
          )}

          {run.feelTags && (
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(run.feelTags) ? run.feelTags : []).map((tag: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[9px] font-bold uppercase tracking-widest">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== TRAINING TAB ==========

function TrainingTab({ userId, from }: { userId: number; from: string }) {
  const { data: questData, isLoading: questLoading } = useGetAdminTrainingQuestionnairesQuery({ userId, from, limit: 100 }, { skip: !userId });
  const { data: compData, isLoading: compLoading } = useGetUserProgramSectionCompletionsQuery(
    userId ? { userId, from, limit: 200 } : skipToken,
  );
  const { data: goalsData } = useGetTrackingGoalsQuery();
  const allGoals = goalsData?.goals ?? [];
  const userGoals = allGoals.filter((g: any) => g.athleteId === userId || g.scope === "all");

  const questionnaires = questData?.items ?? [];
  const completions = (compData?.items ?? []) as any[];
  const isLoading = questLoading || compLoading;

  const avgRpe = useMemo(() => {
    const vals = questionnaires.filter((q) => q.rpe).map((q) => q.rpe!);
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : null;
  }, [questionnaires]);

  const avgSoreness = useMemo(() => {
    const vals = questionnaires.filter((q) => q.soreness).map((q) => q.soreness!);
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : null;
  }, [questionnaires]);

  const avgFatigue = useMemo(() => {
    const vals = questionnaires.filter((q) => q.fatigue).map((q) => q.fatigue!);
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : null;
  }, [questionnaires]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sessions Logged" value={completions.length} icon={Dumbbell} />
        <StatCard label="Avg RPE" value={avgRpe ?? "—"} icon={Zap} color="bg-red-500/10 text-red-500" />
        <StatCard label="Avg Soreness" value={avgSoreness ?? "—"} icon={Heart} color="bg-amber-500/10 text-amber-500" />
        <StatCard label="Avg Fatigue" value={avgFatigue ?? "—"} icon={Activity} color="bg-blue-500/10 text-blue-500" />
      </div>

      {/* Training questionnaires */}
      <GlassCard>
        <SectionTitle icon={Dumbbell} title="Training Responses" subtitle="Post-workout self-reports" count={questionnaires.length} />
        {questionnaires.length === 0 ? (
          <EmptyState icon={Dumbbell} text="No training questionnaires recorded" />
        ) : (
          <div className="space-y-3">
            {questionnaires.slice(0, 30).map((q) => (
              <div key={`${q.source}-${q.id}`} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                      <Dumbbell className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{q.title || "Training Session"}</p>
                      <p className="text-[10px] text-muted-foreground/60 font-mono">
                        {q.completedAt ? new Date(q.completedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "—"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">
                    {q.source.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "RPE", value: q.rpe, max: 10, color: q.rpe && q.rpe >= 8 ? "text-red-500" : "text-foreground" },
                    { label: "Soreness", value: q.soreness, max: 10, color: q.soreness && q.soreness >= 7 ? "text-amber-500" : "text-foreground" },
                    { label: "Fatigue", value: q.fatigue, max: 10, color: q.fatigue && q.fatigue >= 7 ? "text-orange-500" : "text-foreground" },
                  ].map((m) => (
                    <div key={m.label} className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{m.label}</p>
                      <p className={cn("text-lg font-black mt-1", m.color)}>{m.value ?? "—"}</p>
                    </div>
                  ))}
                </div>
                {q.notes && (
                  <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Notes</p>
                    <p className="text-xs text-foreground/80">{q.notes}</p>
                  </div>
                )}
                {(q.weightsUsed || q.repsCompleted) && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {q.weightsUsed && (
                      <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Weights</p>
                        <p className="text-xs font-bold mt-1">{q.weightsUsed}</p>
                      </div>
                    )}
                    {q.repsCompleted && (
                      <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Reps</p>
                        <p className="text-xs font-bold mt-1">{q.repsCompleted}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Program completions */}
      {completions.length > 0 && (
        <GlassCard>
          <SectionTitle icon={Trophy} title="Program Completions" subtitle="Section completion history" count={completions.length} />
          <div className="space-y-2">
            {completions.slice(0, 20).map((c: any, i: number) => (
              <div key={c.id ?? i} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{c.sectionTitle || c.programTitle || "Session"}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono">
                      {c.completedAt ? new Date(c.completedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.rpe && <span className="text-[9px] font-bold text-muted-foreground">RPE {c.rpe}</span>}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Tracking Goals */}
      <GlassCard>
        <SectionTitle icon={Flag} title="Tracking Goals" subtitle="Coach-assigned targets" count={userGoals.length} />
        {userGoals.length === 0 ? (
          <EmptyState icon={Flag} text="No tracking goals assigned" />
        ) : (
          <div className="space-y-3">
            {userGoals.map((goal: any) => (
              <div key={goal.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl",
                      goal.status === "completed" ? "bg-emerald-500/10" : "bg-amber-500/10"
                    )}>
                      {goal.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Target className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{goal.title}</p>
                      {goal.description && <p className="text-[10px] text-muted-foreground/60">{goal.description}</p>}
                    </div>
                  </div>
                  <Badge
                    variant={goal.status === "completed" ? "default" : "outline"}
                    className="text-[9px] font-bold uppercase tracking-widest"
                  >
                    {goal.status || "active"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Target</p>
                    <p className="text-sm font-bold mt-1">{goal.targetValue} {goal.unit === "custom" ? goal.customUnit : goal.unit}</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Scope</p>
                    <p className="text-sm font-bold mt-1 capitalize">{goal.scope}</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Due</p>
                    <p className="text-sm font-bold mt-1">{goal.dueDate ? new Date(goal.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ========== VIDEO FEEDBACK TAB ==========

function VideoFeedbackTab({ displayName, userId }: { displayName: string; userId: number }) {
  const { data, isLoading } = useGetVideoUploadsQuery({ q: displayName, limit: 100 });
  const allVideos = data?.items ?? [];
  const videos = allVideos.filter((v: any) => v.athleteUserId === userId || v.guardianUserId === userId || v.userId === userId);
  const [reviewVideo, { isLoading: isReviewing }] = useReviewVideoUploadMutation();

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Videos" value={videos.length} icon={Video} />
        <StatCard
          label="Reviewed"
          value={videos.filter((v: any) => v.coachFeedback || v.status === "reviewed").length}
          icon={CheckCircle2}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          label="Pending"
          value={videos.filter((v: any) => !v.coachFeedback && v.status !== "reviewed").length}
          icon={Clock}
          color="bg-amber-500/10 text-amber-500"
        />
      </div>

      <GlassCard>
        <SectionTitle icon={Video} title="Video Uploads" subtitle="Athlete form checks & submissions" count={videos.length} />
        {videos.length === 0 ? (
          <EmptyState icon={Video} text="No video uploads found" />
        ) : (
          <div className="space-y-3">
            {videos.map((video: any) => (
              <VideoCard key={video.id} video={video} onReview={reviewVideo} isReviewing={isReviewing} />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function VideoCard({ video, onReview, isReviewing }: { video: any; onReview: any; isReviewing: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(video.coachFeedback ?? "");

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
      <button className="w-full text-left p-4 hover:bg-white/[0.03] transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10">
              <Play className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{video.title || video.exerciseName || "Video Upload"}</p>
              <p className="text-[10px] text-muted-foreground/60 font-mono">
                {video.createdAt ? new Date(video.createdAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={video.coachFeedback || video.status === "reviewed" ? "default" : "outline"}
              className="text-[9px] font-bold uppercase tracking-widest"
            >
              {video.coachFeedback || video.status === "reviewed" ? "Reviewed" : "Pending"}
            </Badge>
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground/40" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          {video.videoUrl && (
            <div className="rounded-xl overflow-hidden bg-black">
              <video controls className="w-full max-h-80" src={video.videoUrl} />
            </div>
          )}
          {video.thumbnailUrl && !video.videoUrl && (
            <img src={video.thumbnailUrl} alt="Video thumbnail" className="w-full max-h-64 object-cover rounded-xl" />
          )}
          {video.notes && (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Athlete Notes</p>
              <p className="text-xs text-foreground/80">{video.notes}</p>
            </div>
          )}
          {video.coachResponseVideoUrl && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 mb-2">Coach Response Video</p>
              <video controls className="w-full max-h-64 rounded-lg" src={video.coachResponseVideoUrl} />
            </div>
          )}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Coach Feedback
            </p>
            {video.coachFeedback ? (
              <p className="text-xs text-foreground bg-primary/5 p-2 rounded-lg">{video.coachFeedback}</p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Add feedback..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && feedback.trim() && onReview({ uploadId: video.id, feedback: feedback.trim() })}
                />
                <Button
                  size="sm"
                  disabled={!feedback.trim() || isReviewing}
                  onClick={() => onReview({ uploadId: video.id, feedback: feedback.trim() })}
                  className="rounded-xl"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== BOOKINGS TAB ==========

function BookingsTab({ displayName, userId }: { displayName: string; userId: number }) {
  const { data, isLoading } = useGetBookingsQuery({ q: displayName, limit: 100 });
  const allBookings = data?.bookings ?? [];
  const bookings = allBookings.filter((b: any) => b.userId === userId || b.athleteUserId === userId || b.guardianUserId === userId);

  if (isLoading) return <LoadingSkeleton />;

  const upcoming = bookings.filter((b: any) => b.status === "confirmed" || b.status === "pending");
  const past = bookings.filter((b: any) => b.status === "completed" || b.status === "cancelled" || b.status === "no_show");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Bookings" value={bookings.length} icon={CalendarCheck} />
        <StatCard
          label="Confirmed"
          value={bookings.filter((b: any) => b.status === "confirmed").length}
          icon={CheckCircle2}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          label="Pending"
          value={bookings.filter((b: any) => b.status === "pending").length}
          icon={Clock}
          color="bg-amber-500/10 text-amber-500"
        />
        <StatCard
          label="Completed"
          value={bookings.filter((b: any) => b.status === "completed").length}
          icon={Trophy}
          color="bg-blue-500/10 text-blue-500"
        />
      </div>

      {upcoming.length > 0 && (
        <GlassCard>
          <SectionTitle icon={CalendarCheck} title="Upcoming Bookings" count={upcoming.length} />
          <div className="space-y-3">
            {upcoming.map((booking: any) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <SectionTitle icon={CalendarCheck} title="All Bookings" subtitle="Session history" count={bookings.length} />
        {bookings.length === 0 ? (
          <EmptyState icon={CalendarCheck} text="No bookings found" />
        ) : (
          <div className="space-y-3">
            {bookings.map((booking: any) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function BookingCard({ booking }: { booking: any }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor: Record<string, string> = {
    confirmed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    no_show: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
      <button className="w-full text-left p-4 hover:bg-white/[0.03] transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
              <CalendarCheck className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{booking.serviceTypeName || booking.type || "Session"}</p>
              <p className="text-[10px] text-muted-foreground/60 font-mono">
                {booking.startsAt ? new Date(booking.startsAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={cn("text-[9px] font-bold uppercase tracking-widest border", statusColor[booking.status] || "")}>
              {booking.status?.replace(/_/g, " ") || "Unknown"}
            </Badge>
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground/40" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Start", value: booking.startsAt ? new Date(booking.startsAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—" },
              { label: "End", value: booking.endTime ? new Date(booking.endTime).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—" },
              { label: "Mode", value: booking.mode || "—" },
              { label: "Timezone", value: booking.timezone || "—" },
            ].map((f) => (
              <div key={f.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{f.label}</p>
                <p className="text-xs font-bold mt-1">{f.value}</p>
              </div>
            ))}
          </div>
          {booking.location && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <MapPin className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-xs text-foreground/80">{booking.location}</span>
            </div>
          )}
          {booking.meetingLink && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <LinkIcon className="h-3 w-3 text-muted-foreground/60" />
              <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                {booking.meetingLink} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {booking.notes && (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Notes</p>
              <p className="text-xs text-foreground/80">{booking.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Shared ----

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-[2rem] border border-white/5 bg-white/[0.02] animate-pulse" />
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/20 mb-4" />
      <p className="text-sm font-bold text-muted-foreground/40">{text}</p>
    </div>
  );
}
