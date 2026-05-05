"use client";

import Link from "next/link";
import { Sparkles, ChevronRight, type LucideIcon, CalendarDays, Users, MessageSquare, LayoutGrid } from "lucide-react";

export function SystemStatusPulse() {
  return (
    <div className="flex items-center gap-4 rounded-none border border-primary/20 bg-primary/[0.03] px-5 py-3 backdrop-blur-md">
      <div className="relative flex h-2 w-2">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/40 opacity-75" />
        <div className="relative h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">System Engine Active</span>
        <div className="h-3 w-px bg-primary/20" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Ready for Ops</span>
      </div>
    </div>
  );
}

const QUICK_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/bookings", label: "Schedule", icon: CalendarDays },
  { href: "/users", label: "Athletes", icon: Users },
  { href: "/messaging", label: "Comms", icon: MessageSquare },
  { href: "/programs", label: "Content", icon: LayoutGrid },
];

export function QuickAccessLinks() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Command Center</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group relative flex items-center gap-3 overflow-hidden rounded-none border border-border bg-card/50 px-5 py-3 transition-all duration-300 hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-primary/5 to-transparent group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-300 group-hover:scale-110 group-hover:text-primary" aria-hidden />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80 group-hover:text-foreground">
              {label}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/30 transition-transform group-hover:translate-x-1 group-hover:text-primary/50" />
          </Link>
        ))}
      </div>
    </div>
  );
}
