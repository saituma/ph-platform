"use client";

import { useMemo, useState } from "react";
import { Moon, Star, Clock, MessageSquare, Send } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  useGetSleepLogsQuery,
  useReviewSleepLogMutation,
  type SleepLogRecord,
} from "../../lib/api/sleep";
import { SectionHeader } from "./section-header";

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function qualityBadge(q: number | null) {
  if (!q) return { label: "—", variant: "secondary" as const };
  const map: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    1: { label: "Poor", variant: "destructive" },
    2: { label: "Fair", variant: "secondary" },
    3: { label: "Good", variant: "outline" },
    4: { label: "Great", variant: "default" },
    5: { label: "Excellent", variant: "default" },
  };
  return map[q] ?? { label: "—", variant: "secondary" as const };
}

function daysAgoKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SleepLogsSection({ userId }: { userId: number }) {
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const from = daysAgoKey(Number(range));

  const { data, isLoading } = useGetSleepLogsQuery(
    { userId, from, limit: 90 },
    { skip: !userId },
  );

  const logs = data?.logs ?? [];

  const avgMinutes = useMemo(() => {
    if (logs.length === 0) return 0;
    return Math.round(logs.reduce((s, l) => s + l.totalMinutes, 0) / logs.length);
  }, [logs]);

  const avgQuality = useMemo(() => {
    const rated = logs.filter((l) => l.quality);
    if (rated.length === 0) return null;
    return (rated.reduce((s, l) => s + (l.quality ?? 0), 0) / rated.length).toFixed(1);
  }, [logs]);

  if (isLoading) {
    return (
      <div>
        <SectionHeader title="Sleep Tracking" description="Loading sleep data..." />
        <div className="h-32 animate-pulse rounded-xl bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Sleep Tracking"
        description={`${logs.length} logs in the last ${range} days`}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Sleep</p>
            <p className="text-xl font-bold text-foreground">{formatHours(avgMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Quality</p>
            <p className="text-xl font-bold text-foreground">{avgQuality ?? "—"}/5</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Logs</p>
            <p className="text-xl font-bold text-foreground">{logs.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Range filter */}
      <div className="flex gap-2">
        {(["7", "30", "90"] as const).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? "default" : "outline"}
            onClick={() => setRange(r)}
          >
            {r}d
          </Button>
        ))}
      </div>

      {/* Sleep trend bar chart */}
      {logs.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Sleep Duration Trend</p>
            <div className="space-y-2">
              {logs.slice(0, 14).map((log) => (
                <div key={log.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-14 shrink-0">
                    {log.dateKey.slice(5)}
                  </span>
                  <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (log.totalMinutes / 600) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground w-12 text-right">
                    {formatHours(log.totalMinutes)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log list */}
      {logs.length > 0 ? (
        <div className="space-y-2">
          {logs.slice(0, 20).map((log) => (
            <SleepLogRow key={log.id} log={log} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Moon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No sleep logs recorded yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SleepLogRow({ log }: { log: SleepLogRecord }) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(log.coachFeedback ?? "");
  const [reviewLog, { isLoading: isSending }] = useReviewSleepLogMutation();
  const qb = qualityBadge(log.quality);

  const handleSendFeedback = async () => {
    if (!feedback.trim()) return;
    await reviewLog({ logId: log.id, feedback: feedback.trim() });
  };

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left p-4 hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Moon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {new Date(log.dateKey + "T00:00:00").toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {log.bedTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {log.bedTime} — {log.wakeTime}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {formatHours(log.totalMinutes)}
            </span>
            <Badge variant={qb.variant}>{qb.label}</Badge>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          {/* Stage breakdown */}
          {(log.deepMinutes || log.remMinutes || log.lightMinutes) && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Core</p>
                <p className="text-sm font-semibold">{formatHours(log.deepMinutes ?? 0)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">REM</p>
                <p className="text-sm font-semibold">{formatHours(log.remMinutes ?? 0)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Light</p>
                <p className="text-sm font-semibold">{formatHours(log.lightMinutes ?? 0)}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {log.notes && (
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Notes</p>
              <p className="text-xs text-foreground">{log.notes}</p>
            </div>
          )}

          {/* Coach feedback */}
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Coach Feedback
            </p>
            {log.coachFeedback ? (
              <p className="text-xs text-foreground bg-primary/5 p-2 rounded-lg">{log.coachFeedback}</p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Add feedback..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendFeedback()}
                />
                <Button
                  size="sm"
                  disabled={!feedback.trim() || isSending}
                  onClick={handleSendFeedback}
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
