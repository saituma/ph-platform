"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";

const RunRouteMap = dynamic(
  () => import("../../../components/admin/RunRouteMap").then((m) => m.RunRouteMap),
  { ssr: false },
);
import { useParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Apple,
  ArrowLeft,
  Award,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Dumbbell,
  FileCheck2,
  HeartPulse,
  Moon,
  Receipt,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Utensils,
  Video,
} from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import { EmptyState } from "../../../components/admin/empty-state";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import {
  type ClientDataPage,
  type ClientDataProgramProgress,
  type ClientDataRecord,
  type ClientDataSectionKey,
  useGetClientDataAthleteDetailQuery,
  useLazyGetClientDataAthleteSectionQuery,
} from "../../../lib/apiSlice";

const SECTIONS: Array<{
  key: ClientDataSectionKey;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "runs", label: "Run History", icon: Activity },
  { key: "nutrition", label: "Nutrition", icon: Apple },
  { key: "foodDiary", label: "Food Diary", icon: Utensils },
  { key: "training", label: "Training Logs", icon: Dumbbell },
  { key: "moduleCompletions", label: "Modules", icon: ClipboardList },
  { key: "videos", label: "Videos", icon: Video },
  { key: "sleep", label: "Sleep", icon: Moon },
  { key: "wellbeing", label: "Wellbeing", icon: HeartPulse },
  { key: "bookings", label: "Bookings", icon: CalendarCheck },
  { key: "attendance", label: "Attendance", icon: CheckCircle2 },
  { key: "achievements", label: "Achievements", icon: Award },
  { key: "plans", label: "Plans", icon: Receipt },
  { key: "physio", label: "Physio", icon: Stethoscope },
  { key: "legal", label: "Legal", icon: FileCheck2 },
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m ${secs}s`;
}

function formatDistance(meters?: number | null) {
  if (!meters) return "-";
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

function camelToLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function tryParseJson(value: string): unknown {
  const t = value.trim();
  if (!t.startsWith("[") && !t.startsWith("{")) return value;
  try { return JSON.parse(t); } catch { return value; }
}

function human(value: unknown): string {
  if (value == null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const parsed = tryParseJson(value);
    if (parsed !== value) return human(parsed);
    return value || "-";
  }
  if (value instanceof Date) return formatDateTime(value.toISOString());
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    return value.map((v) => human(v)).join(", ");
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(([k, v]) => k !== "id" && v != null && v !== "");
    if (entries.length === 0) return "-";
    return entries.map(([k, v]) => `${camelToLabel(k)}: ${human(v)}`).join(" · ");
  }
  return "-";
}

type FoodItem = { name: string; calories?: number; weightGrams?: number; unit?: string };

function isFoodItem(v: unknown): v is FoodItem {
  return typeof v === "object" && v !== null && typeof (v as FoodItem).name === "string";
}

function parseFoodArray(value: unknown): FoodItem[] | null {
  const arr = Array.isArray(value) ? value : (() => {
    if (typeof value !== "string") return null;
    try { const p = JSON.parse(value); return Array.isArray(p) ? p : null; } catch { return null; }
  })();
  if (!arr) return null;
  const foods = arr.filter(isFoodItem);
  return foods.length > 0 ? foods : null;
}

const MEAL_KEYS = new Set(["breakfast", "lunch", "dinner", "snacks", "morningSnack", "afternoonSnack", "eveningSnack", "preWorkout", "postWorkout"]);

function stringValue(record: ClientDataRecord, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function numberValue(record: ClientDataRecord, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : null;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function statusClass(status?: string | null) {
  if (status === "active") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-500";
  if (status === "blocked") return "border-red-500/25 bg-red-500/10 text-red-500";
  return "border-amber-500/25 bg-amber-500/10 text-amber-500";
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-3 text-2xl font-black text-foreground">{value}</p>
    </div>
  );
}

function ProgramProgressCard({ programs }: { programs: ClientDataProgramProgress[] }) {
  if (!programs.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <Dumbbell className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-black uppercase tracking-wide text-foreground">Program Progress</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {programs.map((program) => (
          <div key={program.programId} className="rounded-lg bg-secondary/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-foreground">{program.programName}</p>
              <p className="shrink-0 text-xs font-bold text-muted-foreground">
                {program.completedSessions}/{program.totalSessions} sessions
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, program.percentComplete)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{program.percentComplete}% complete</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldGrid({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-border bg-background p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">{human(value)}</p>
        </div>
      ))}
    </div>
  );
}

function RecordCard({ item, section }: { item: ClientDataRecord; section: ClientDataSectionKey }) {
  const title = (() => {
    if (section === "runs") return `${formatDistance(numberValue(item, "distanceMeters"))} · ${formatDuration(numberValue(item, "durationSeconds"))}`;
    if (section === "nutrition") return `${stringValue(item, "dateKey") ?? "-"} · ${stringValue(item, "mealType") ?? "daily"}`;
    if (section === "foodDiary") return `${stringValue(item, "date") ?? formatDate(stringValue(item, "createdAt"))} · Food diary`;
    if (section === "training") return stringValue(item, "sessionTitle") ?? `Training log #${human(item.id)}`;
    if (section === "moduleCompletions") return stringValue(item, "title") ?? `Module completion #${human(item.id)}`;
    if (section === "videos") return stringValue(item, "notes") ?? `Video upload #${human(item.id)}`;
    if (section === "sleep") return `${stringValue(item, "dateKey") ?? "-"} · ${numberValue(item, "totalMinutes") ?? 0} min`;
    if (section === "wellbeing") return `${stringValue(item, "dateKey") ?? "-"} · Mood ${numberValue(item, "mood") ?? "-"}/5`;
    if (section === "bookings") return `${stringValue(item, "type") ?? "Booking"} · ${stringValue(item, "status") ?? "-"}`;
    if (section === "attendance") return stringValue(item, "sessionTitle") ?? `Session #${human(item.sessionId ?? item.id)}`;
    if (section === "achievements") return stringValue(item, "achievementKey") ?? `Achievement #${human(item.id)}`;
    if (section === "plans") return `${stringValue(item, "status") ?? "Plan"} · ${stringValue(item, "paymentStatus") ?? "-"}`;
    if (section === "physio") return stringValue(item, "referalLink") ?? `Physio referral #${human(item.id)}`;
    if (section === "legal") return `Legal acceptance #${item.id}`;
    return `Record #${item.id}`;
  })();

  const date =
    stringValue(item, "date") ??
    stringValue(item, "dateKey") ??
    stringValue(item, "createdAt") ??
    stringValue(item, "completedAt") ??
    stringValue(item, "updatedAt") ??
    stringValue(item, "unlockedAt") ??
    stringValue(item, "startsAt") ??
    stringValue(item, "loggedAt");
  const status = stringValue(item, "status");

  const hasRoute = section === "runs" && Array.isArray(item.coordinates) && (item.coordinates as unknown[]).length >= 2;

  const mealEntries = section === "nutrition"
    ? Object.entries(item)
        .filter(([key]) => MEAL_KEYS.has(key))
        .map(([key, value]) => ({ key, foods: parseFoodArray(value) }))
        .filter((e): e is { key: string; foods: FoodItem[] } => e.foods !== null)
    : [];

  const SKIP_KEYS = new Set(["id", "athleteId", "userId", "coordinates", ...mealEntries.map((e) => e.key)]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(date)}</p>
        </div>
        {status ? <Badge variant="outline" className="w-fit rounded-md capitalize">{status}</Badge> : null}
      </div>
      {hasRoute && (
        <div className="mt-3">
          <RunRouteMap coordinates={item.coordinates} />
        </div>
      )}
      {mealEntries.length > 0 && (
        <div className="mt-4 space-y-3">
          {mealEntries.map(({ key, foods }) => {
            const total = foods.reduce((s, f) => s + (f.calories ?? 0), 0);
            return (
              <div key={key}>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{camelToLabel(key)}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground">{total} kcal total</p>
                </div>
                <div className="space-y-1">
                  {foods.map((food, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2 text-xs">
                      <span className="font-medium text-foreground">{food.name}</span>
                      <span className="text-muted-foreground">
                        {food.calories != null ? `${food.calories} kcal` : ""}
                        {food.weightGrams != null ? ` · ${food.weightGrams}${food.unit ?? "g"}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(item)
          .filter(([key, value]) => !SKIP_KEYS.has(key) && value != null && value !== "")
          .slice(0, 12)
          .map(([key, value]) => (
            <div key={key} className="min-w-0 rounded-md bg-secondary/30 px-2 py-1.5">
              <span className="font-semibold text-foreground">{camelToLabel(key)}: </span>
              <span className="break-words">{human(value)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

export default function ClientDataDetailPage() {
  const params = useParams();
  const athleteId = Number(params?.athleteId);
  const isValid = Number.isFinite(athleteId) && athleteId > 0;
  const [active, setActive] = useState<ClientDataSectionKey>("runs");
  const [extraPagesState, setExtraPagesState] = useState<{
    athleteId: number;
    items: Partial<Record<ClientDataSectionKey, ClientDataRecord[]>>;
  }>({ athleteId: 0, items: {} });
  const [pageInfoState, setPageInfoState] = useState<{
    athleteId: number;
    items: Partial<Record<ClientDataSectionKey, ClientDataPage["pageInfo"]>>;
  }>({ athleteId: 0, items: {} });
  const [loadSection, { isFetching: isLoadingMore }] = useLazyGetClientDataAthleteSectionQuery();

  const { data, isLoading, error } = useGetClientDataAthleteDetailQuery(
    { athleteId, limit: 10 },
    { skip: !isValid },
  );

  const activePage = data?.sections?.[active];
  const extraPages = useMemo(
    () => (extraPagesState.athleteId === athleteId ? extraPagesState.items : {}),
    [athleteId, extraPagesState],
  );
  const pageInfo = pageInfoState.athleteId === athleteId ? pageInfoState.items : {};
  const combinedItems = useMemo(
    () => [...(activePage?.items ?? []), ...(extraPages[active] ?? [])],
    [active, activePage?.items, extraPages],
  );
  const currentPageInfo = pageInfo[active] ?? activePage?.pageInfo;
  const athlete = data?.athlete;
  const counts = data?.profile.counts ?? {};

  const loadMore = async () => {
    if (!currentPageInfo?.nextCursor || !athlete) return;
    const result = await loadSection({
      athleteId: athlete.athleteId,
      section: active,
      cursor: currentPageInfo.nextCursor,
      limit: 30,
    }).unwrap();
    setExtraPagesState((prev) => ({
      athleteId,
      items: {
        ...(prev.athleteId === athleteId ? prev.items : {}),
        [active]: [...(prev.athleteId === athleteId ? (prev.items[active] ?? []) : []), ...(result.items ?? [])],
      },
    }));
    setPageInfoState((prev) => ({
      athleteId,
      items: {
        ...(prev.athleteId === athleteId ? prev.items : {}),
        [active]: result.pageInfo,
      },
    }));
  };

  if (isLoading) {
    return (
      <AdminShell title="Client Data" subtitle="Loading athlete record...">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      </AdminShell>
    );
  }

  if (error || !athlete) {
    return (
      <AdminShell title="Client Data" subtitle="Athlete record unavailable.">
        <EmptyState
          title="Athlete data not found"
          description="This athlete may not exist, may be archived, or you may not have access to their data."
          icon={ShieldAlert}
          actionLabel="Back to Client Data"
          actionHref="/client-data"
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={athlete.name}
      subtitle={
        <span className="flex items-center gap-2 text-xs">
          <Link href="/client-data" className="text-muted-foreground hover:text-foreground">Client Data</Link>
          <span className="text-muted-foreground">/</span>
          <span>#{athlete.athleteId}</span>
        </span>
      }
      actions={
        <Button variant="outline" size="sm" render={<Link href="/client-data" />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      }
    >
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {athlete.profilePicture ? (
                <img src={athlete.profilePicture} alt={athlete.name} className="h-20 w-20 rounded-lg object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-secondary text-xl font-black text-muted-foreground">
                  {initials(athlete.name) || "AT"}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-black text-foreground">{athlete.name}</h1>
                  <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize", statusClass(athlete.status))}>
                    {athlete.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{athlete.email ?? "No email"} · {athlete.team ?? "No team"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {athlete.athleteType === "adult" ? "Adult athlete" : "Youth athlete"} · Age {athlete.age ?? "-"} · {athlete.currentProgramTier ?? "No tier"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4 lg:w-[420px]">
              <div className="rounded-lg bg-secondary/40 p-3">
                <p className="text-muted-foreground">User ID</p>
                <p className="mt-1 font-bold text-foreground">{athlete.athleteUserId}</p>
              </div>
              <div className="rounded-lg bg-secondary/40 p-3">
                <p className="text-muted-foreground">Guardian</p>
                <p className="mt-1 truncate font-bold text-foreground">{athlete.guardianEmail ?? "-"}</p>
              </div>
              <div className="rounded-lg bg-secondary/40 p-3">
                <p className="text-muted-foreground">Plan expiry</p>
                <p className="mt-1 font-bold text-foreground">{formatDate(athlete.planExpiresAt)}</p>
              </div>
              <div className="rounded-lg bg-secondary/40 p-3">
                <p className="text-muted-foreground">Joined</p>
                <p className="mt-1 font-bold text-foreground">{formatDate(athlete.accountCreatedAt)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Runs" value={counts.runs ?? 0} icon={Activity} />
          <MetricCard label="Nutrition Logs" value={counts.nutrition ?? 0} icon={Apple} />
          <MetricCard label="Training Logs" value={(counts.training ?? 0) + (counts.moduleCompletions ?? 0)} icon={Dumbbell} />
          <MetricCard label="Videos" value={counts.videos ?? 0} icon={Video} />
          <MetricCard label="Bookings" value={counts.bookings ?? 0} icon={CalendarCheck} />
        </section>

        <ProgramProgressCard programs={data.profile.programProgress ?? []} />

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-wide text-foreground">Profile Data</h2>
          </div>
          <FieldGrid
            rows={[
              ["Athlete type", athlete.athleteType],
              ["Birth date", athlete.birthDate],
              ["Phone", athlete.phoneNumber],
              ["Training per week", athlete.trainingPerWeek],
              ["Preferred days", athlete.preferredTrainingDays],
              ["Injuries", athlete.injuries],
              ["Growth notes", athlete.growthNotes],
              ["Performance goals", athlete.performanceGoals],
              ["Equipment access", athlete.equipmentAccess],
              ["Nutrition target calories", data.profile.nutritionTargets?.calories],
              ["Nutrition primary goal", data.profile.nutritionOnboarding?.primaryGoal],
              ["Current streak", data.profile.streak?.currentStreak],
            ]}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
          <div className="rounded-lg border border-border bg-card p-2 xl:sticky xl:top-6 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
            <div className="grid gap-1">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = active === section.key;
                const total = data.sections[section.key]?.pageInfo.totalCount ?? 0;
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActive(section.key)}
                    className={cn(
                      "flex h-10 items-center justify-between rounded-md px-3 text-left text-sm transition",
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{section.label}</span>
                    </span>
                    <span className={cn("text-xs", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>{total}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-border bg-background p-4 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-foreground">{SECTIONS.find((section) => section.key === active)?.label}</h2>
                <p className="text-sm text-muted-foreground">
                  Showing {combinedItems.length} of {currentPageInfo?.totalCount ?? 0} records.
                </p>
              </div>
              <Badge variant="outline" className="w-fit rounded-md">
                Read-only full history
              </Badge>
            </div>

            {combinedItems.length === 0 ? (
              <EmptyState
                title="No records in this section"
                description="When this athlete logs data, it will appear here."
                icon={SECTIONS.find((section) => section.key === active)?.icon ?? ClipboardList}
              />
            ) : (
              <div className="space-y-3">
                {combinedItems.map((item, index: number) => (
                  <RecordCard key={`${active}-${item.id ?? index}`} item={item} section={active} />
                ))}
              </div>
            )}

            {currentPageInfo?.hasMore ? (
              <div className="mt-5 flex justify-center">
                <Button variant="outline" onClick={loadMore} disabled={isLoadingMore} className="gap-2">
                  <ChevronDown className="h-4 w-4" />
                  {isLoadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
