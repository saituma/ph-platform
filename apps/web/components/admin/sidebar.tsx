"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  Activity,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Crown,
  Home,
  MessageCircle,
  PlaySquare,
  Library,
  LifeBuoy,
  Settings,
  SlidersHorizontal,
  Stethoscope,
  Search,
  UserPlus,
  Users,
} from "lucide-react";

import { AdminNavGrouped, type NavGroup } from "./nav";
import {
  Card,
  CardContent,
} from "../ui/card";
import { cn } from "../../lib/utils";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { useGetThreadsQuery, useGetUsersQuery, useGetVideoUploadsQuery } from "../../lib/apiSlice";

type SidebarContentProps = {
  currentPath: string;
  collapsed?: boolean;
};

type SidebarUser = {
  id: number;
  role?: string | null;
};

type SidebarThread = {
  userId: number;
  unread?: number | null;
};

type SidebarVideoUpload = {
  reviewedAt?: string | null;
};

export function AdminSidebarContent({
  currentPath,
  collapsed = false,
}: SidebarContentProps) {
  const [navQuery, setNavQuery] = useState("");
  const { data: threadsData, refetch: refetchThreads } = useGetThreadsQuery();
  const { data: usersData } = useGetUsersQuery();
  const { data: videosData, refetch: refetchVideos } = useGetVideoUploadsQuery();
  const socketRef = useRef<Socket | null>(null);
  const refetchThreadsRef = useRef(refetchThreads);
  const refetchVideosRef = useRef(refetchVideos);

  useEffect(() => {
    refetchThreadsRef.current = refetchThreads;
  }, [refetchThreads]);

  useEffect(() => {
    refetchVideosRef.current = refetchVideos;
  }, [refetchVideos]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const socketEnvUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const apiEnvUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const localDevHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const fallbackLocalUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
    const socketUrl = socketEnvUrl
      ? socketEnvUrl.replace(/\/api\/?$/, "")
      : localDevHost
      ? fallbackLocalUrl
      : apiEnvUrl
      ? apiEnvUrl.replace(/\/api\/?$/, "")
      : fallbackLocalUrl;

    const accessToken = typeof document !== "undefined"
      ? document.cookie
          .split(";")
          .map((part) => part.trim())
          .find((part) => part.startsWith("accessTokenClient="))
          ?.split("=")[1] ?? ""
      : "";

    const socket: Socket = io(socketUrl, {
      auth: accessToken ? { token: accessToken } : undefined,
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => console.log("[Sidebar Socket] Connected"));

    const handleRefresh = () => {
      refetchVideosRef.current();
      refetchThreadsRef.current();
    };

    socket.on("video:new", handleRefresh);
    socket.on("video:reviewed", handleRefresh);
    socket.on("message:new", () => refetchThreads());

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);
  const guardianIds = new Set(
    (((usersData as { users?: SidebarUser[] } | undefined)?.users ?? []) as SidebarUser[])
      .filter((user) => user?.role === "guardian")
      .map((user) => Number(user.id))
      .filter((id) => Number.isFinite(id))
  );
  const unreadCount = (((threadsData as { threads?: SidebarThread[] } | undefined)?.threads ?? []) as SidebarThread[]).reduce((sum, thread) => {
    if (guardianIds.size > 0 && !guardianIds.has(thread.userId)) return sum;
    return sum + (thread.unread ?? 0);
  }, 0);
  const pendingVideoCount = (((videosData as { items?: SidebarVideoUpload[] } | undefined)?.items ?? []) as SidebarVideoUpload[]).filter(
    (item) => !item.reviewedAt,
  ).length;

  const navGroups: NavGroup[] = [
    {
      id: "overview",
      title: "Overview",
      description: "Coach dashboard & snapshot KPIs",
      items: [{ label: "Overview", href: "/", icon: Home }],
    },
    {
      id: "coaching",
      title: "Premium coaching",
      description: "1:1 athlete plans, check-ins, and progress",
      items: [
        { label: "1:1 Coaching", href: "/coaching", icon: Crown },
      ],
    },
    {
      id: "people",
      title: "People & programs",
      description: "Users, tiers, onboarding, per-athlete training",
      items: [
        { label: "Users & Tiers", href: "/users", icon: Users },
        { label: "Add user", href: "/users/add", icon: UserPlus },
        { label: "Add team", href: "/users/add-team", icon: Users },
        { label: "Teams", href: "/teams", icon: Users },
        { label: "Onboarding", href: "/onboarding-config", icon: SlidersHorizontal },
        { label: "Client training", href: "/training-snapshot", icon: ClipboardList },
        { label: "Billing", href: "/billing", icon: CreditCard },
      ],
    },
    {
      id: "content",
      title: "Content & parent hub",
      description: "Home CMS, parent portal, exercises, age UX",
      items: [
        { label: "Content", href: "/content", icon: BookOpen },
        { label: "Parent Portal", href: "/parent", icon: Library },
        { label: "Training content", href: "/exercise-library", icon: BadgeCheck },
      ],
    },
    {
      id: "comms",
      title: "Messages & video",
      description: "Private threads and client upload reviews",
      items: [
        {
          label: "Messaging",
          href: "/messaging",
          badge: unreadCount > 0 ? String(unreadCount) : undefined,
          icon: MessageCircle,
        },
        {
          label: "Video Feedback",
          href: "/video-review",
          badge: pendingVideoCount > 0 ? String(pendingVideoCount) : undefined,
          icon: PlaySquare,
        },
      ],
    },
    {
      id: "schedule",
      title: "Schedule & athlete care",
      description: "Bookings, food diary, referrals",
      items: [
        { label: "Schedule", href: "/bookings", icon: CalendarDays },
        { label: "Food Diary", href: "/food-diary", icon: ClipboardCheck },
        { label: "Referrals", href: "/physio-referrals", icon: Stethoscope },
      ],
    },
    {
      id: "workspace",
      title: "Workspace",
      description: "Support, preferences, account",
      items: [
        { label: "Support", href: "/support", icon: LifeBuoy },
        { label: "Settings", href: "/settings", icon: Settings },
      ],
    },
  ];

  const filteredNavGroups = useMemo<NavGroup[]>(() => {
    const query = navQuery.trim().toLowerCase();
    if (!query) return navGroups;
    return navGroups
      .map((group) => {
        const matchesGroup =
          group.title.toLowerCase().includes(query) || String(group.description ?? "").toLowerCase().includes(query);
        const items = matchesGroup
          ? group.items
          : group.items.filter((item) => item.label.toLowerCase().includes(query));
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [navGroups, navQuery]);

  return (
    <div className="flex h-full flex-col gap-5">
      <div className={cn("px-2", collapsed ? "text-center" : undefined)}>
        <Link href="/" className="group flex items-center gap-3 transition hover:opacity-90">
          <img src="/ph.jpg" alt="PH Performance" className="h-10 w-10 rounded-md object-cover ring-1 ring-border/60" />
          {collapsed ? null : (
            <div className="border-l border-border pl-3">
              <p className="text-xl font-black tracking-tighter text-foreground leading-none">PERFORMANCE</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-primary">
                OPERATIONS HUB
              </p>
            </div>
          )}
        </Link>
      </div>
      {collapsed ? null : (
        <Card className="border-border/70 bg-gradient-to-br from-card via-card to-secondary/25 shadow-sm">
          <CardContent className="space-y-3 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Coach Console</p>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/70 bg-background/80 px-2 py-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Unread</p>
                <p className="text-sm font-semibold text-foreground">{unreadCount}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/80 px-2 py-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Video Queue</p>
                <p className="text-sm font-semibold text-foreground">{pendingVideoCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {collapsed ? null : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={navQuery}
            onChange={(event) => setNavQuery(event.target.value)}
            placeholder="Quick find in sidebar..."
            className="h-9 rounded-xl border-border/70 bg-background/70 pl-9 text-sm"
          />
        </div>
      )}
      <div className="rounded-2xl border border-border/50 bg-background/30 p-2">
        <AdminNavGrouped groups={collapsed ? navGroups : filteredNavGroups} currentPath={currentPath} collapsed={collapsed} />
        {!collapsed && filteredNavGroups.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">No navigation results.</p>
        ) : null}
      </div>
    </div>
  );
}

type AdminSidebarProps = {
  collapsed?: boolean;
};

export function AdminSidebar({ collapsed = false }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden flex-col border-r border-border/70 bg-gradient-to-b from-card via-card to-secondary/20 transition-all lg:sticky lg:top-0 lg:flex lg:h-screen",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <ScrollArea className="h-full">
        <div className={cn("h-full py-6", collapsed ? "px-3" : "px-4")}>
          <AdminSidebarContent currentPath={pathname} collapsed={collapsed} />
        </div>
      </ScrollArea>
    </aside>
  );
}
