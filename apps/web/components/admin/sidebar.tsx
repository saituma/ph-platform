"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Home,
  MessageCircle,
  PlaySquare,
  Settings,
  Stethoscope,
  UserRound,
} from "lucide-react";

import { AdminNav } from "./nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select } from "../ui/select";
import { useGetThreadsQuery, useGetUsersQuery, useGetVideoUploadsQuery } from "../../lib/apiSlice";

type SidebarContentProps = {
  currentPath: string;
  collapsed?: boolean;
};

export function AdminSidebarContent({
  currentPath,
  collapsed = false,
}: SidebarContentProps) {
  const [premiumWindowOpen, setPremiumWindowOpen] = useState(false);
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
      transports: ["websocket"],
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
    (usersData?.users ?? [])
      .filter((user: any) => user?.role === "guardian")
      .map((user: any) => user.id)
  );
  const unreadCount = (threadsData?.threads ?? []).reduce((sum: number, thread: any) => {
    if (guardianIds.size > 0 && !guardianIds.has(thread.userId)) return sum;
    return sum + (thread.unread ?? 0);
  }, 0);
  const pendingVideoCount = (videosData?.items ?? []).filter((item: any) => !item.reviewedAt).length;

  const navItems = [
    { label: "Overview", href: "/", icon: Home },
    { label: "Parent Portal", href: "/parent", icon: UserRound },
    { label: "Content", href: "/content", icon: BookOpen },
    { label: "Users & Tiers", href: "/users", icon: UserRound },
    { label: "Client training", href: "/training-snapshot", icon: ClipboardList },
    {
      label: "Messaging",
      href: "/messaging",
      badge: unreadCount > 0 ? String(unreadCount) : undefined,
      icon: MessageCircle,
    },
    { label: "Schedule", href: "/bookings", icon: CalendarDays },
    {
      label: "Video Feedback",
      href: "/video-review",
      badge: pendingVideoCount > 0 ? String(pendingVideoCount) : undefined,
      icon: PlaySquare,
    },
    { label: "Food Diary", href: "/food-diary", icon: ClipboardCheck },
    { label: "Physio Referrals", href: "/physio-referrals", icon: Stethoscope },
    { label: "Training content", href: "/exercise-library", icon: BadgeCheck },
    { label: "Settings", href: "/settings", icon: Settings },
  ];
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
      </div>
      <AdminNav items={navItems} currentPath={currentPath} collapsed={collapsed} />
      {collapsed ? null : (
        <Card className="mt-auto border-dashed bg-secondary/40">
          <CardHeader>
            <CardDescription>Premium call window</CardDescription>
            <CardTitle className="text-lg">13:00 - 13:30</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Fixed window active for Premium members.
            </p>
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => setPremiumWindowOpen(true)}>
                Edit Window
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={premiumWindowOpen} onOpenChange={setPremiumWindowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Premium Call Window</DialogTitle>
            <DialogDescription>Update the fixed daily call window.</DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-4">
            <Select>
              <option>Enabled</option>
              <option>Disabled</option>
            </Select>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select>
                <option>Start hour</option>
                {Array.from({ length: 24 }).map((_, hour) => (
                  <option key={`start-${hour}`} value={hour}>
                    {String(hour).padStart(2, "0")}
                  </option>
                ))}
              </Select>
              <Select>
                <option>Start minute</option>
                {["00", "15", "30", "45"].map((minute) => (
                  <option key={`start-min-${minute}`} value={minute}>
                    {minute}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select>
                <option>End hour</option>
                {Array.from({ length: 24 }).map((_, hour) => (
                  <option key={`end-${hour}`} value={hour}>
                    {String(hour).padStart(2, "0")}
                  </option>
                ))}
              </Select>
              <Select>
                <option>End minute</option>
                {["00", "15", "30", "45"].map((minute) => (
                  <option key={`end-min-${minute}`} value={minute}>
                    {minute}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPremiumWindowOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setPremiumWindowOpen(false)}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
        "hidden flex-col border-r border-border bg-card px-6 py-8 transition-all lg:flex lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto",
        collapsed ? "w-20 px-3" : "w-72"
      )}
    >
      <AdminSidebarContent currentPath={pathname} collapsed={collapsed} />
    </aside>
  );
}
