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
} from "lucide-react";

import { Badge } from "../../ui/badge";
import { RechartSparkline } from "../recharts";

export function DashboardPulseStrip() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.07] px-4 py-3.5 dark:border-primary/25 dark:bg-primary/10">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/45 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
      <p className="min-w-0 text-sm leading-snug">
        <span className="font-semibold text-foreground">Live workspace</span>
        <span className="text-muted-foreground">
          {" "}
          · numbers update as athletes book, message, and train
        </span>
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
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Jump to</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/40 hover:bg-secondary/70 dark:shadow-black/10"
          >
            <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {label}
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DashboardSectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border/80 pb-3">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
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
    <div className="group relative overflow-hidden rounded-2xl border border-border/90 bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md dark:shadow-black/20">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/[0.08] transition duration-300 group-hover:bg-primary/[0.12]"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary dark:bg-primary/20">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <Badge variant="accent" className="shrink-0 text-[10px] uppercase tracking-wider">
          {delta}
        </Badge>
      </div>
      <p className="relative mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="relative mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
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
    <div className="group relative overflow-hidden rounded-2xl border border-border/90 bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md dark:shadow-black/20">
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-primary/70 opacity-80 group-hover:opacity-100" aria-hidden />
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
          </div>
          <Badge variant="accent" className="shrink-0 text-[10px] uppercase tracking-wider">
            Live
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{change}</p>
        <div className="mt-4 rounded-xl bg-secondary/40 px-2 py-1 dark:bg-secondary/25">
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
  tierVariant: "primary" | "default";
}) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/90 bg-secondary/25 px-3 py-3 text-sm transition hover:border-primary/35 dark:bg-secondary/15">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold tabular-nums text-primary">
        {rank}
      </span>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-muted-foreground">
        {initials || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{score}</p>
      </div>
      <Badge variant={tierVariant} className="shrink-0">
        {tier}
      </Badge>
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
    <div className="flex gap-3 rounded-2xl border border-border/90 bg-secondary/20 p-1.5 transition hover:border-primary/35 dark:bg-secondary/10">
      <div className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-xl bg-primary/12 py-2 text-center dark:bg-primary/18">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Time</span>
        <span className="text-sm font-bold tabular-nums leading-tight text-primary">{time}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2 pr-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{athlete}</p>
        </div>
        <p className="shrink-0 text-right text-xs font-medium text-muted-foreground">{type}</p>
      </div>
    </div>
  );
}

export function HighlightTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/90 bg-gradient-to-b from-card to-secondary/20 p-5 shadow-sm transition hover:border-primary/30 dark:to-secondary/10">
      <Crown className="absolute -right-1 -top-1 h-16 w-16 text-primary/[0.07]" aria-hidden />
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}
