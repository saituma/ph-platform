"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2, MessageSquareText, Video } from "lucide-react";

import { AdminShell } from "../../../../components/admin/shell";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import {
  useGetNutritionLogsQuery,
  useReviewNutritionLogMutation,
} from "../../../../lib/apiSlice";

type NutritionLog = {
  id: number;
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

function parseSlot(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return { checked: false, details: "" };
  if (raw.toLowerCase() === "yes") return { checked: true, details: "" };
  return { checked: true, details: raw };
}

function logLines(log: NutritionLog | null): string[] {
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

export default function NutritionLogDetailPage() {
  const router = useRouter();
  const params = useParams<{ dateKey: string }>();
  const searchParams = useSearchParams();

  const dateKey = String(params?.dateKey ?? "").trim();
  const userIdRaw = searchParams.get("userId");
  const userId = userIdRaw ? Number(userIdRaw) : NaN;

  const enabled = /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && Number.isFinite(userId);

  const { data, isLoading } = useGetNutritionLogsQuery(
    enabled
      ? { userId, from: dateKey, to: dateKey, limit: 5 }
      : // Still call the hook, but with a harmless param set.
        { userId: Number.isFinite(userId) ? userId : 0, limit: 1 },
    { skip: !enabled },
  );

  const log = useMemo(() => {
    const logs = data?.logs ?? [];
    return ((logs as NutritionLog[]).find((l) => l?.dateKey === dateKey) ??
      null) as NutritionLog | null;
  }, [data?.logs, dateKey]);

  const [reviewLog] = useReviewNutritionLogMutation();
  const [feedback, setFeedback] = useState("");

  const coachText =
    typeof log?.coachFeedback === "string" ? log.coachFeedback.trim() : "";
  const coachMedia =
    typeof log?.coachFeedbackMediaUrl === "string"
      ? log.coachFeedbackMediaUrl.trim()
      : "";

  const lines = logLines(log);

  return (
    <AdminShell
      title="Nutrition Log"
      subtitle={dateKey}
      actions={
        <Button variant="outline" className="gap-2" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      }
    >
      {!enabled ? (
        <Card>
          <CardContent className="py-12 text-sm text-muted-foreground">
            Invalid link (missing athlete `userId` or invalid date).
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : !log ? (
        <Card>
          <CardContent className="py-12 text-sm text-muted-foreground">
            Log not found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="text-sm font-semibold text-foreground">
                Athlete log
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {lines.length ? (
                <ul className="list-disc pl-5 text-sm text-foreground">
                  {lines.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No details logged.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageSquareText className="h-4 w-4" />
                  Coach response
                </div>
                {coachMedia ? (
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <Video className="h-4 w-4" />
                    Media
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {coachText ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {coachText}
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Add response
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="Write feedback for the athlete..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                    <Button
                      onClick={async () => {
                        const v = feedback.trim();
                        if (!v) return;
                        await reviewLog({ logId: log.id, feedback: v });
                        setFeedback("");
                      }}
                    >
                      Post
                    </Button>
                  </div>
                </div>
              )}

              {coachMedia ? (
                <div className="overflow-hidden rounded-2xl border border-input bg-black">
                  <video
                    controls
                    playsInline
                    className="h-auto w-full"
                    src={coachMedia}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
