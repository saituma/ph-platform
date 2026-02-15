"use client";

import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Home,
  MessageCircle,
  Settings,
  UserRound,
  BarChart3,
} from "lucide-react";

import { ParentNav } from "./nav";
import { cn } from "../../lib/utils";

const navItems = [
  { label: "Dashboard", href: "/parent", icon: Home },
  { label: "Onboarding", href: "/parent/onboarding", icon: ClipboardCheck, badge: "2" },
  { label: "Athlete Profile", href: "/parent/athlete", icon: UserRound },
  { label: "Messages", href: "/parent/messages", icon: MessageCircle, badge: "3" },
  { label: "Schedule", href: "/parent/schedule", icon: CalendarDays },
  { label: "Progress", href: "/parent/progress", icon: BarChart3 },
  { label: "Billing", href: "/parent/billing", icon: CreditCard },
  { label: "Settings", href: "/parent/settings", icon: Settings },
];

type SidebarContentProps = {
  currentPath: string;
  collapsed?: boolean;
};

export function ParentSidebarContent({
  currentPath,
  collapsed = false,
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className={cn("px-2", collapsed ? "text-center" : undefined)}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            PH
          </div>
          {collapsed ? null : (
            <p className="text-xl font-bold tracking-tight text-foreground">
              PERFORMANCE
            </p>
          )}
        </div>
        {collapsed ? null : (
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Parent Portal
          </p>
        )}
      </div>
      <ParentNav items={navItems} currentPath={currentPath} collapsed={collapsed} />
      {!collapsed ? (
        <div className="mt-auto rounded-3xl border border-border bg-secondary/40 p-4 text-xs text-muted-foreground">
          Need help? Visit the Support Center or message your coach for fast guidance.
        </div>
      ) : null}
    </div>
  );
}

type ParentSidebarProps = {
  collapsed?: boolean;
};

export function ParentSidebar({ collapsed = false }: ParentSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden flex-col border-r border-border bg-card px-6 py-8 transition-all lg:flex lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto",
        collapsed ? "w-20 px-3" : "w-72"
      )}
    >
      <ParentSidebarContent currentPath={pathname} collapsed={collapsed} />
    </aside>
  );
}
