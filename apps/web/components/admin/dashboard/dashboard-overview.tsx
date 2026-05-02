"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ChevronRight,
  LayoutGrid,
  MessageSquare,
  Users,
  Crown,
  Sparkles,
} from "lucide-react";

import { Badge } from "../../ui/badge";
import { RechartSparkline } from "../recharts";

export function DashboardPulseStrip() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] px-5 py-3 backdrop-blur-sm">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
      <p className="min-w-0 text-xs font-medium tracking-wide">
        <span className="font-semibold text-foreground">System Active</span>
        <span className="text-muted-foreground"> — Real-time updates enabled</span>
      </p>
    </div>
  );
}

const QUICK_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/users", label: "Athletes", icon: Users },
  { href: "/messaging", label: "Messages", icon: MessageSquare },
  { href: "/programs", label: "Programs", icon: LayoutGrid },
];

export function DashboardQuickLinks() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Access</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group inline-flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
          >
            <Icon className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:scale-110" aria-hidden />
            {label}
            <ChevronRight className="h-3 w-3 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DashboardSectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary to-primary/40" />
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}

type KpiStatTileProps = {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
};

export function KpiStatTile({ label, value, delta, icon: Icon }: KpiStatTileProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary/15">
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </div>
        <Badge variant="outline" className="border-primary/20 text-[10px] font-medium text-primary">
          {delta}
        </Badge>
      </div>
      <p className="relative mt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="relative mt-1.5 text-3xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
    </div>
  );
}

type TrendInsightCardProps = {
  title: string;
  value: string;
  change: string;
  series: number[];
};

export function TrendInsightCard({ title, value, change, series }: TrendInsightCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
          </div>
          <Badge variant="outline" className="border-primary/20 text-[10px] font-medium text-primary">
            Live
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{change}</p>
        <div className="mt-4 border-t border-border/50 pt-4">
          <RechartSparkline values={series} />
        </div>
      </div>
    </div>
  );
}

export function TopAthleteRow({
  rank,
  name,
  score,
  tier,
  tierVariant,
}: {
  rank: number;
  name: string;
  score: string;
  tier: string;
  tierVariant: "secondary" | "default";
}) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/10 px-4 py-3 transition-all duration-200 hover:border-primary/30 hover:bg-primary/[0.03]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold tabular-nums text-primary">
        {String(rank).padStart(2, "0")}
      </span>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-[11px] font-semibold text-primary">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        {score && (
          <p className="text-xs text-muted-foreground">
            Score: <span className="font-medium text-primary">{score}</span>
          </p>
        )}
      </div>
      <Badge variant={tierVariant} className="text-[10px]">{tier}</Badge>
    </div>
  );
}

export function BookingTodayRow({
  name,
  athlete,
  time,
  type,
}: {
  name: string;
  athlete: string;
  time: string;
  type: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-secondary/10 px-4 py-3 transition-all duration-200 hover:border-primary/30">
      <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 px-3 py-2 text-center">
        <span className="text-[9px] font-medium uppercase text-muted-foreground">Time</span>
        <span className="text-sm font-bold tabular-nums text-primary">{time}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{athlete}</p>
      </div>
      <Badge variant="outline" className="shrink-0 text-[10px]">{type}</Badge>
    </div>
  );
}

export function HighlightTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <div className="absolute -right-3 -bottom-3 opacity-[0.04] transition-opacity group-hover:opacity-[0.08]">
        <Crown className="h-20 w-20 text-primary" aria-hidden />
      </div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}
