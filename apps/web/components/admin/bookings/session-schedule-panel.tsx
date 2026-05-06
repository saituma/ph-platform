"use client";

import { useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  useCreateAdminSessionTemplateMutation,
  useGetAdminScheduledSessionsQuery,
  useGetAdminSessionTemplatesQuery,
  useMarkAdminSessionAttendanceMutation,
  useMaterializeAdminSessionTemplateMutation,
} from "@/lib/apiSlice";

function typeLabel(type: string) {
  if (type === "one_to_one") return "1-1";
  if (type === "semi_private") return "Semi-Private";
  if (type === "in_person") return "In-Person";
  if (type === "team") return "Team";
  return "Session";
}

export function SessionSchedulePanel() {
  const now = new Date();
  const fromIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const toIso = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999).toISOString();

  const { data: templatesData, refetch: refetchTemplates } = useGetAdminSessionTemplatesQuery();
  const { data: sessionsData, refetch: refetchSessions } = useGetAdminScheduledSessionsQuery({ from: fromIso, to: toIso });

  const [createTemplate, { isLoading: creating }] = useCreateAdminSessionTemplateMutation();
  const [materializeTemplate, { isLoading: materializing }] = useMaterializeAdminSessionTemplateMutation();
  const [markAttendance, { isLoading: marking }] = useMarkAdminSessionAttendanceMutation();

  const templates = useMemo(() => (Array.isArray(templatesData?.templates) ? templatesData.templates : []), [templatesData]);
  const sessions = useMemo(() => (Array.isArray(sessionsData?.sessions) ? sessionsData.sessions : []), [sessionsData]);

  const [name, setName] = useState("");
  const [type, setType] = useState<"one_to_one" | "semi_private" | "in_person" | "team">("one_to_one");
  const [scope, setScope] = useState<"individual" | "group" | "team">("individual");
  const [weekday, setWeekday] = useState("4");
  const [startsAtTime, setStartsAtTime] = useState("17:00");
  const [endsAtTime, setEndsAtTime] = useState("18:00");
  const [targetUserIds, setTargetUserIds] = useState("");
  const [teamId, setTeamId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold">Fixed Session Templates</h3>
          <p className="text-sm text-muted-foreground">Create recurring sessions by type and audience assignment.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Semi-Private Thursday" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <select className="rounded-md border bg-background px-2 py-2" value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="one_to_one">1-1</option>
              <option value="semi_private">Semi-Private</option>
              <option value="in_person">In-Person</option>
              <option value="team">Team</option>
            </select>
            <select className="rounded-md border bg-background px-2 py-2" value={scope} onChange={(e) => setScope(e.target.value as any)}>
              <option value="individual">Individual</option>
              <option value="group">Group</option>
              <option value="team">Team</option>
            </select>
            <select className="rounded-md border bg-background px-2 py-2" value={weekday} onChange={(e) => setWeekday(e.target.value)}>
              <option value="0">Sun</option><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option>
              <option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input value={startsAtTime} onChange={(e) => setStartsAtTime(e.target.value)} placeholder="17:00" />
            <Input value={endsAtTime} onChange={(e) => setEndsAtTime(e.target.value)} placeholder="18:00" />
          </div>

          <Input value={targetUserIds} onChange={(e) => setTargetUserIds(e.target.value)} placeholder="Target user IDs comma-separated" />
          <Input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="Team ID (team scope only)" />

          <Button
            disabled={creating || !name.trim()}
            onClick={async () => {
              const parsedUserIds = targetUserIds
                .split(",")
                .map((v) => Number(v.trim()))
                .filter((v) => Number.isFinite(v) && v > 0);
              await createTemplate({
                name: name.trim(),
                type,
                scope,
                isRecurring: true,
                weekday: Number(weekday),
                startsAtTime,
                endsAtTime,
                targetUserIds: scope === "team" ? [] : parsedUserIds,
                teamId: scope === "team" && teamId ? Number(teamId) : null,
                isActive: true,
              }).unwrap();
              setName("");
              setTargetUserIds("");
              setTeamId("");
              await refetchTemplates();
            }}
          >
            Create template
          </Button>

          <div className="space-y-2 pt-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-lg border p-2 text-sm">
                <div className="font-medium">{t.name}</div>
                <div className="text-muted-foreground">{typeLabel(t.type)} • {t.startsAtTime} - {t.endsAtTime}</div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={materializing}
                  onClick={async () => {
                    setSelectedTemplateId(t.id);
                    await materializeTemplate({ templateId: t.id, from: fromIso, to: toIso }).unwrap();
                    await refetchSessions();
                  }}
                >
                  {selectedTemplateId === t.id && materializing ? "Generating..." : "Generate sessions (2 months)"}
                </Button>
              </div>
            ))}
            {templates.length === 0 ? <p className="text-sm text-muted-foreground">No templates yet.</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold">Attendance</h3>
          <p className="text-sm text-muted-foreground">Mark attended/missed for scheduled sessions.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.map((s) => {
            const when = new Date(s.startsAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
            return (
              <div key={s.id} className="rounded-xl border p-3">
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{typeLabel(s.type)} • {when}</div>
                <div className="mt-2 space-y-1">
                  {s.attendees?.map((a) => (
                    <div key={`${s.id}-${a.userId}`} className="flex items-center justify-between gap-2 text-sm">
                      <span>{a.userName || a.userEmail || `User ${a.userId}`}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant={a.status === "attended" ? "default" : "outline"} disabled={marking} onClick={async () => {
                          await markAttendance({ sessionId: s.id, updates: [{ userId: a.userId, status: "attended" }] }).unwrap();
                          await refetchSessions();
                        }}>Attended</Button>
                        <Button size="sm" variant={a.status === "missed" ? "destructive" : "outline"} disabled={marking} onClick={async () => {
                          await markAttendance({ sessionId: s.id, updates: [{ userId: a.userId, status: "missed" }] }).unwrap();
                          await refetchSessions();
                        }}>Missed</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {sessions.length === 0 ? <p className="text-sm text-muted-foreground">No generated sessions in current range.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
