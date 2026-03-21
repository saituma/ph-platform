"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  ClipboardList,
  Dumbbell,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

const QUICK_ACTIONS = [
  {
    href: "/exercise-library",
    label: "Training content",
    hint: "Build & assign exercises",
    icon: Dumbbell,
  },
  {
    href: "/programs",
    label: "Programs",
    hint: "Plans & structure",
    icon: BookOpen,
  },
  {
    href: "/users",
    label: "Users & tiers",
    hint: "Guardians & billing",
    icon: Users,
  },
  {
    href: "/messaging",
    label: "Messaging",
    hint: "Coach families directly",
    icon: MessageCircle,
  },
] as const;

export function ClientTrainingPremiumBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.09] via-card to-card p-5 shadow-sm dark:from-primary/15 dark:via-card">
      <Sparkles className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 text-primary/[0.12]" aria-hidden />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl space-y-2">
          <Badge variant="accent" className="text-[10px] uppercase tracking-wider">
            Performance Hub · Coach
          </Badge>
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Your full-control training workspace
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This portal is for <span className="font-medium text-foreground">premium coaches</span>: assign your own
            training from the library, watch section progress and Premium plan check-offs, and open any guardian
            profile to message families, tweak programs, and keep every athlete on track.
          </p>
        </div>
      </div>
      <div className="relative mt-5 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(({ href, label, hint, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-w-[140px] flex-1 items-center gap-3 rounded-xl border border-border/90 bg-card/90 px-3 py-2.5 text-left shadow-sm transition hover:border-primary/40 hover:bg-secondary/50 sm:max-w-[200px] dark:bg-card/50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                {label}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" aria-hidden />
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ClientTrainingSummaryStrip({
  totalAthletes,
  premiumTierCount,
  sectionCompletions30dSum,
}: {
  totalAthletes: number;
  premiumTierCount: number;
  sectionCompletions30dSum: number;
}) {
  const tiles = [
    { label: "Athletes on roster", value: String(totalAthletes), icon: ClipboardList },
    { label: "Premium tier clients", value: String(premiumTierCount), icon: Sparkles },
    { label: "Section finishes (30d)", value: String(sectionCompletions30dSum), icon: BookOpen },
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {tiles.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-2xl border border-border/90 bg-secondary/25 px-4 py-3 dark:bg-secondary/15"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PremiumExerciseProgress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs tabular-nums text-muted-foreground">
        <span>
          {done}/{total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/70 dark:bg-secondary/40">
        <div
          className={cn("h-full rounded-full bg-primary transition-all", pct === 0 && "opacity-40")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function tierBadgeProps(programTier: string | null | undefined): {
  label: string;
  variant: "primary" | "accent" | "default";
} {
  const t = programTier ?? "";
  if (t.includes("Premium")) return { label: "Premium", variant: "primary" };
  if (t.includes("Plus")) return { label: "Plus", variant: "accent" };
  return { label: "Program", variant: "default" };
}
