"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BookOpen,
  CalendarDays,
  CreditCard,
  Dumbbell,
  Film,
  LayoutDashboard,
  MessageCircle,
  PlaySquare,
  Layers,
  Baby,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetThreadsQuery, useGetVideoUploadsQuery, useGetUsersQuery } from "@/lib/apiSlice";
import { getOrCreateAdminSocket } from "@/lib/admin-socket";

type DockItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "messages" | "videos";
};

const DOCK_ITEMS: DockItem[] = [
  { label: "Dashboard",        href: "/",                    icon: LayoutDashboard },
  { label: "Users",            href: "/users",               icon: Users },
  { label: "Programs",         href: "/programs",            icon: BookOpen },
  { label: "Exercise Library", href: "/programs/exercises",  icon: Dumbbell },
  { label: "Training Content", href: "/exercise-library",    icon: Layers },
  { label: "Video Editor",     href: "/video-editor",        icon: Film },
  { label: "Messaging",        href: "/messaging",           icon: MessageCircle, badgeKey: "messages" },
  { label: "Video Review",     href: "/video-review",        icon: PlaySquare,    badgeKey: "videos" },
  { label: "Schedule",         href: "/bookings",            icon: CalendarDays },
  { label: "Billing",          href: "/billing",             icon: CreditCard },
  { label: "Stats",            href: "/stats",               icon: Activity },
  { label: "Parent Portal",    href: "/parent/content",      icon: Baby },
];

function pathMatches(pathOnly: string, href: string) {
  if (href === "/") return pathOnly === "/";
  return pathOnly === href || pathOnly.startsWith(`${href}/`);
}

type SidebarUser = { id: number; role?: string | null };
type SidebarThread = { userId: number; unread?: number | null };
type SidebarVideoUpload = { reviewedAt?: string | null };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function BottomDock() {
  const pathname = usePathname();
  const pathOnly = pathname.split("?")[0] ?? pathname;

  const [hovered, setHovered] = useState<string | null>(null);

  const { data: threadsData, refetch: refetchThreads } = useGetThreadsQuery();
  const { data: usersData } = useGetUsersQuery();
  const { data: videosData, refetch: refetchVideos } = useGetVideoUploadsQuery();

  const refetchThreadsRef = useRef(refetchThreads);
  const refetchVideosRef = useRef(refetchVideos);
  useEffect(() => { refetchThreadsRef.current = refetchThreads; }, [refetchThreads]);
  useEffect(() => { refetchVideosRef.current = refetchVideos; }, [refetchVideos]);

  useEffect(() => {
    const socket = getOrCreateAdminSocket();
    const handleAll = () => { refetchVideosRef.current(); refetchThreadsRef.current(); };
    socket.on("video:new", handleAll);
    socket.on("video:reviewed", handleAll);
    socket.on("message:new", () => refetchThreadsRef.current());
    return () => {
      socket.off("video:new", handleAll);
      socket.off("video:reviewed", handleAll);
      socket.off("message:new");
    };
  }, []);

  const guardianIds = new Set(
    ((usersData as { users?: SidebarUser[] } | undefined)?.users ?? [])
      .filter((u) => u?.role === "guardian")
      .map((u) => Number(u.id))
      .filter(Number.isFinite)
  );

  const unreadMessages = ((threadsData as { threads?: SidebarThread[] } | undefined)?.threads ?? []).reduce(
    (sum, t) => {
      if (!isRecord(t)) return sum;
      const uid = Number(t.userId);
      if (!Number.isFinite(uid)) return sum;
      if (guardianIds.size > 0 && !guardianIds.has(uid)) return sum;
      return sum + Number(t.unread ?? 0);
    },
    0
  );

  const pendingVideos = ((videosData as { items?: SidebarVideoUpload[] } | undefined)?.items ?? []).filter(
    (i) => isRecord(i) && !i.reviewedAt
  ).length;

  const badges: Record<string, number> = { messages: unreadMessages, videos: pendingVideos };

  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      {/* Label tooltip — shown above hovered item */}
      <div
        className={cn(
          "mb-2 flex h-6 items-center justify-center transition-all duration-150",
          hovered ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-foreground backdrop-blur-md shadow-sm">
          {DOCK_ITEMS.find((i) => i.href === hovered)?.label ?? ""}
        </span>
      </div>

      {/* Dock pill */}
      <nav
        aria-label="Quick navigation"
        className="flex items-end gap-1 rounded-2xl border border-white/10 bg-background/40 px-3 py-2.5 shadow-2xl backdrop-blur-2xl dark:border-white/[0.07] dark:bg-black/30"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)" }}
      >
        {DOCK_ITEMS.map((item) => {
          const isActive = pathMatches(pathOnly, item.href);
          const badgeCount = item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0;
          const isHovered = hovered === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              onMouseEnter={() => setHovered(item.href)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ease-out",
                "hover:scale-125 hover:-translate-y-1.5",
                isHovered && "scale-125 -translate-y-1.5",
                isActive
                  ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5" />

              {/* Badge */}
              {badgeCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black leading-none text-primary-foreground">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}

              {/* Active dot */}
              {isActive && (
                <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
