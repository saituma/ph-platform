"use client";

import { useMemo } from "react";

import { AdminShell } from "../../../components/admin/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useCheckInScheduledSessionMutation, useGetMyScheduledSessionsQuery } from "../../../lib/apiSlice";
import type { MyScheduledSessionRecord } from "../../../lib/core";

function labelForType(type: MyScheduledSessionRecord["type"]) {
  switch (type) {
    case "one_to_one":
      return "1-1 Session";
    case "semi_private":
      return "Semi-Private Session";
    case "in_person":
      return "In-Person Session";
    case "team":
      return "Team Session";
    default:
      return "Session";
  }
}

// Admin-side view of the coach/admin's own scheduled sessions.
// Despite the "your sessions" wording this is protected by isAdminPortalRole middleware
// and is NOT accessible to guardian/parent users. The real parent session view is in apps/parent.
export default function ParentSchedulePage() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59, 999).toISOString();

  const { data, isLoading } = useGetMyScheduledSessionsQuery({ from, to });
  const [checkInSession, { isLoading: checkinLoading }] = useCheckInScheduledSessionMutation();

  const sessions = useMemo(() => (Array.isArray(data?.sessions) ? data.sessions : []), [data]);

  const grouped = useMemo(() => {
    const upcoming = sessions.filter((s) => s.status === "Upcoming");
    const completed = sessions.filter((s) => s.status === "Completed");
    const missed = sessions.filter((s) => s.status === "Missed");
    return { upcoming, completed, missed };
  }, [sessions]);

  const renderSection = (title: string, items: MyScheduledSessionRecord[]) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {items.length === 0 ? (
          <p>No sessions in this section.</p>
        ) : (
          items.map((item) => {
            const start = new Date(item.startsAt);
            const end = new Date(item.endsAt);
            const day = start.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
            const time = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
            return (
              <div key={item.sessionId} className="rounded-2xl border border-border bg-secondary/40 p-4 text-foreground">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{item.name || labelForType(item.type)}</span>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.status}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{labelForType(item.type)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{day} • {time}</p>
                {item.location ? <p className="mt-1 text-sm text-muted-foreground">Location: {item.location}</p> : null}
                {item.meetingLink ? (
                  <a className="mt-1 inline-block text-sm text-primary underline" href={item.meetingLink} target="_blank" rel="noreferrer">
                    Open meeting link
                  </a>
                ) : null}
                {item.status === "Upcoming" ? (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={checkinLoading}
                      onClick={async () => {
                        await checkInSession(item.sessionId);
                      }}
                    >
                      {item.checkInAt ? "Checked in" : "Check in"}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminShell title="Schedule" subtitle="View your fixed sessions and attendance history.">
      <Card>
        <CardHeader>
          <CardTitle>Your Sessions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Users can view sessions only. Changes and attendance marking are controlled by coach/admin.
        </CardContent>
      </Card>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading sessions...</p> : null}

      {renderSection("Upcoming", grouped.upcoming)}
      {renderSection("Completed", grouped.completed)}
      {renderSection("Missed", grouped.missed)}
    </AdminShell>
  );
}
