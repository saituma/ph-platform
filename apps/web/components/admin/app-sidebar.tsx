"use client";

import React, { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Gift,
  Images,
  Inbox,
  LayoutDashboard,
  Library,
  LifeBuoy,
  MessageCircle,
  PlaySquare,
  Quote,
  Settings,
  SlidersHorizontal,
  Stethoscope,
  UserCircle,
  Users,
  Video,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { useGetThreadsQuery, useGetUsersQuery, useGetVideoUploadsQuery, useGetAdminProfileQuery } from "@/lib/apiSlice";
import { getOrCreateAdminSocket } from "@/lib/admin-socket";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeKey = "messages" | "videos";

type NavChild = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: BadgeKey;
};

type NavGroup = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: NavChild[];
};

type NavFlat = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavEntry = NavFlat | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV: NavEntry[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },

  {
    label: "People",
    icon: Users,
    children: [
      { label: "Users & Tiers",  href: "/users",     icon: Users },
      { label: "Teams",          href: "/teams",     icon: Users },
      { label: "Parents",        href: "/parents",   icon: Library },
      { label: "User Referrals", href: "/referrals", icon: Gift },
    ],
  },

  {
    label: "Training",
    icon: BookOpen,
    children: [
      { label: "Programs",           href: "/programs",                icon: BookOpen },
      { label: "Exercise Library",  href: "/programs/exercises",      icon: Dumbbell },
      { label: "Module Library",    href: "/programs/modules",        icon: Library },
      { label: "Training Content",  href: "/exercise-library",        icon: ClipboardList },
      { label: "Client Training",   href: "/training-snapshot",       icon: ClipboardList },
      { label: "Questionnaires",    href: "/training-questionnaires", icon: ClipboardCheck },
      { label: "Tracking",          href: "/tracking",                icon: Activity },
    ],
  },

  {
    label: "Content",
    icon: Images,
    children: [
      { label: "Profile",     href: "/content/profile",       icon: UserCircle },
      { label: "Testimonials",href: "/content/testimonials",  icon: Quote },
      { label: "Intro Video", href: "/content/intro-video",   icon: Video },
      { label: "Gallery",     href: "/gallery",               icon: Images },
    ],
  },

  {
    label: "Communication",
    icon: MessageCircle,
    children: [
      { label: "Messaging",      href: "/messaging",    icon: MessageCircle, badgeKey: "messages" as BadgeKey },
      { label: "Video Feedback", href: "/video-review", icon: PlaySquare,    badgeKey: "videos"   as BadgeKey },
    ],
  },

  {
    label: "Health & Schedule",
    icon: CalendarDays,
    children: [
      { label: "Bookings",    href: "/bookings",          icon: CalendarDays },
      { label: "Sessions",    href: "/session-schedule",  icon: ClipboardCheck },
      { label: "Nutrition",   href: "/nutrition",         icon: ClipboardCheck },
      { label: "Referrals",   href: "/physio-referrals",  icon: Stethoscope },
    ],
  },

  {
    label: "Business",
    icon: CreditCard,
    children: [
      { label: "Enquiries",     href: "/enquiries",    icon: Inbox },
      { label: "Billing",       href: "/billing",      icon: CreditCard },
      { label: "Stats",         href: "/stats",        icon: Activity },
      { label: "Portal Config", href: "/portal-config",icon: SlidersHorizontal },
    ],
  },

  { label: "Support",  href: "/support",  icon: LifeBuoy },
  { label: "Settings", href: "/settings", icon: Settings },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pathMatches(pathOnly: string, href: string) {
  if (href === "/") return pathOnly === "/";
  return pathOnly === href || pathOnly.startsWith(`${href}/`);
}

function groupHasActive(children: NavChild[], pathOnly: string) {
  return children.some((c) => pathMatches(pathOnly, c.href));
}

type SidebarUser        = { id: number; role?: string | null };
type SidebarThread      = { userId: number; unread?: number | null };
type SidebarVideoUpload = { reviewedAt?: string | null };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

// ─── Collapsible group item ───────────────────────────────────────────────────

function NavGroupItem({
  entry,
  pathOnly,
  isMounted,
  badges,
  collapsed,
}: {
  entry: NavGroup;
  pathOnly: string;
  isMounted: boolean;
  badges: Record<BadgeKey, number>;
  collapsed: boolean;
}) {
  const hasActive = groupHasActive(entry.children, pathOnly);
  const [open, setOpen] = React.useState(hasActive);

  const groupBadge = entry.children.reduce(
    (sum, c) => (c.badgeKey ? sum + (badges[c.badgeKey] ?? 0) : sum),
    0
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={isMounted ? entry.label : undefined}
          isActive={hasActive}
          className="w-full"
          onClick={() => setOpen((v) => !v)}
        >
          <entry.icon />
          <span>{entry.label}</span>
          <ChevronRight
            className={cn(
              "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-90"
            )}
          />
        </SidebarMenuButton>

        {collapsed && groupBadge > 0 && (
          <SidebarMenuBadge>{groupBadge}</SidebarMenuBadge>
        )}

        <CollapsibleContent>
          <SidebarMenuSub>
            {entry.children.map((child) => {
              const isActive = pathMatches(pathOnly, child.href);
              const badgeCount = child.badgeKey ? (badges[child.badgeKey] ?? 0) : 0;
              return (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton asChild isActive={isActive}>
                    <Link href={child.href}>
                      <child.icon className="h-3.5 w-3.5" />
                      <span>{child.label}</span>
                      {badgeCount > 0 && (
                        <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black leading-none text-primary-foreground">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

// ─── User footer ──────────────────────────────────────────────────────────────

function UserFooter() {
  const { data } = useGetAdminProfileQuery();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const displayName = data?.user?.name || "Admin";
  const profilePicture = data?.user?.profilePicture ?? null;
  const initials = (() => {
    const parts = displayName.split(" ").filter(Boolean);
    if (!parts.length) return "AD";
    return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""}`.toUpperCase() || "AD";
  })();

  return (
    <SidebarFooter className="border-t border-sidebar-border p-3">
      <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-none border border-sidebar-border bg-sidebar-accent text-xs font-black text-sidebar-foreground">
          {profilePicture
            ? <img src={profilePicture} alt={displayName} className="h-full w-full object-cover" />
            : initials}
          <span className="absolute bottom-0 right-0 h-1.5 w-1.5 bg-primary" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-sidebar-foreground">{displayName}</p>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Coach</p>
          </div>
        )}
        {!collapsed && <ThemeToggle />}
      </div>
    </SidebarFooter>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname = usePathname();
  const pathOnly = pathname.split("?")[0] ?? pathname;
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const { data: threadsData, refetch: refetchThreads } = useGetThreadsQuery();
  const { data: usersData }                            = useGetUsersQuery();
  const { data: videosData, refetch: refetchVideos }   = useGetVideoUploadsQuery();

  const refetchThreadsRef = useRef(refetchThreads);
  const refetchVideosRef  = useRef(refetchVideos);
  useEffect(() => { refetchThreadsRef.current = refetchThreads; }, [refetchThreads]);
  useEffect(() => { refetchVideosRef.current  = refetchVideos;  }, [refetchVideos]);

  useEffect(() => {
    const socket = getOrCreateAdminSocket();
    const handleAll = () => { refetchVideosRef.current(); refetchThreadsRef.current(); };
    socket.on("video:new",     handleAll);
    socket.on("video:reviewed",handleAll);
    socket.on("message:new",   () => refetchThreadsRef.current());
    return () => {
      socket.off("video:new",      handleAll);
      socket.off("video:reviewed", handleAll);
      socket.off("message:new");
    };
  }, []);

  const guardianIds = new Set(
    ((usersData as { users?: SidebarUser[] } | undefined)?.users ?? [])
      .filter((u) => u?.role === "guardian").map((u) => Number(u.id)).filter(Number.isFinite)
  );

  const unreadMessages = ((threadsData as { threads?: SidebarThread[] } | undefined)?.threads ?? []).reduce((sum, t) => {
    if (!isRecord(t)) return sum;
    const uid = Number(t.userId);
    if (!Number.isFinite(uid)) return sum;
    if (guardianIds.size > 0 && !guardianIds.has(uid)) return sum;
    return sum + Number(t.unread ?? 0);
  }, 0);

  const pendingVideos = ((videosData as { items?: SidebarVideoUpload[] } | undefined)?.items ?? [])
    .filter((i) => isRecord(i) && !i.reviewedAt).length;

  const badges: Record<BadgeKey, number> = { messages: unreadMessages, videos: pendingVideos };

  return (
    <Sidebar collapsible="icon">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <img
            src="/ph.jpg"
            alt="PH Performance"
            className="h-8 w-8 shrink-0 rounded-none object-cover ring-1 ring-sidebar-border"
          />
          <div className="group-data-[collapsible=icon]:hidden border-l border-sidebar-border pl-3">
            <p className="text-sm font-black uppercase tracking-tighter text-sidebar-foreground leading-none">Performance</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Operations Hub</p>
          </div>
        </Link>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent className="py-2">
        <SidebarMenu>
          {NAV.map((entry) => {
            if (!isGroup(entry)) {
              // Flat item
              const isActive = pathMatches(pathOnly, entry.href);
              return (
                <SidebarMenuItem key={entry.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={isMounted ? entry.label : undefined}
                  >
                    <Link href={entry.href}>
                      <entry.icon />
                      <span>{entry.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }

            // Collapsible group
            return (
              <NavGroupItem
                key={entry.label}
                entry={entry}
                pathOnly={pathOnly}
                isMounted={isMounted}
                badges={badges}
                collapsed={collapsed}
              />
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <UserFooter />
      <SidebarRail />
    </Sidebar>
  );
}
