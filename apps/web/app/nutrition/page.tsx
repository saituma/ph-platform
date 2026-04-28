"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, Loader2, MessageSquareText } from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Textarea } from "../../components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  useGetNutritionLogsQuery,
  useGetNutritionTargetsQuery,
  useGetUsersQuery,
  useReviewNutritionLogMutation,
  useUpdateNutritionTargetsMutation,
} from "../../lib/apiSlice";

type UserRow = {
  id: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  athleteType?: "youth" | "adult" | null;
};

type NutritionLog = {
  id: number;
  userId?: number | null;
  dateKey: string;
  athleteType?: string | null;
  breakfast?: string | null;
  lunch?: string | null;
  dinner?: string | null;
  snacks?: string | null;
  snacksMorning?: string | null;
  snacksAfternoon?: string | null;
  snacksEvening?: string | null;
  waterIntake?: number | null;
  mood?: number | null;
  energy?: number | null;
  pain?: number | null;
  foodDiary?: string | null;
  coachFeedback?: string | null;
  coachFeedbackMediaUrl?: string | null;
};

function toDateKey(d: Date) {
  // Use UTC date keys to match mobile + backend storage.
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, deltaDays: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + deltaDays);
  return x;
}

function isYouthUser(user: UserRow): boolean {
  if (!user) return false;
  if (user.role === "guardian") return true;
  if (user.athleteType === "youth") return true;
  if (user.athleteType === "adult") return false;
  // Fallback for older API responses that may not include athleteType.
  const email = String(user.email ?? "");
  if (user.role === "athlete" && email.endsWith("@athlete.local")) return true;
  return false;
}

function parseSlot(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return { checked: false, details: "" };
  if (raw.toLowerCase() === "yes") return { checked: true, details: "" };
  return { checked: true, details: raw };
}

function logSummaryLines(log: NutritionLog): string[] {
  if (!log) return [];
  if (log.athleteType !== "youth") {
    const diary = typeof log.foodDiary === "string" ? log.foodDiary.trim() : "";
    return diary ? [`Food diary: ${diary}`] : [];
  }

  const out: string[] = [];
  const b = parseSlot(log.breakfast);
  const l = parseSlot(log.lunch);
  const d = parseSlot(log.dinner);
  const sm = parseSlot(log.snacksMorning);
  const sa = parseSlot(log.snacksAfternoon);
  const se = parseSlot(log.snacksEvening);
  const legacySnacks = typeof log.snacks === "string" ? log.snacks.trim() : "";

  if (b.checked) out.push(`Breakfast: ${b.details || "Logged"}`);
  if (l.checked) out.push(`Lunch: ${l.details || "Logged"}`);
  if (d.checked) out.push(`Dinner: ${d.details || "Logged"}`);

  const anyNewSnack = sm.checked || sa.checked || se.checked;
  if (!anyNewSnack && legacySnacks) {
    const legacy = parseSlot(legacySnacks);
    if (legacy.checked) out.push(`Snack: ${legacy.details || "Logged"}`);
  } else {
    if (sm.checked) out.push(`Morning snack: ${sm.details || "Logged"}`);
    if (sa.checked) out.push(`Afternoon snack: ${sa.details || "Logged"}`);
    if (se.checked) out.push(`Evening snack: ${se.details || "Logged"}`);
  }

  const w = typeof log.waterIntake === "number" ? log.waterIntake : 0;
  if (w > 0) out.push(`Water: ${w}`);
  if (typeof log.mood === "number") out.push(`Mood: ${log.mood}/5`);
  if (typeof log.energy === "number") out.push(`Energy: ${log.energy}/5`);
  if (typeof log.pain === "number") out.push(`Pain: ${log.pain}/5`);
  return out;
}

function NutritionDetails({
  userId,
  isAdultAthlete,
}: {
  userId: number;
  isAdultAthlete: boolean;
}) {
  const router = useRouter();
  const [reviewLog] = useReviewNutritionLogMutation();
  const [updateTargets, updateTargetsState] =
    useUpdateNutritionTargetsMutation();

  const [activeTab, setActiveTab] = useState<"logs" | "coach">("logs");
  const [preset, setPreset] = useState<"1d" | "7d" | "30d" | "custom">("30d");

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [fromKey, setFromKey] = useState<string>(() =>
    toDateKey(addDays(new Date(), -29)),
  );
  const [toKey, setToKey] = useState<string>(() => todayKey);

  const effectiveFrom =
    preset === "custom"
      ? fromKey
      : preset === "1d"
        ? todayKey
        : preset === "7d"
          ? toDateKey(addDays(new Date(), -6))
          : toDateKey(addDays(new Date(), -29));
  const effectiveTo = preset === "custom" ? toKey : todayKey;

  const { data: logsData, isLoading } = useGetNutritionLogsQuery(
    {
      userId,
      limit: 90,
      from: effectiveFrom,
      to: effectiveTo,
    },
    {
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const {
    data: targetsData,
    isLoading: targetsLoading,
    error: targetsError,
  } = useGetNutritionTargetsQuery(userId, { skip: !isAdultAthlete });

  const [targetsDraft, setTargetsDraft] = useState<{
    calories: string;
    protein: string;
    carbs: string;
    fats: string;
    micronutrientsGuidance: string;
  }>(() => ({
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    micronutrientsGuidance: "",
  }));

  const [targetsHydratedFor, setTargetsHydratedFor] = useState<number | null>(
    null,
  );

  const [targetsStatus, setTargetsStatus] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setTargetsHydratedFor(null);
    setTargetsStatus(null);
    setTargetsDraft({
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
      micronutrientsGuidance: "",
    });
  }, [userId]);

  useEffect(() => {
    if (!isAdultAthlete) return;
    if (targetsLoading) return;
    if (targetsHydratedFor === userId) return;

    const t = (targetsData?.targets ?? {}) as any;
    setTargetsDraft({
      calories: t?.calories != null ? String(t.calories) : "",
      protein: t?.protein != null ? String(t.protein) : "",
      carbs: t?.carbs != null ? String(t.carbs) : "",
      fats: t?.fats != null ? String(t.fats) : "",
      micronutrientsGuidance:
        typeof t?.micronutrientsGuidance === "string"
          ? t.micronutrientsGuidance
          : "",
    });
    setTargetsHydratedFor(userId);
  }, [
    isAdultAthlete,
    targetsData?.targets,
    targetsHydratedFor,
    targetsLoading,
    userId,
  ]);

  const parseOptionalNumber = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed)
      return { ok: true as const, value: undefined as number | undefined };
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return { ok: false as const, value: undefined };
    return { ok: true as const, value: n };
  };

  const saveTargets = async () => {
    setTargetsStatus(null);

    const calories = parseOptionalNumber(targetsDraft.calories);
    const protein = parseOptionalNumber(targetsDraft.protein);
    const carbs = parseOptionalNumber(targetsDraft.carbs);
    const fats = parseOptionalNumber(targetsDraft.fats);

    if (!calories.ok || !protein.ok || !carbs.ok || !fats.ok) {
      setTargetsStatus({
        tone: "error",
        message: "Targets must be numbers (or blank).",
      });
      return;
    }

    const micronutrientsGuidance = targetsDraft.micronutrientsGuidance.trim();

    try {
      await updateTargets({
        userId,
        calories: calories.value,
        protein: protein.value,
        carbs: carbs.value,
        fats: fats.value,
        micronutrientsGuidance: micronutrientsGuidance || undefined,
      }).unwrap();

      setTargetsStatus({ tone: "success", message: "Targets saved." });
    } catch (e) {
      setTargetsStatus({ tone: "error", message: "Failed to save targets." });
    }
  };

  const [feedbackInputs, setFeedbackInputs] = useState<Record<number, string>>(
    {},
  );

  const logs = ((logsData?.logs ?? []) as NutritionLog[]).slice();
  // Coach Response should include all logs, even if coach hasn't replied yet.
  const coachLogs = logs;

  const handleSubmitFeedback = async (logId: number) => {
    const feedback = feedbackInputs[logId]?.trim();
    if (!feedback) return;
    await reviewLog({ logId, feedback });
    setFeedbackInputs((prev) => ({ ...prev, [logId]: "" }));
  };

  const openDetail = (log: NutritionLog) => {
    const dk = typeof log.dateKey === "string" ? log.dateKey : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dk)) return;
    router.push(
      `/nutrition/log/${encodeURIComponent(dk)}?userId=${encodeURIComponent(String(userId))}`,
    );
  };

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isAdultAthlete ? (
        <Card>
          <CardHeader>
            <SectionHeader
              title="Nutrition Targets"
              description="Set suggested calories, macros, and micronutrient guidance for this adult athlete."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {targetsLoading ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="animate-spin text-muted-foreground" />
              </div>
            ) : targetsError ? (
              <div className="text-sm text-destructive">
                Error loading targets.
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Calories
                    </div>
                    <Input
                      inputMode="numeric"
                      placeholder="e.g. 2600"
                      value={targetsDraft.calories}
                      onChange={(e) =>
                        setTargetsDraft((prev) => ({
                          ...prev,
                          calories: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Protein (g)
                    </div>
                    <Input
                      inputMode="numeric"
                      placeholder="e.g. 180"
                      value={targetsDraft.protein}
                      onChange={(e) =>
                        setTargetsDraft((prev) => ({
                          ...prev,
                          protein: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Carbs (g)
                    </div>
                    <Input
                      inputMode="numeric"
                      placeholder="e.g. 280"
                      value={targetsDraft.carbs}
                      onChange={(e) =>
                        setTargetsDraft((prev) => ({
                          ...prev,
                          carbs: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Fats (g)
                    </div>
                    <Input
                      inputMode="numeric"
                      placeholder="e.g. 80"
                      value={targetsDraft.fats}
                      onChange={(e) =>
                        setTargetsDraft((prev) => ({
                          ...prev,
                          fats: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Micronutrient Guidance
                  </div>
                  <Textarea
                    placeholder="e.g. Prioritize iron + vitamin C, omega-3s, magnesium..."
                    value={targetsDraft.micronutrientsGuidance}
                    onChange={(e) =>
                      setTargetsDraft((prev) => ({
                        ...prev,
                        micronutrientsGuidance: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={saveTargets}
                    disabled={updateTargetsState.isLoading}
                  >
                    {updateTargetsState.isLoading
                      ? "Saving..."
                      : "Save Targets"}
                  </Button>
                  {targetsStatus ? (
                    <div
                      className={
                        targetsStatus.tone === "success"
                          ? "text-sm text-emerald-600"
                          : "text-sm text-destructive"
                      }
                    >
                      {targetsStatus.message}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="logs">Log</TabsTrigger>
            <TabsTrigger value="coach">Coach Response</TabsTrigger>
          </TabsList>

          {activeTab === "coach" ? (
            <Popover>
              <PopoverTrigger render={<Button variant="outline" className="gap-2" />}>
                <Filter className="h-4 w-4" />
                Filter
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[320px] p-4">
                <div className="space-y-4">
                  <div className="text-sm font-semibold text-foreground">
                    Date range
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "1d" as const, label: "1 day" },
                      { key: "7d" as const, label: "7 days" },
                      { key: "30d" as const, label: "30 days" },
                    ].map((p) => (
                      <Button
                        key={p.key}
                        variant={preset === p.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreset(p.key)}
                      >
                        {p.label}
                      </Button>
                    ))}
                    <Button
                      variant={preset === "custom" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreset("custom")}
                    >
                      Custom
                    </Button>
                  </div>

                  {preset === "custom" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          From
                        </div>
                        <Input
                          type="date"
                          value={fromKey}
                          onChange={(e) => setFromKey(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          To
                        </div>
                        <Input
                          type="date"
                          value={toKey}
                          onChange={(e) => setToKey(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>

        <TabsContent value="logs">
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No logs found for this athlete in the selected date range.
            </p>
          ) : (
            <div className="grid gap-4">
              {logs.map((log) => {
                const lines = logSummaryLines(log);
                const coachText =
                  typeof log.coachFeedback === "string"
                    ? log.coachFeedback.trim()
                    : "";
                return (
                  <Card key={log.id} className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                      <button
                        className="text-left"
                        onClick={() => openDetail(log)}
                        title="Open details"
                      >
                        <div className="text-lg font-semibold text-foreground">
                          {log.dateKey}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Click to view details
                        </div>
                      </button>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent bg-accent/10 px-3 py-1.5 rounded-full">
                        {String(log.athleteType ?? "athlete")} athlete
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Athlete log
                        </div>
                        {lines.length ? (
                          <ul className="list-disc pl-5 text-sm text-foreground">
                            {lines.slice(0, 8).map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No details logged.
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-input bg-secondary/10 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            <MessageSquareText className="h-4 w-4" />
                            Coach response
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetail(log)}
                          >
                            View
                          </Button>
                        </div>

                        {coachText ? (
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {coachText}
                          </p>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Leave quick feedback on this log..."
                              value={feedbackInputs[log.id] || ""}
                              onChange={(e) =>
                                setFeedbackInputs((prev) => ({
                                  ...prev,
                                  [log.id]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              onClick={() => handleSubmitFeedback(log.id)}
                            >
                              Post
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="coach">
          {coachLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No logs found for this athlete in the selected date range.
            </p>
          ) : (
            <div className="grid gap-4">
              {coachLogs.map((log) => {
                const coachText =
                  typeof log.coachFeedback === "string"
                    ? log.coachFeedback.trim()
                    : "";
                const coachMedia =
                  typeof log.coachFeedbackMediaUrl === "string"
                    ? log.coachFeedbackMediaUrl.trim()
                    : "";
                return (
                  <Card key={log.id}>
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-foreground">
                          {log.dateKey}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Coach response
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => openDetail(log)}>
                        View details
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {coachText ? (
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {coachText}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            No coach response yet.
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Leave quick feedback on this log..."
                              value={feedbackInputs[log.id] || ""}
                              onChange={(e) =>
                                setFeedbackInputs((prev) => ({
                                  ...prev,
                                  [log.id]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              onClick={() => handleSubmitFeedback(log.id)}
                            >
                              Post
                            </Button>
                          </div>
                        </div>
                      )}

                      {!coachText && coachMedia ? (
                        <p className="text-sm text-muted-foreground">
                          Coach responded with media only.
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function NutritionAdminPage() {
  const { data, isLoading, error } = useGetUsersQuery();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [athleteQuery, setAthleteQuery] = useState("");
  const [showAdult, setShowAdult] = useState(true);
  const [showYouth, setShowYouth] = useState(true);

  const users = ((data as { users?: UserRow[] } | undefined)?.users ??
    []) as UserRow[];
  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );
  const selectedIsAdult = selectedUser ? !isYouthUser(selectedUser) : false;

  const filteredAthletes = useMemo(() => {
    const q = athleteQuery.trim().toLowerCase();
    // Only show actual athletes here (guardians don't own nutrition logs).
    const pool = users.filter((u) => u.role === "athlete");

    const filteredByType =
      showAdult && showYouth
        ? pool
        : !showAdult && !showYouth
          ? pool
          : pool.filter((u) => {
              const youth = isYouthUser(u);
              if (showAdult && !showYouth) return !youth;
              if (!showAdult && showYouth) return youth;
              return true;
            });

    if (!q) return filteredByType;

    return filteredByType.filter((u) => {
      const name = String(u.name ?? "").toLowerCase();
      const email = String(u.email ?? "").toLowerCase();
      const id = String(u.id ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || id.includes(q);
    });
  }, [athleteQuery, showAdult, showYouth, users]);

  return (
    <AdminShell
      title="Nutrition"
      subtitle="Review athlete logs and coach responses."
    >
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <SectionHeader
              title="Athletes"
              description="Select an athlete to view their nutrition logs."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search athletes by name, email, or id..."
              value={athleteQuery}
              onChange={(e) => setAthleteQuery(e.target.value)}
            />

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={showAdult ? "default" : "outline"}
                onClick={() => setShowAdult((v) => !v)}
              >
                Adult
              </Button>
              <Button
                type="button"
                size="sm"
                variant={showYouth ? "default" : "outline"}
                onClick={() => setShowYouth((v) => !v)}
              >
                Youth
              </Button>
            </div>

            {isLoading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-sm text-destructive">
                Error loading users.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
                {filteredAthletes.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={[
                      "text-left rounded-2xl border px-4 py-3 transition",
                      selectedUserId === user.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-card/80 border-border",
                    ].join(" ")}
                  >
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-xs opacity-80">
                      {user.email || user.role}
                    </div>
                  </button>
                ))}
                {filteredAthletes.length === 0 ? (
                  <div className="py-10 text-sm text-muted-foreground">
                    No athletes match your search.
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Logs"
              description={
                selectedUserId
                  ? "Click a log to open the detail view."
                  : "Pick an athlete to view logs."
              }
            />
          </CardHeader>
          <CardContent>
            {selectedUserId ? (
              <NutritionDetails
                userId={selectedUserId}
                isAdultAthlete={selectedIsAdult}
                key={`profile-${selectedUserId}`}
              />
            ) : (
              <div className="py-20 text-sm text-muted-foreground">
                Select an athlete on the left.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
