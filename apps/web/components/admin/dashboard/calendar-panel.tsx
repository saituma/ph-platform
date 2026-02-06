import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { Input } from "../../ui/input";
import { SectionHeader } from "../section-header";

type CalendarPanelProps = {
  visible: boolean;
  onOpenSlots?: () => void;
};

export function CalendarPanel({ visible, onOpenSlots }: CalendarPanelProps) {
  if (!visible) return null;

  const fixedWindow = "13:00";
  const days = [
    {
      day: "Mon",
      date: "Feb 10",
      sessions: [
        { time: "09:00", label: "Lift Lab 1:1", athlete: "Ava P.", type: "In-person" },
        { time: "13:00", label: "Premium Call", athlete: "Jordan M.", type: "Video" },
      ],
    },
    {
      day: "Tue",
      date: "Feb 11",
      sessions: [
        { time: "15:30", label: "Role Model", athlete: "Kayla D.", type: "Video" },
      ],
    },
    {
      day: "Wed",
      date: "Feb 12",
      sessions: [
        { time: "13:00", label: "Premium Call", athlete: "Miles T.", type: "Video" },
        { time: "18:00", label: "Group Call", athlete: "PHP Plus", type: "Video" },
        { time: "19:30", label: "Lift Lab 1:1", athlete: "Liam R.", type: "In-person" },
      ],
    },
    {
      day: "Thu",
      date: "Feb 13",
      sessions: [
        { time: "10:30", label: "Check-in", athlete: "Maya C.", type: "Video" },
      ],
    },
    {
      day: "Fri",
      date: "Feb 14",
      sessions: [
        { time: "13:00", label: "Premium Call", athlete: "Ava P.", type: "Video" },
        { time: "16:00", label: "Lift Lab 1:1", athlete: "Jordan M.", type: "In-person" },
      ],
    },
  ];

  return (
    <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
      <Card>
        <CardHeader className="space-y-4">
          <SectionHeader title="Weekly Calendar" description="Upcoming sessions by day." />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline">Week View</Button>
            <Button size="sm" variant="outline">List View</Button>
            <Button size="sm" variant="outline">Service Filters</Button>
            <Input placeholder="Search athlete" className="h-9 max-w-xs" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-5">
            {days.map((day) => (
              <div
                key={day.day}
                className="rounded-2xl border border-border bg-secondary/30 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{day.day}</p>
                    <p className="text-xs text-muted-foreground">{day.date}</p>
                  </div>
                  <Badge variant="accent">{day.sessions.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {day.sessions.map((session) => (
                    <div
                      key={`${day.day}-${session.time}-${session.athlete}`}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          {session.time}
                        </span>
                        <Badge variant="outline">{session.type}</Badge>
                      </div>
                      <p className="mt-1 text-[13px] text-foreground">
                        {session.label}
                      </p>
                      <p className="text-muted-foreground">{session.athlete}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">Fixed Premium Window</p>
                <p className="text-xs text-muted-foreground">
                  Daily 13:00 calls auto-scheduled for Premium.
                </p>
              </div>
              <Badge variant="accent">
                {days.reduce(
                  (count, day) =>
                    count + day.sessions.filter((session) => session.time === fixedWindow).length,
                  0
                )}{" "}
                sessions
              </Badge>
              <Button size="sm" variant="outline">Adjust Window</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <SectionHeader title="Availability" description="Next open slots." />
          </CardHeader>
          <CardContent className="space-y-3">
            {["09:30", "12:00", "15:30", "18:00"].map((time) => (
              <div
                key={time}
                className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-foreground">{time}</span>
                <Button size="sm" variant="outline">Reserve</Button>
              </div>
            ))}
            <Button className="w-full" variant="outline" onClick={onOpenSlots}>
              Open New Slots
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Session Insights" description="Week summary." />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3">
              <span className="text-muted-foreground">Total Sessions</span>
              <span className="font-semibold text-foreground">9</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3">
              <span className="text-muted-foreground">Video Calls</span>
              <span className="font-semibold text-foreground">6</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3">
              <span className="text-muted-foreground">In-person</span>
              <span className="font-semibold text-foreground">3</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3">
              <span className="text-muted-foreground">Capacity Used</span>
              <span className="font-semibold text-foreground">78%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
