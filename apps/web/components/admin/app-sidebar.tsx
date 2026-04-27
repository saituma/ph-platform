"use client";

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
  UserPlus,
  Users,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useGetThreadsQuery, useGetUsersQuery, useGetVideoUploadsQuery, useGetAdminProfileQuery } from "../../lib/apiSlice";
import { ThemeToggle } from "./theme-toggle";

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

const NAV = [
  {
    label: "Overview",
    items: [
      { label: "Overview", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "People & Programs",
    items: [
      { label: "Users & Tiers", href: "/users", icon: Users },
      { label: "Add User", href: "/users/add", icon: UserPlus },
      { label: "Add Team", href: "/users/add-team", icon: Users },
      { label: "Teams", href: "/teams", icon: Users },
      { label: "Onboarding", href: "/onboarding-config", icon: SlidersHorizontal },
      { label: "Client Training", href: "/training-snapshot", icon: ClipboardList },
      { label: "Tracking", href: "/tracking", icon: Activity },
      { label: "Training Answers", href: "/training-questionnaires", icon: ClipboardCheck },
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Stats", href: "/stats", icon: Activity },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Content", href: "/content", icon: BookOpen },
      { label: "Gallery", href: "/gallery", icon: Images },
      { label: "Parent Portal", href: "/parent", icon: Library },
      { label: "Training Content", href: "/exercise-library", icon: BadgeCheck },
    ],
  },
  {
    label: "Messages & Video",
    items: [
      { label: "Messaging", href: "/messaging", icon: MessageCircle, badgeKey: "messages" as const },
      { label: "Video Feedback", href: "/video-review", icon: PlaySquare, badgeKey: "videos" as const },
    ],
  },
  {
    label: "Schedule & Care",
    items: [
      { label: "Schedule", href: "/bookings", icon: CalendarDays },
      { label: "Nutrition & Wellness", href: "/nutrition", icon: ClipboardCheck },
      { label: "Referrals", href: "/physio-referrals", icon: Stethoscope },
    ],
  },
  {
    label: "Workspace",
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

  const socketRef = useRef<Socket | null>(null);
  const refetchThreadsRef = useRef(refetchThreads);
  const refetchVideosRef = useRef(refetchVideos);
  useEffect(() => { refetchThreadsRef.current = refetchThreads; }, [refetchThreads]);
  useEffect(() => { refetchVideosRef.current = refetchVideos; }, [refetchVideos]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const socketEnvUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const apiEnvUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const fallback = `${window.location.protocol}//${window.location.hostname}:3001`;
    const socketUrl = socketEnvUrl
      ? socketEnvUrl.replace(/\/api\/?$/, "")
      : isLocal ? fallback : apiEnvUrl ? apiEnvUrl.replace(/\/api\/?$/, "") : fallback;

    const token = document.cookie.split(";").map((p) => p.trim()).find((p) => p.startsWith("accessTokenClient="))?.split("=")[1] ?? "";
    const socket: Socket = io(socketUrl, {
      auth: token ? { token } : undefined,
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;
    const handleRefresh = () => { refetchVideosRef.current(); refetchThreadsRef.current(); };
    socket.on("video:new", handleRefresh);
    socket.on("video:reviewed", handleRefresh);
    socket.on("message:new", () => refetchThreadsRef.current());
    return () => { socket.disconnect(); socketRef.current = null; };
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
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathMatches(pathOnly, item.href);
                  const badgeKey = (item as any).badgeKey as "messages" | "videos" | undefined;
                  const badgeCount = badgeKey ? badges[badgeKey] : 0;
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
        ))}
      </SidebarContent>

      <UserFooter />
      <SidebarRail />
    </Sidebar>
  );
}
