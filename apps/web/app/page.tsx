"use client";

import { useMemo, useState } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { AdminShell } from "../components/admin/shell";
import { EmptyState } from "../components/admin/empty-state";
import { SectionHeader } from "../components/admin/section-header";
import {
  DonutChart,
  LineChart,
  MiniBars,
  Sparkline,
  StackedBars,
} from "../components/admin/charts";
import { ActionDialogs, type DashboardDialog } from "../components/admin/dashboard/action-dialogs";
import { CalendarPanel } from "../components/admin/dashboard/calendar-panel";
import { PriorityQueue } from "../components/admin/dashboard/priority-queue";
import { QuickActions } from "../components/admin/dashboard/quick-actions";

const kpis = [
  { label: "Active Athletes", value: "214", delta: "+12 this week" },
  { label: "Premium Clients", value: "18", delta: "3 awaiting review" },
  { label: "Unread Messages", value: "27", delta: "9 priority" },
  { label: "Bookings Today", value: "6", delta: "2 in-person" },
];

const queue = [
  {
    title: "Video Review",
    detail: "Miles T. • Single-leg hop assessment",
    status: "Awaiting feedback",
  },
  {
    title: "Message",
    detail: "Ava P. • Knee soreness after practice",
    status: "Premium",
  },
  {
    title: "Program Approval",
    detail: "Liam R. • PHP Plus onboarding complete",
    status: "Assign template",
  },
  {
    title: "Parent Platform",
    detail: "Nutrition Week 2 article draft",
    status: "Ready to publish",
  },
];

const bookings = [
  {
    name: "Role Model Meeting",
    athlete: "Jordan M.",
    time: "13:00",
    type: "Video",
  },
  {
    name: "Lift Lab 1:1",
    athlete: "Kayla D.",
    time: "15:30",
    type: "In-person",
  },
  {
    name: "Group Call",
    athlete: "PHP Plus Cohort",
    time: "18:00",
    type: "Video",
  },
];

const quickActions = [
  "Create program template",
  "Add exercise video",
  "Publish Parent Platform article",
  "Open booking slots",
];

const trendCards = [
  {
    title: "Weekly Training Load",
    value: "86%",
    change: "+8%",
    series: [30, 40, 36, 55, 62, 58, 72, 80, 88, 86],
  },
  {
    title: "Messaging Response Rate",
    value: "94%",
    change: "+3%",
    series: [70, 74, 78, 80, 82, 88, 91, 93, 94, 94],
  },
  {
    title: "Bookings Utilization",
    value: "78%",
    change: "+11%",
    series: [20, 28, 32, 40, 44, 50, 58, 65, 72, 78],
  },
];

const highlights = [
  { label: "New Onboardings", value: "12", detail: "7 pending review" },
  { label: "Videos Uploaded", value: "18", detail: "4 priority" },
  { label: "Content Updates", value: "9", detail: "2 scheduled" },
  { label: "Physio Referrals", value: "5", detail: "3 redeemed" },
];

const volumeBars = [20, 28, 26, 32, 45, 38, 52, 60, 55, 62, 70, 64];

const topAthletes = [
  { name: "Ava Patterson", tier: "Premium", score: "High engagement" },
  { name: "Miles Turner", tier: "Premium", score: "Video review pending" },
  { name: "Kayla Davis", tier: "Plus", score: "Booking cadence steady" },
  { name: "Jordan Miles", tier: "Program", score: "Program week 4" },
];

const tierDistribution = [
  { label: "Program", value: 120, color: "hsl(210 20% 70%)" },
  { label: "Plus", value: 76, color: "hsl(195 45% 55%)" },
  { label: "Premium", value: 18, color: "hsl(210 55% 42%)" },
];

const stackedActivity = [
  {
    label: "Messages",
    segments: [
      { value: 40, color: "hsl(210 55% 42%)" },
      { value: 30, color: "hsl(195 45% 55%)" },
      { value: 18, color: "hsl(210 20% 70%)" },
    ],
  },
  {
    label: "Bookings",
    segments: [
      { value: 18, color: "hsl(210 55% 42%)" },
      { value: 10, color: "hsl(195 45% 55%)" },
      { value: 6, color: "hsl(210 20% 70%)" },
    ],
  },
  {
    label: "Uploads",
    segments: [
      { value: 10, color: "hsl(210 55% 42%)" },
      { value: 6, color: "hsl(195 45% 55%)" },
      { value: 4, color: "hsl(210 20% 70%)" },
    ],
  },
];

const lineSeries = [20, 28, 35, 50, 48, 60, 66, 72, 80, 76, 84, 90];
const lineLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "", "", "", "", ""];

export default function Home() {
  const hasKpis = kpis.length > 0;
  const hasBookings = bookings.length > 0;
  const isLoading = false;
  const [activeDialog, setActiveDialog] = useState<DashboardDialog>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [expandedQueue, setExpandedQueue] = useState(false);
  const queueItems = useMemo(
    () =>
      expandedQueue
        ? [
            ...queue,
            {
              title: "Booking Request",
              detail: "Parent call • availability confirmation",
              status: "Confirm",
            },
            {
              title: "Program Update",
              detail: "Week 4 adjustments • PHP Program",
              status: "Review",
            },
          ]
        : queue,
    [expandedQueue]
  );

  const actions = (
    <Button onClick={() => setActiveDialog("message")}>New Message</Button>
  );

  return (
    <AdminShell title="Coach Control Center" subtitle="Friday, 6 Feb" actions={actions}>
      {isLoading ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`kpi-skeleton-${index}`}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-24" />
              </CardContent>
            </Card>
          ))}
        </section>
      ) : hasKpis ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="hover:border-primary/40">
              <CardHeader>
                <CardDescription>{kpi.label}</CardDescription>
                <CardTitle className="text-3xl">{kpi.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="accent">{kpi.delta}</Badge>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : (
        <EmptyState
          title="No dashboard stats yet"
          description="Once athletes start training, stats will appear here."
        />
      )}

      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <SectionHeader
              title="Priority Queue"
              description="Items requiring immediate action."
              actionLabel={expandedQueue ? "Collapse" : "View all"}
              onAction={() => setExpandedQueue((prev) => !prev)}
            />
          </CardHeader>
          <CardContent>
            <PriorityQueue items={queueItems} isLoading={isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Quick Actions"
              description="Jump to key workflows."
            />
          </CardHeader>
          <CardContent>
            <QuickActions
              items={quickActions}
              isLoading={isLoading}
              onSelect={(action) => {
                if (action.includes("program")) setActiveDialog("program");
                if (action.includes("exercise")) setActiveDialog("exercise");
                if (action.includes("article")) setActiveDialog("article");
                if (action.includes("booking")) setActiveDialog("slots");
              }}
            />
          </CardContent>
          <Separator />
          <CardContent className="space-y-2">
            {isLoading ? (
              <>
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-48" />
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Premium coverage
                </p>
                <p className="text-sm text-foreground">
                  5 priority threads need response within 2 hours.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {trendCards.map((card) => (
          <Card key={card.title} className="hover:border-primary/40">
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Last 10 days</span>
                <Badge variant="accent">{card.change}</Badge>
              </div>
              <Sparkline values={card.series} className="text-primary" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <SectionHeader
              title="Weekly Volume"
              description="Messages, bookings, and uploads."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <MiniBars values={volumeBars} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-sm">
                <p className="text-xs text-muted-foreground">Messages</p>
                <p className="mt-2 text-lg font-semibold text-foreground">128</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-sm">
                <p className="text-xs text-muted-foreground">Bookings</p>
                <p className="mt-2 text-lg font-semibold text-foreground">24</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-sm">
                <p className="text-xs text-muted-foreground">Uploads</p>
                <p className="mt-2 text-lg font-semibold text-foreground">19</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Top Athletes"
              description="Most active this week."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {topAthletes.map((athlete) => (
              <div
                key={athlete.name}
                className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-foreground">{athlete.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {athlete.score}
                  </p>
                </div>
                <Badge variant={athlete.tier === "Premium" ? "primary" : "default"}>
                  {athlete.tier}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <SectionHeader
              title="Tier Distribution"
              description="Active athlete breakdown."
            />
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <DonutChart segments={tierDistribution} centerLabel="214" />
            <div className="space-y-3 text-sm">
              {tierDistribution.map((tier) => (
                <div key={tier.label} className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: tier.color }}
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {tier.label}
                    </span>
                    <span className="text-muted-foreground">{tier.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Activity Mix"
              description="Premium vs Plus vs Program."
            />
          </CardHeader>
          <CardContent>
            <StackedBars stacks={stackedActivity} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <SectionHeader
              title="Weekly Progress"
              description="Athlete engagement trend."
            />
          </CardHeader>
          <CardContent>
            <LineChart values={lineSeries} labels={lineLabels} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SectionHeader
              title="Momentum"
              description="Rolling 7-day improvements."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {["Retention", "Response Time", "Plan Completion"].map((metric) => (
              <div
                key={metric}
                className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">{metric}</p>
                  <Badge variant="accent">+6%</Badge>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-secondary/50">
                  <div className="h-2 w-3/4 rounded-full bg-primary" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <SectionHeader
              title="Bookings Today"
              description="All confirmed sessions."
              actionLabel={showCalendar ? "Hide calendar" : "Open calendar"}
              onAction={() => setShowCalendar((prev) => !prev)}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`booking-skeleton-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))
            ) : hasBookings ? (
              bookings.map((booking) => (
                <div
                  key={booking.name}
                  className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm transition hover:border-primary/40"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {booking.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.athlete}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {booking.time}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.type}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No bookings today"
                description="Open availability to start taking sessions."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Program Operations"
              description="Templates and library updates."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
              <p className="font-semibold text-foreground">PHP Plus Template</p>
              <p className="text-xs text-muted-foreground">
                Week 3 session balance review needed.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
              <p className="font-semibold text-foreground">
                Premium Plan Drafts
              </p>
              <p className="text-xs text-muted-foreground">
                2 athletes awaiting individualized load adjustments.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
              <p className="font-semibold text-foreground">
                Exercise Library
              </p>
              <p className="text-xs text-muted-foreground">
                4 new uploads need metadata.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <CalendarPanel
        visible={showCalendar}
        onOpenSlots={() => setActiveDialog("slots")}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlights.map((item) => (
          <Card key={item.label} className="hover:border-primary/40">
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{item.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <ActionDialogs active={activeDialog} onClose={() => setActiveDialog(null)} />
    </AdminShell>
  );
}
