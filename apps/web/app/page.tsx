"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Crown, FlaskConical, MessageCircle, Users } from "lucide-react";

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
import { SystemStatusPulse, QuickAccessLinks } from "../components/admin/dashboard/pulse-links";
import {
    BookingTodayRow,
    DashboardSectionHeading,
    HighlightTile,
    KpiStatTile,
    TopAthleteRow,
} from "@/components/admin/dashboard/dashboard-overview";
import { useGetAdminTeamsQuery, useGetBetaTesterStatsQuery, useGetDashboardQuery, useGetHomeContentQuery } from "../lib/apiSlice";

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
    segments: Array<{ value: number; color: string; }>;
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
    const { data: betaStats } = useGetBetaTesterStatsQuery();
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
            dashboardKpis.map((kpi: { label: string; value: string; delta: string; }, index: number) => ({
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
    const totalTeamAthletes = teamRows.reduce((sum, team) => sum + Number(team.memberCount ?? 0), 0);
    const totalYouthAthletes = teamRows.reduce((sum, team) => sum + Number(team.youthCount ?? 0), 0);
    const totalAdultAthletes = teamRows.reduce((sum, team) => sum + Number(team.adultCount ?? 0), 0);

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
            <div className="space-y-12">
                {/* Top Header: System Status & Quick Links */}
                <div className="space-y-6">
                    <SystemStatusPulse />
                    <QuickAccessLinks />
                </div>

                {/* Primary Bento: KPIs */}
                {isLoading ? (
                    <section className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-4 overflow-hidden border border-border">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div
                                key={`kpi-skeleton-${index}`}
                                className="bg-card/40 p-8 backdrop-blur-xl"
                            >
                                <div className="flex justify-between gap-3">
                                    <Skeleton className="h-10 w-10 rounded-none" />
                                    <Skeleton className="h-5 w-12 rounded-none" />
                                </div>
                                <Skeleton className="mt-6 h-3 w-24" />
                                <Skeleton className="mt-2 h-10 w-16" />
                            </div>
                        ))}
                    </section>
                ) : hasKpis ? (
                    <section className="space-y-4">
                        <DashboardSectionHeading
                            title="OPERATIONAL PERFORMANCE"
                            description="REAL-TIME CORE METRICS SNAPSHOT."
                        />
                        <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-4 overflow-hidden border border-border">
                            {kpisWithIcons.map((kpi: { label: string; value: string; delta: string; icon: (typeof KPI_ICONS)[number]; }) => (
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

                {/* Secondary Bento: Trends & Volume */}
                <div className="grid gap-8 lg:grid-cols-12">
                    {/* Main Trends Area */}
                    <div className="lg:col-span-8 space-y-4">
                        <DashboardSectionHeading
                            title="ENGAGEMENT DYNAMICS"
                            description="7-DAY TRAJECTORY FOR CORE ACTIVITIES."
                        />
                        {trendCardsData.length ? (
                            <EngagementTrendsChart metrics={trendCardsData} />
                        ) : (
                            <div className="h-[400px] flex items-center justify-center border border-dashed border-border bg-secondary/5">
                                <EmptyState title="No trend data yet" description="Metrics will appear after activity begins." />
                            </div>
                        )}
                    </div>

                    {/* Side Volume Area */}
                    <div className="lg:col-span-4 space-y-4">
                        <DashboardSectionHeading
                            title="WEEKLY VOLUME"
                            description="ACTIVITY THREAD COUNTS."
                        />
                        <div className="rounded-none border border-border bg-card/40 p-6 backdrop-blur-xl h-full flex flex-col justify-between">
                            {volumeBarsData.length ? (
                                <>
                                    <div className="flex-1">
                                        <MiniBars values={volumeBarsData} />
                                    </div>
                                    <div className="mt-8 space-y-3">
                                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Messages</p>
                                            <p className="text-xl font-black font-mono text-foreground">{weeklyTotals.messages}</p>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bookings</p>
                                            <p className="text-xl font-black font-mono text-foreground">{weeklyTotals.bookings}</p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Uploads</p>
                                            <p className="text-xl font-black font-mono text-foreground">{weeklyTotals.uploads}</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <EmptyState title="No weekly volume yet" description="Activity totals will appear once sessions begin." />
                            )}
                        </div>
                    </div>
                </div>

                {/* Third Bento: Distribution & Athletes */}
                <div className="grid gap-8 lg:grid-cols-3 [&>*]:min-w-0">
                    {/* Tier Distribution */}
                    <div className="space-y-4 min-w-0">
                        <DashboardSectionHeading title="TIER STATUS" description="ROSTER SEGMENTATION." />
                        <div className="rounded-none border border-border bg-card/40 p-6 backdrop-blur-xl h-[380px] flex flex-col items-center justify-center text-center overflow-hidden">
                            {tierDistributionData.length ? (
                                <>
                                    <div className="h-48 w-48 shrink-0">
                                        <GreenDoughnutChart
                                            labels={tierDistributionData.map((tier) => tier.label)}
                                            values={tierDistributionData.map((tier) => tier.value)}
                                        />
                                    </div>
                                    <div className="mt-6 flex flex-wrap justify-center gap-4">
                                        {tierDistributionData.map((tier) => (
                                            <div key={tier.label} className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tier.color }} />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-foreground/80">
                                                    {tier.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <EmptyState title="No tier data yet" description="Tier distribution will appear after onboarding." />
                            )}
                        </div>
                    </div>

                    {/* Activity Mix */}
                    <div className="space-y-4 min-w-0">
                        <DashboardSectionHeading title="ACTIVITY MIX" description="SEGMENT RATIOS." />
                        <div className="rounded-none border border-border bg-card/40 p-6 backdrop-blur-xl h-[380px] overflow-hidden">
                            {activityMixData.length ? (
                                <div className="h-full min-h-0 overflow-hidden">
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
                        </div>
                    </div>

                    {/* Top Athletes */}
                    <div className="space-y-4 min-w-0">
                        <DashboardSectionHeading title="ELITE ATHLETES" description="TOP 3 PERFORMERS." />
                        <div className="rounded-none border border-border bg-card/40 p-2 backdrop-blur-xl h-[380px] overflow-y-auto overflow-x-hidden">
                            ...
                        </div>
                    </div>
                </div>
                {/* Fourth Bento: Progress & Momentum */}
                <div className="grid gap-8 lg:grid-cols-2">
                    <div className="space-y-4">
                        <DashboardSectionHeading title="LONG-TERM PROGRESS" description="ENGAGEMENT TREND OVER TIME." />
                        <div className="rounded-none border border-border bg-card/40 p-6 backdrop-blur-xl h-[320px]">
                            {weeklyProgressData.length ? (
                                <div className="h-full">
                                    <GreenLineChart labels={weeklyLabels} values={weeklyProgressData} />
                                </div>
                            ) : (
                                <EmptyState title="No data yet" description="Trends will show once activity starts." />
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <DashboardSectionHeading title="SYSTEM MOMENTUM" description="IMPROVEMENT KPIS." />
                        <div className="rounded-none border border-border bg-card/40 p-8 backdrop-blur-xl h-[320px] flex flex-col justify-between">
                            {(["Retention", "Response Time", "Plan Completion"] as const).map((metric, i) => (
                                <div key={metric} className="group">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80">{metric}</p>
                                        <p className="text-xs font-black font-mono text-primary">+6%</p>
                                    </div>
                                    <div className="h-1 w-full bg-secondary/30 rounded-none overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-1000 ease-out group-hover:bg-primary/80"
                                            style={{ width: `${[78, 62, 71][i]}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Bento: Operations & Bookings */}
                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <DashboardSectionHeading title="BOOKINGS TODAY" description="DAILY OPS SCHEDULE." />
                            <button
                                onClick={() => setShowCalendar((prev) => !prev)}
                                className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors"
                            >
                                {showCalendar ? "Close Grid" : "Open Grid"}
                            </button>
                        </div>
                        <div className="rounded-none border border-border bg-card/40 backdrop-blur-xl p-4 min-h-[300px]">
                            {isLoading ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton key={i} className="h-16 w-full rounded-none" />
                                    ))}
                                </div>
                            ) : hasBookings ? (
                                <div className="space-y-3">
                                    {todayBookings.map((booking, index) => (
                                        <BookingTodayRow
                                            key={index}
                                            name={booking.name}
                                            athlete={booking.athlete}
                                            time={booking.time}
                                            type={booking.type}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState title="No bookings" description="Open availability to start." />
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <DashboardSectionHeading title="SYSTEM OPS" description="CONTENT & UPDATES." />
                        <div className="rounded-none border border-border bg-card/40 backdrop-blur-xl p-6 min-h-[300px] flex flex-col gap-4">
                            {programOpsData.length ? (
                                programOpsData.map((item) => (
                                    <div key={item.title} className="group border-l-2 border-primary/20 bg-secondary/10 p-4 transition-all hover:border-primary hover:bg-primary/5">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                                        <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed">{item.detail}</p>
                                    </div>
                                ))
                            ) : (
                                <EmptyState title="No updates" description="Updates will appear here." />
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal: Admin Story & Testimonials (Moved to bottom of primary view) */}
                <section className="space-y-3 border-t border-border pt-10">
                    <DashboardSectionHeading title="COACH PROFILE" description="ASSETS PREVIEW." />
                    <div className="flex flex-col md:flex-row gap-px bg-border border border-border overflow-hidden max-w-4xl">
                        <div className="bg-card/40 backdrop-blur-xl flex items-center justify-center p-4 border-r border-border/50 shrink-0">
                            {professionalPhoto ? (
                                <img
                                    src={professionalPhoto}
                                    alt=""
                                    className="h-16 aspect-[9/16] object-cover grayscale transition-all hover:grayscale-0 duration-700 shadow-lg border border-border/20"
                                />
                            ) : (
                                <div className="h-16 aspect-[9/16] flex items-center justify-center text-[5px] font-black uppercase tracking-widest text-muted-foreground bg-secondary/10">No Photo</div>
                            )}
                        </div>
                        <div className="flex-1 bg-card/40 backdrop-blur-xl px-6 py-5 flex flex-col justify-center">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5">Biography & Assets</p>
                                <p className="text-[11px] text-muted-foreground/80 leading-relaxed font-medium">
                                    {trimText(homeSnapshot.adminStory || homeSnapshot.description || homeSnapshot.welcome, 400) || "No story added yet."}
                                </p>
                            </div>
                            <div className="mt-5 flex items-center gap-4">
                                <div className="h-px flex-1 bg-border/20" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">
                                    {testimonialsPreview || "0 Testimonials"}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Highlights Strip */}
                <section className="space-y-4">
                    <DashboardSectionHeading title="ELITE HIGHLIGHTS" description="NOTABLE MILESTONES." />
                    <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-4 overflow-hidden border border-border">
                        {highlightsData.length ? (
                            highlightsData.map((item: { label: string; value: string; detail: string; }) => (
                                <HighlightTile key={item.label} label={item.label} value={item.value} detail={item.detail} />
                            ))
                        ) : (
                            <div className="col-span-full bg-card/40 p-8 backdrop-blur-xl text-center">
                                <EmptyState title="No highlights" description="Weekly wins will appear here." />
                            </div>
                        )}
                    </div>
                </section>

                {/* Beta Testers */}
                {(betaStats?.count ?? 0) > 0 && (
                    <section
                        className="cursor-pointer group"
                        onClick={() => router.push("/beta-testers")}
                    >
                        <div className="rounded-none border border-border bg-card/40 backdrop-blur-xl p-6 flex items-center gap-4 hover:border-primary/30 transition-colors">
                            <div className="h-10 w-10 flex items-center justify-center bg-primary/10 text-primary">
                                <FlaskConical className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Beta Testers</p>
                                <p className="text-2xl font-black font-mono text-foreground">{betaStats?.count ?? 0}</p>
                            </div>
                            <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">View all &rarr;</p>
                        </div>
                    </section>
                )}

                <CalendarPanel
                    visible={showCalendar}
                    bookings={Array.isArray(dashboardData?.bookingsToday) ? dashboardData.bookingsToday : []}
                    isLoading={isLoading}
                    onOpenSlots={() => setActiveDialog("slots")}
                />
            </div>

            <ActionDialogs active={activeDialog} onClose={() => setActiveDialog(null)} />
        </AdminShell>
    );
}
