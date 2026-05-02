"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";

import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { SectionHeader } from "../section-header";
import { Skeleton } from "../../ui/skeleton";

type BookingEntry = {
  serviceName?: string | null;
  type?: string | null;
  athleteName?: string | null;
  startsAt?: string | null;
};

type CalendarPanelProps = {
  visible: boolean;
  bookings?: BookingEntry[];
  isLoading?: boolean;
  onOpenSlots?: () => void;
};

export function CalendarPanel({ visible, bookings = [], isLoading = false, onOpenSlots }: CalendarPanelProps) {
  if (!visible) return null;

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 5 }, (_, i) => {
      const date = addDays(start, i);
      const dayBookings = bookings.filter((b) => {
        if (!b.startsAt) return false;
        return isSameDay(new Date(b.startsAt), date);
      });
      return {
        day: format(date, "EEE"),
        date: format(date, "MMM d"),
        isToday: isSameDay(date, new Date()),
        sessions: dayBookings.map((b) => ({
          time: b.startsAt ? format(new Date(b.startsAt), "HH:mm") : "--",
          label: b.serviceName ?? b.type ?? "Session",
          athlete: b.athleteName ?? "Athlete",
          type: b.type ?? "Session",
        })),
      };
    });
  }, [bookings]);

  const totalSessions = weekDays.reduce((sum, d) => sum + d.sessions.length, 0);
  const videoSessions = bookings.filter((b) => b.type?.toLowerCase().includes("video") || b.type?.toLowerCase().includes("call")).length;
  const inPersonSessions = totalSessions - videoSessions;

  return (
    <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
      <Card>
        <CardHeader className="space-y-4">
          <SectionHeader title="Weekly Calendar" description="Upcoming sessions by day." />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" render={<Link href="/bookings" />}>
              Full Calendar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`cal-skel-${i}`} className="h-48 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-5">
              {weekDays.map((day) => (
                <div
                  key={day.day}
                  className={`rounded-2xl border p-4 transition ${day.isToday ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/30"}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-semibold ${day.isToday ? "text-primary" : "text-foreground"}`}>{day.day}</p>
                      <p className="text-xs text-muted-foreground">{day.date}</p>
                    </div>
                    {day.sessions.length > 0 && (
                      <Badge variant={day.isToday ? "default" : "secondary"}>{day.sessions.length}</Badge>
                    )}
                  </div>
                  <div className="mt-4 space-y-3">
                    {day.sessions.length > 0 ? (
                      day.sessions.map((session, idx) => (
                        <div
                          key={`${day.day}-${idx}`}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">{session.time}</span>
                            <Badge variant="outline" className="text-[10px]">{session.type}</Badge>
                          </div>
                          <p className="mt-1 text-[13px] text-foreground">{session.label}</p>
                          <p className="text-muted-foreground">{session.athlete}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">No sessions</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <SectionHeader title="Availability" description="Manage your open slots." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" variant="outline" onClick={onOpenSlots}>
              Open New Slots
            </Button>
            <Button className="w-full" variant="outline" render={<Link href="/bookings" />}>
              Manage Availability
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Session Insights" description="This week's summary." />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3">
              <span className="text-muted-foreground">Total Sessions</span>
              <span className="font-semibold text-foreground">{totalSessions}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3">
              <span className="text-muted-foreground">Video Calls</span>
              <span className="font-semibold text-foreground">{videoSessions}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3">
              <span className="text-muted-foreground">In-person</span>
              <span className="font-semibold text-foreground">{inPersonSessions}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
