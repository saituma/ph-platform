"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Crown, MessageCircle, Users } from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { AdminShell } from "../components/admin/shell";
import { EmptyState } from "../components/admin/empty-state";
import { SectionHeader } from "../components/admin/section-header";
import { MiniBars } from "../components/admin/charts";
import { GreenDoughnutChart, GreenLineChart, GreenStackedBars } from "../components/admin/chartjs";
import { ActionDialogs, type DashboardDialog } from "../components/admin/dashboard/action-dialogs";
import { CalendarPanel } from "../components/admin/dashboard/calendar-panel";
import { EngagementTrendsChart } from "../components/admin/dashboard/engagement-trends-chart";
import {
  BookingTodayRow,
  DashboardPulseStrip,
  DashboardQuickLinks,
  DashboardSectionHeading,
  HighlightTile,
  KpiStatTile,
  TopAthleteRow,
  TrendInsightCard,
} from "../components/admin/dashboard/dashboard-overview";
import { useGetAdminTeamsQuery, useGetDashboardQuery, useGetHomeContentQuery } from "../lib/apiSlice";

const KPI_ICONS = [Users, Crown, MessageCircle, CalendarDays] as const;

type DashboardBooking = {
  serviceName?: string | null;
  type?: string | null;
  athleteName?: string | null;
  startsAt?: string | null;
};

type DashboardTopAthlete = {
  name: string;
  tier?: string | null;
  score?: number | null;
};

type TierDistributionDatum = {
  label: string;
  value: number;
  color: string;
};

type ActivityMixDatum = {
  label: string;
  segments: Array<{ value: number; color: string }>;
};

type HomeBody = {
  headline?: string;
  description?: string;
  welcome?: string;
  introVideoUrl?: string;
  testimonials?: unknown[] | string;
  heroImageUrl?: string;
  adminStory?: string;
  professionalPhoto?: string;
  professionalPhotos?: string[] | string;
};

type ProgramOpsItem = {
  title: string;
  detail: string;
};

export default function Home() {
  const { data: dashboardData, isLoading } = useGetDashboardQuery();
  const { data: homeContentData } = useGetHomeContentQuery();
  const { data: teamsData, isLoading: isTeamsLoading } = useGetAdminTeamsQuery();
  const router = useRouter();

  const todayLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" });
  }, []);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const { dashboardKpis, todayBookings } = useMemo(() => {
    const kpiData = dashboardData?.kpis;
    const bookingsToday: DashboardBooking[] = Array.isArray(dashboardData?.bookingsToday) ? dashboardData.bookingsToday : [];
    const mappedBookings = bookingsToday.map((b) => ({
      name: b.serviceName ?? b.type ?? "Session",
      athlete: b.athleteName ?? "Athlete",
      time: b.startsAt
        ? new Date(b.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "--",
      type: b.type ?? "Session",
    }));

    return {
      dashboardKpis: [
        { label: "Total Athletes", value: kpiData ? String(kpiData.totalAthletes) : "--", delta: "Live" },
        { label: "Premium Clients", value: kpiData ? String(kpiData.premiumClients) : "--", delta: "Live" },
        { label: "Unread Messages", value: kpiData ? String(kpiData.unreadMessages) : "--", delta: "Live" },
        { label: "Bookings Today", value: kpiData ? String(kpiData.bookingsToday) : "--", delta: "Live" },
      ],
      todayBookings: mappedBookings,
    };
  }, [dashboardData]);

  const hasKpis = dashboardKpis.length > 0;
  const hasBookings = todayBookings.length > 0;

  const kpisWithIcons = useMemo(
    () =>
      dashboardKpis.map((kpi: { label: string; value: string; delta: string }, index: number) => ({
        ...kpi,
        icon: KPI_ICONS[index % KPI_ICONS.length],
      })),
    [dashboardKpis]
  );
  const [activeDialog, setActiveDialog] = useState<DashboardDialog>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const trendCardsData = useMemo(() => {
    if (!dashboardData?.trends) return [];
    const trends = dashboardData.trends;
    return [
      {
        title: "Weekly Training Load",
        value: `${trends.trainingLoad}%`,
        change: "Last 7 days",
        series: trends.trainingSeries ?? [],
      },
      {
        title: "Messaging Response Rate",
        value: `${trends.messagingResponseRate}%`,
        change: "Last 7 days",
        series: trends.messagingSeries ?? [],
      },
      {
        title: "Bookings Utilization",
        value: `${trends.bookingsUtilization}%`,
        change: "Last 7 days",
        series: trends.bookingSeries ?? [],
      },
    ];
  }, [dashboardData]);

  const volumeBarsData = dashboardData?.weeklyVolume?.bars ?? [];

  const weeklyTotals = dashboardData?.weeklyVolume?.totals ?? {
    messages: 0,
    bookings: 0,
    uploads: 0,
  };

  const topAthletesData = useMemo(() => {
    if (!dashboardData?.topAthletes?.length) return [];
    return (dashboardData.topAthletes as DashboardTopAthlete[]).map((athlete) => ({
      name: athlete.name,
      tier:
        athlete.tier === "PHP_Pro"
          ? "Pro"
          : athlete.tier === "PHP_Premium_Plus"
            ? "Premium Plus"
            : athlete.tier === "PHP_Premium"
              ? "Premium"
              : "Program",
      score: athlete.score != null ? String(athlete.score) : "",
    }));
  }, [dashboardData]);
  const topAthletesPreview = topAthletesData.slice(0, 3);

  const teamRows = useMemo(() => {
    const rows = teamsData?.teams ?? [];
    return [...rows].sort((a, b) => b.memberCount - a.memberCount);
  }, [teamsData]);

  const totalTeams = teamRows.length;
  const totalTeamAthletes = teamRows.reduce((sum, team) => sum + (team.memberCount ?? 0), 0);
  const totalGuardians = teamRows.reduce((sum, team) => sum + (team.guardianCount ?? 0), 0);

  const tierSummary = dashboardData?.tierDistribution;
  const tierDistributionData: TierDistributionDatum[] = tierSummary
    ? [
        { label: "Program", value: tierSummary.program, color: "hsl(142 20% 40%)" },
        { label: "Premium", value: tierSummary.premium, color: "hsl(142 45% 45%)" },
        { label: "Premium Plus", value: tierSummary.premiumPlus, color: "hsl(142 71% 45%)" },
        { label: "Pro", value: tierSummary.pro, color: "hsl(150 85% 35%)" },
      ]
    : [];

  const tierTotal = tierSummary?.total ?? tierDistributionData.reduce((sum, item) => sum + item.value, 0);
  const tierRatios = tierTotal
    ? tierDistributionData.map((item) => item.value / tierTotal)
    : [0.35, 0.25, 0.25, 0.15];

  const activityMixData = useMemo<ActivityMixDatum[]>(() => {
    const totalMessages = weeklyTotals.messages;
    const totalBookings = weeklyTotals.bookings;
    const totalUploads = weeklyTotals.uploads;
    const colors = ["hsl(142 71% 45%)", "hsl(142 45% 45%)", "hsl(142 20% 40%)", "hsl(150 85% 35%)"];
    const toSegments = (total: number) =>
      tierRatios.map((ratio, index: number) => ({
        value: Math.round(total * ratio),
        color: colors[index],
      }));
    return [
      { label: "Messages", segments: toSegments(totalMessages) },
      { label: "Bookings", segments: toSegments(totalBookings) },
      { label: "Uploads", segments: toSegments(totalUploads) },
    ];
  }, [tierRatios, weeklyTotals]);

  const weeklyProgressData = dashboardData?.weeklyProgress?.series ?? [];
  const weeklyLabels = dashboardData?.weeklyProgress?.labels ?? [];

  const highlightsData = dashboardData?.highlights ?? [];

  const programOpsData: ProgramOpsItem[] = Array.isArray(dashboardData?.programOps) ? dashboardData.programOps : [];

  const homeItem = (homeContentData?.items ?? [])[0] ?? null;
  let homeBody: HomeBody = {};
  if (homeItem?.body && typeof homeItem.body === "string") {
    try {
      homeBody = JSON.parse(homeItem.body) as HomeBody;
    } catch {
      homeBody = {};
    }
  }

  const trimText = (value: string, limit = 140) => {
    const text = value?.trim() ?? "";
    if (!text) return "";
    return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
  };

  const professionalPhoto =
    typeof homeBody.professionalPhoto === "string"
      ? homeBody.professionalPhoto.trim()
      : Array.isArray(homeBody.professionalPhotos)
        ? homeBody.professionalPhotos[0] ?? ""
        : typeof homeBody.professionalPhotos === "string"
          ? homeBody.professionalPhotos.split(/\r?\n|,/).map((item: string) => item.trim()).filter(Boolean)[0] ?? ""
          : "";

  const homeSnapshot = {
    headline: homeBody.headline ?? homeItem?.content ?? homeItem?.title ?? "",
    description: homeBody.description ?? "",
    welcome: homeBody.welcome ?? "",
    introVideoUrl: homeBody.introVideoUrl ?? "",
    testimonials: homeBody.testimonials ?? "",
    heroImageUrl: homeBody.heroImageUrl ?? "",
    adminStory: homeBody.adminStory ?? "",
  };

  const testimonialsPreview = Array.isArray(homeSnapshot.testimonials)
    ? `${homeSnapshot.testimonials.length} testimonial${homeSnapshot.testimonials.length === 1 ? "" : "s"}`
    : typeof homeSnapshot.testimonials === "string"
      ? trimText(homeSnapshot.testimonials)
      : "";

  return (
    <AdminShell title={greeting} subtitle={todayLabel}>
      <div className="space-y-8">
          <section className="space-y-4">
            <DashboardSectionHeading
              title="TEAM"
              description="LIVE TEAM ROSTER SUMMARY."
            />
            <Card>
              <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-secondary/20 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">Teams</p>
                  <p className="mt-1 text-2xl font-black font-mono text-foreground">
                    {isTeamsLoading ? "--" : totalTeams}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/20 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">Athletes In Teams</p>
                  <p className="mt-1 text-2xl font-black font-mono text-foreground">
                    {isTeamsLoading ? "--" : totalTeamAthletes}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/20 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">Guardians In Teams</p>
                  <p className="mt-1 text-2xl font-black font-mono text-foreground">
                    {isTeamsLoading ? "--" : totalGuardians}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <DashboardQuickLinks />
          </section>

          <section className="space-y-4">
            <DashboardSectionHeading
              title="ADMIN PROFILE"
              description="PHOTO, STORY, AND TESTIMONIAL SNAPSHOT."
            />
            <Card>
              <CardContent className="grid gap-4 p-5 md:grid-cols-[160px_1fr]">
                <div className="overflow-hidden rounded-xl border border-border bg-secondary/20">
                  {professionalPhoto ? (
                    <img
                      src={professionalPhoto}
                      alt="Admin professional"
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                      No photo
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    {homeSnapshot.headline || "Coach profile"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {trimText(homeSnapshot.adminStory || homeSnapshot.description || homeSnapshot.welcome, 320) || "No story added yet."}
                  </p>
                  <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Testimonials:</span>{" "}
                    {testimonialsPreview || "No testimonials yet."}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {isLoading ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`kpi-skeleton-${index}`}
                  className="rounded-2xl border border-border/90 bg-card p-5 shadow-sm"
                >
                  <div className="flex justify-between gap-3">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="mt-4 h-3 w-24" />
                  <Skeleton className="mt-2 h-9 w-16" />
                </div>
              ))}
            </section>
          ) : hasKpis ? (
            <section className="space-y-4">
              <DashboardSectionHeading
                title="KPI READOUT"
                description="HEADLINE METRICS FOR ROSTER AND SCHEDULE."
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpisWithIcons.map((kpi: { label: string; value: string; delta: string; icon: (typeof KPI_ICONS)[number] }) => (
                  <KpiStatTile key={kpi.label} label={kpi.label} value={kpi.value} delta={kpi.delta} icon={kpi.icon} />
                ))}
              </div>
            </section>
          ) : (
            <EmptyState
              title="No dashboard stats yet"
              description="Once athletes start training, stats will appear here."
            />
          )}

          <section className="space-y-4">
            <DashboardSectionHeading
              title="ENGAGEMENT TRENDS"
              description="SEVEN-DAY SPARKINES FOR LOAD, MESSAGING, AND BOOKINGS."
            />
            {trendCardsData.length ? (
              <EngagementTrendsChart metrics={trendCardsData} />
            ) : (
              <Card className="col-span-full border-dashed">
                <CardContent>
                  <EmptyState title="No trend data yet" description="Metrics will appear after activity begins." />
                </CardContent>
              </Card>
            )}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <SectionHeader
                  title="WEEKLY VOLUME"
                  description="MESSAGES, BOOKINGS, AND UPLOADS."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {volumeBarsData.length ? (
                  <>
                    <MiniBars values={volumeBarsData} />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-sm">
                        <p className="text-xs text-muted-foreground">Messages</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{weeklyTotals.messages}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-sm">
                        <p className="text-xs text-muted-foreground">Bookings</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{weeklyTotals.bookings}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-sm">
                        <p className="text-xs text-muted-foreground">Uploads</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{weeklyTotals.uploads}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState title="No weekly volume yet" description="Activity totals will appear once sessions begin." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader
                  title="TOP ATHLETES"
                  description="MOST ACTIVE THIS PERIOD."
                  actionLabel="SEE FULL STATS"
                  onAction={() => router.push("/top-athletes")}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {topAthletesPreview.length ? (
                  topAthletesPreview.map(
                    (
                      athlete: { name: string; tier: string; score: string },
                      index: number
                    ) => (
                      <TopAthleteRow
                        key={`${athlete.name ?? "athlete"}-${index}`}
                        rank={index + 1}
                        name={athlete.name}
                        score={athlete.score}
                        tier={athlete.tier}
                        tierVariant={athlete.tier === "Premium" ? "primary" : "default"}
                      />
                    )
                  )
                ) : (
                  <EmptyState title="No athlete activity yet" description="Top athletes will appear after bookings and messaging." />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <SectionHeader
                  title="TIER DISTRIBUTION"
                  description="ACTIVE ATHLETE BREAKDOWN."
                />
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                {tierDistributionData.length ? (
                  <>
                    <div className="h-[220px] w-[220px]">
                      <GreenDoughnutChart
                        labels={tierDistributionData.map((tier) => tier.label)}
                        values={tierDistributionData.map((tier) => tier.value)}
                      />
                    </div>
                    <div className="space-y-3 text-sm">
                      {tierDistributionData.map((tier) => (
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
                  </>
                ) : (
                  <EmptyState title="No tier data yet" description="Tier distribution will appear after onboarding." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader
                  title="ACTIVITY MIX"
                  description="PREMIUM VS PLUS VS PROGRAM."
                />

              </CardHeader>
              <CardContent>
                {activityMixData.length ? (
                  <div className="h-[220px]">
                    <GreenStackedBars
                      labels={activityMixData.map((item) => item.label)}
                      datasets={[
                        { label: "Program", data: activityMixData.map((item) => item.segments[2]?.value ?? 0) },
                        { label: "Plus", data: activityMixData.map((item) => item.segments[1]?.value ?? 0) },
                        { label: "Premium", data: activityMixData.map((item) => item.segments[0]?.value ?? 0) },
                      ]}
                    />
                  </div>
                ) : (
                  <EmptyState title="No activity mix yet" description="Activity ratios will appear after engagement." />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <SectionHeader
                  title="WEEKLY PROGRESS"
                  description="ATHLETE ENGAGEMENT TREND."
                />
              </CardHeader>
              <CardContent>
                {weeklyProgressData.length ? (
                  <div className="h-[240px]">
                    <GreenLineChart labels={weeklyLabels} values={weeklyProgressData} />
                  </div>
                ) : (
                  <EmptyState title="No weekly progress yet" description="Engagement trends will show once activity starts." />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <SectionHeader
                  title="SYSTEM MOMENTUM"
                  description="ROLLING 7-DAY IMPROVEMENTS."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {(["Retention", "Response Time", "Plan Completion"] as const).map((metric, i) => (
                  <div
                    key={metric}
                    className="rounded-2xl border border-border/90 bg-secondary/30 p-4 text-sm transition hover:border-primary/25 dark:bg-secondary/15"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{metric}</p>
                      <Badge variant="accent">+6%</Badge>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary/60 dark:bg-secondary/40">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${[78, 62, 71][i]}%` }}
                      />
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
                  title="BOOKINGS TODAY"
                  description="ALL CONFIRMED SESSIONS."
                  actionLabel={showCalendar ? "HIDE CALENDAR" : "OPEN CALENDAR"}
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
                  todayBookings.map(
                    (
                      booking: { name: string; athlete: string; time: string; type: string },
                      index: number
                    ) => (
                      <BookingTodayRow
                        key={`${booking.name ?? "booking"}-${index}`}
                        name={booking.name}
                        athlete={booking.athlete}
                        time={booking.time}
                        type={booking.type}
                      />
                    )
                  )
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
                  title="SYSTEM OPS"
                  description="TEMPLATES AND LIBRARY UPDATES."
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {programOpsData.length ? (
                  programOpsData.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No program updates yet" description="Templates and library updates will appear here." />
                )}
              </CardContent>
            </Card>
          </section>

          <CalendarPanel
            visible={showCalendar}
            onOpenSlots={() => setActiveDialog("slots")}
          />

          <section className="space-y-4">
            <DashboardSectionHeading title="SYSTEM HIGHLIGHTS" description="NOTABLE WINS AND MILESTONES THIS WEEK." />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {highlightsData.length ? (
                highlightsData.map((item: { label: string; value: string; detail: string }) => (
                  <HighlightTile key={item.label} label={item.label} value={item.value} detail={item.detail} />
                ))
              ) : (
                <Card className="col-span-full border-dashed">
                  <CardContent>
                    <EmptyState title="No highlights yet" description="Weekly highlights will appear once activity is logged." />
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
      </div>

      <ActionDialogs active={activeDialog} onClose={() => setActiveDialog(null)} />
    </AdminShell>
  );
}
