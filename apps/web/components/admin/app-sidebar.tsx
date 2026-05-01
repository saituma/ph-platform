"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import {
  Activity,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Images,
  LayoutDashboard,
  Library,
  LifeBuoy,
  MessageCircle,
  PlaySquare,
  Settings,
  SlidersHorizontal,
  Stethoscope,
  UserCircle,
  UserPlus,
  Users,
  Video,
  Quote,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { useGetThreadsQuery, useGetUsersQuery, useGetVideoUploadsQuery, useGetAdminProfileQuery } from "../../lib/apiSlice";
import { ThemeToggle } from "./theme-toggle";

// Module-level singleton — persists across page navigations so we never
// disconnect/reconnect the WebSocket just because a page remounted.
let _socket: Socket | null = null;
function getOrCreateSocket(): Socket {
  if (_socket?.connected) return _socket;
  const socketEnvUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
  const apiEnvUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const fallback =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : "";
  const socketUrl = socketEnvUrl
    ? socketEnvUrl.replace(/\/api\/?$/, "")
    : isLocal
      ? fallback
      : apiEnvUrl
        ? apiEnvUrl.replace(/\/api\/?$/, "")
        : fallback;
  const token =
    typeof document !== "undefined"
      ? (document.cookie
          .split(";")
          .map((p) => p.trim())
          .find((p) => p.startsWith("accessTokenClient="))
          ?.slice("accessTokenClient=".length) ?? "")
      : "";
  _socket = io(socketUrl, {
    auth: token ? { token } : undefined,
    transports: ["websocket", "polling"],
    reconnection: true,
  });
  return _socket;
}

type SidebarUser = { id: number; role?: string | null };
type SidebarThread = { userId: number; unread?: number | null };
type SidebarVideoUpload = { reviewedAt?: string | null };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pathMatches(pathOnly: string, href: string) {
  if (href === "/users") return /^\/users\/?$/.test(pathOnly);
  return pathOnly === href || (href !== "/" && pathOnly.startsWith(`${href}/`));
}

/** separator: true means render a visual divider before this group */
const NAV: Array<{ label: string; separator?: boolean; items: Array<{ label: string; href: string; icon: React.ComponentType<{ className?: string }>; badgeKey?: "messages" | "videos" }> }> = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Athletes & Teams",
    separator: true,
    items: [
      { label: "Users & Tiers", href: "/users", icon: Users },
      { label: "Add User", href: "/users/add", icon: UserPlus },
      { label: "Add Team", href: "/users/add-team", icon: Users },
      { label: "Teams", href: "/teams", icon: Users },
    ],
  },
  {
    label: "Programs & Training",
    items: [
      { label: "Programs", href: "/programs", icon: BookOpen },
      { label: "Client Training", href: "/training-snapshot", icon: ClipboardList },
      { label: "Training Answers", href: "/training-questionnaires", icon: ClipboardCheck },
      { label: "Tracking", href: "/tracking", icon: Activity },
    ],
  },
  {
    label: "Content",
    separator: true,
    items: [
      { label: "Profile", href: "/content/profile", icon: UserCircle },
      { label: "Testimonials", href: "/content/testimonials", icon: Quote },
      { label: "Intro Video", href: "/content/intro-video", icon: Video },
      { label: "Gallery", href: "/gallery", icon: Images },
      { label: "Training Content", href: "/exercise-library", icon: BadgeCheck },
      { label: "Parent Portal", href: "/parent", icon: Library },
    ],
  },
  {
    label: "Communication",
    separator: true,
    items: [
      { label: "Messaging", href: "/messaging", icon: MessageCircle, badgeKey: "messages" as const },
      { label: "Video Feedback", href: "/video-review", icon: PlaySquare, badgeKey: "videos" as const },
    ],
  },
  {
    label: "Health & Schedule",
    items: [
      { label: "Schedule", href: "/bookings", icon: CalendarDays },
      { label: "Nutrition & Wellness", href: "/nutrition", icon: ClipboardCheck },
      { label: "Referrals", href: "/physio-referrals", icon: Stethoscope },
    ],
  },
  {
    label: "Business",
    separator: true,
    items: [
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Stats", href: "/stats", icon: Activity },
      { label: "Portal Config", href: "/portal-config", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Workspace",
    separator: true,
    items: [
      { label: "Support", href: "/support", icon: LifeBuoy },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

function UserFooter() {
  const { data } = useGetAdminProfileQuery();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const displayName = data?.user?.name || "Admin";
  const profilePicture = data?.user?.profilePicture || null;
  const initials = (() => {
    const parts = displayName.split(" ").filter(Boolean);
    if (!parts.length) return "AD";
    return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""}`.toUpperCase() || "AD";
  })();

  return (
    <SidebarFooter className="border-t border-sidebar-border p-3">
      <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-none border border-sidebar-border bg-sidebar-accent text-xs font-black text-sidebar-foreground">
          {profilePicture ? (
            <img src={profilePicture} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
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

export function AppSidebar() {
  const pathname = usePathname();
  const pathOnly = pathname.split("?")[0] ?? pathname;

  const { data: threadsData, refetch: refetchThreads } = useGetThreadsQuery();
  const { data: usersData } = useGetUsersQuery();
  const { data: videosData, refetch: refetchVideos } = useGetVideoUploadsQuery();

  const refetchThreadsRef = useRef(refetchThreads);
  const refetchVideosRef = useRef(refetchVideos);
  useEffect(() => { refetchThreadsRef.current = refetchThreads; }, [refetchThreads]);
  useEffect(() => { refetchVideosRef.current = refetchVideos; }, [refetchVideos]);

  useEffect(() => {
    // Use module-level socket singleton so navigations don't disconnect/reconnect
    const socket = getOrCreateSocket();
    const handleRefresh = () => { refetchVideosRef.current(); refetchThreadsRef.current(); };
    socket.on("video:new", handleRefresh);
    socket.on("video:reviewed", handleRefresh);
    socket.on("message:new", () => refetchThreadsRef.current());
    return () => {
      socket.off("video:new", handleRefresh);
      socket.off("video:reviewed", handleRefresh);
      socket.off("message:new");
    };
  }, []);

  const guardianIds = new Set(
    ((usersData as { users?: SidebarUser[] } | undefined)?.users ?? [] as SidebarUser[])
      .filter((u) => u?.role === "guardian").map((u) => Number(u.id)).filter(Number.isFinite)
  );
  const unreadMessages = ((threadsData as { threads?: SidebarThread[] } | undefined)?.threads ?? [] as SidebarThread[]).reduce((sum, t) => {
    if (!isRecord(t)) return sum;
    const uid = Number(t.userId);
    if (!Number.isFinite(uid)) return sum;
    if (guardianIds.size > 0 && !guardianIds.has(uid)) return sum;
    return sum + Number(t.unread ?? 0);
  }, 0);
  const pendingVideos = ((videosData as { items?: SidebarVideoUpload[] } | undefined)?.items ?? [] as SidebarVideoUpload[])
    .filter((i) => isRecord(i) && !i.reviewedAt).length;

  const badges: Record<string, number> = {
    messages: unreadMessages,
    videos: pendingVideos,
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header / Logo */}
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <img
            src="/ph.jpg"
            alt="PH Performance"
            className="h-8 w-8 shrink-0 rounded-none object-cover ring-1 ring-sidebar-border"
          />
          <div className="group-data-[collapsible=icon]:hidden border-l border-sidebar-border pl-3">
            <p className="text-sm font-black uppercase tracking-tighter text-sidebar-foreground leading-none">
              Performance
            </p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-primary">
              Operations Hub
            </p>
          </div>
        </Link>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent>
        {NAV.map((group) => (
          <React.Fragment key={group.label}>
            {group.separator && <SidebarSeparator />}
            <SidebarGroup>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = pathMatches(pathOnly, item.href);
                    const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                        {badgeCount > 0 && (
                          <SidebarMenuBadge>{badgeCount}</SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </React.Fragment>
        ))}
      </SidebarContent>

      <UserFooter />
      <SidebarRail />
    </Sidebar>
  );
}
