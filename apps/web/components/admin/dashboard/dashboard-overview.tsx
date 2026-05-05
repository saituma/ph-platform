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

import { Badge } from "@/components/ui/badge";
import { RechartSparkline } from "@/components/admin/recharts";

export function DashboardSectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="h-4 w-1 rounded-full bg-primary" />
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/90">{title}</h2>
      </div>
      {description ? <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-3">{description}</p> : null}
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
    <div className="group relative overflow-hidden rounded-none border border-border bg-card/40 p-6 backdrop-blur-xl transition-all duration-500 hover:border-primary/40">
      {/* Subtle scanline effect on hover */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_0%,var(--color-primary)/2%_50%,transparent_100%)] translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000 ease-in-out" />
      
      {/* Inner Glow/Border */}
      <div className="absolute inset-px pointer-events-none rounded-[inherit] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]" />

      <div className="relative flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-none border border-border bg-secondary/30 transition-all duration-300 group-hover:border-primary/30 group-hover:bg-primary/10">
          <Icon className="h-5 w-5 text-muted-foreground transition-colors duration-300 group-hover:text-primary" aria-hidden />
        </div>
        <Badge variant="outline" className="rounded-none border-primary/20 bg-primary/5 text-[9px] font-black uppercase tracking-widest text-primary px-2 py-0.5">
          {delta}
        </Badge>
      </div>

      <div className="relative mt-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground transition-colors duration-300 group-hover:text-foreground/70">
          {label}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-4xl font-black tabular-nums tracking-tighter text-foreground">
            {value}
          </p>
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
      
      {/* Corner Accent */}
      <div className="absolute top-0 right-0 h-8 w-8 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 h-px w-4 bg-primary/40 translate-x-4 group-hover:translate-x-0 transition-transform duration-500" />
        <div className="absolute top-0 right-0 h-4 w-px bg-primary/40 -translate-y-4 group-hover:translate-y-0 transition-transform duration-500" />
      </div>
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
