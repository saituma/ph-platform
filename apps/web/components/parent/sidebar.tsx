"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Home,
  LifeBuoy,
  MessageCircle,
  Settings,
  UserRound,
} from "lucide-react";

import { ParentNav, type NavGroup } from "./nav";
import { cn } from "../../lib/utils";
import { ScrollArea } from "../ui/scroll-area";

const navGroups: NavGroup[] = [
  {
    id: "home",
    items: [
      { label: "Dashboard", href: "/parent", icon: Home },
    ],
  },
  {
    id: "athlete",
    label: "Athlete",
    items: [
      { label: "Onboarding", href: "/parent/onboarding", icon: ClipboardCheck, badge: "2" },
      { label: "Athlete Profile", href: "/parent/athlete", icon: UserRound },
      { label: "Progress", href: "/parent/progress", icon: BarChart3 },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    items: [
      { label: "Messages", href: "/parent/messages", icon: MessageCircle, badge: "3" },
      { label: "Schedule", href: "/parent/schedule", icon: CalendarDays },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { label: "Support", href: "/parent/support", icon: LifeBuoy },
      { label: "Settings", href: "/parent/settings", icon: Settings },
    ],
  },
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
          <img src="/ph.jpg" alt="PH Performance" className="h-8 w-8 rounded-lg object-cover" />
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
      <ParentNav groups={navGroups} currentPath={currentPath} collapsed={collapsed} />
      {!collapsed ? (
        <div className="mt-auto rounded-3xl border border-border bg-secondary/40 p-4 text-xs text-muted-foreground">
          Need help?{" "}
          <Link href="/parent/support" className="font-medium text-foreground underline-offset-4 hover:underline">
            Support & feedback
          </Link>{" "}
          or message your coach.
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
        "hidden flex-col border-r border-border bg-card transition-all lg:flex lg:sticky lg:top-0 lg:h-screen",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <ScrollArea className="h-full">
        <div className={cn("h-full py-8", collapsed ? "px-3" : "px-6")}>
          <ParentSidebarContent currentPath={pathname} collapsed={collapsed} />
        </div>
      </ScrollArea>
    </aside>
  );
}
