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
    <div className="flex flex-wrap items-center gap-3 rounded-none border border-primary/20 bg-primary/[0.07] px-4 py-2.5 dark:border-primary/25 dark:bg-primary/10">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/45 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-none bg-primary" />
      </span>
      <p className="min-w-0 text-[10px] font-mono uppercase tracking-widest leading-none">
        <span className="font-black text-foreground">SYSTEM LIVE</span>
        <span className="text-muted-foreground">
          {" "}
          · REAL-TIME WORKSPACE UPDATES ACTIVE
        </span>
      </p>
    </div>
  );
}

const QUICK_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/bookings", label: "BOOKINGS", icon: CalendarDays },
  { href: "/users", label: "ATHLETES", icon: Users },
  { href: "/messaging", label: "MESSAGES", icon: MessageSquare },
  { href: "/programs", label: "PROGRAMS", icon: LayoutGrid },
];

export function DashboardQuickLinks() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">SYSTEM SHORTCUTS</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group inline-flex items-center gap-3 rounded-none border border-border bg-card px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground shadow-none transition hover:border-primary hover:bg-primary/10"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DashboardSectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-l-2 border-primary pl-4 py-1">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground leading-none">{title}</h2>
      {description ? <p className="mt-1 text-[10px] font-mono text-muted-foreground uppercase">{description}</p> : null}
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
    <div className="group relative overflow-hidden rounded-none border border-border bg-card p-5 transition duration-200 hover:border-primary">
      <div className="relative flex items-start justify-between gap-3">
        <div className="rounded-none bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="text-[9px] font-mono font-bold text-primary uppercase tracking-tighter">
          {delta} // ACTIVE
        </div>
      </div>
      <p className="relative mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground leading-none">
        {label}
      </p>
      <p className="relative mt-2 text-4xl font-black font-mono tabular-nums tracking-tighter text-foreground">{value}</p>
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
    <div className="group relative overflow-hidden rounded-none border border-border bg-card transition duration-200 hover:border-primary">
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground leading-none">{title}</p>
            <p className="mt-2 text-3xl font-black font-mono tabular-nums tracking-tighter text-foreground">{value}</p>
          </div>
          <Badge variant="outline" className="rounded-none border-primary/30 text-primary text-[9px] font-mono">
            LIVE_DATA
          </Badge>
        </div>
        <p className="mt-2 text-[10px] font-mono text-muted-foreground uppercase">{change}</p>
        <div className="mt-4 border-t border-border pt-4">
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
    <div className="flex items-center gap-4 rounded-none border border-border bg-secondary/20 px-4 py-3 transition hover:border-primary/50">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none border border-border bg-background text-[10px] font-black font-mono tabular-nums text-primary">
        {String(rank).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black uppercase tracking-tight text-foreground">{name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] font-mono text-muted-foreground uppercase">SCORE:</span>
          <span className="text-[9px] font-mono font-bold text-primary">{score}</span>
        </div>
      </div>
      <Badge variant={tierVariant} className="rounded-none text-[9px] font-black uppercase tracking-tighter">
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
    <div className="flex gap-4 rounded-none border border-border bg-secondary/10 p-2 transition hover:border-primary/50">
      <div className="flex w-16 shrink-0 flex-col items-center justify-center border border-border bg-background py-2 text-center">
        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">TIME</span>
        <span className="text-xs font-black font-mono leading-tight text-primary">{time}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-tight text-foreground">{name}</p>
          <p className="truncate text-[10px] font-bold text-muted-foreground uppercase">{athlete}</p>
        </div>
        <p className="shrink-0 text-right text-[9px] font-mono font-bold text-primary uppercase border border-primary/20 px-1.5 py-0.5">{type}</p>
      </div>
    </div>
  );
}

export function HighlightTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="relative overflow-hidden rounded-none border border-border bg-card p-5 transition hover:border-primary">
      <Crown className="absolute -right-2 -bottom-2 h-16 w-16 text-primary/[0.05]" aria-hidden />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground leading-none">{label}</p>
      <p className="mt-3 text-3xl font-black font-mono tabular-nums tracking-tighter text-foreground">{value}</p>
      <p className="mt-2 text-[10px] font-mono leading-relaxed text-muted-foreground uppercase">{detail}</p>
    </div>
  );
}
