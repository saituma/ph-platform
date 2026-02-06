"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Home,
  MessageCircle,
  PlaySquare,
  Settings,
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

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Users", href: "/users", icon: UserRound },
  { label: "Messaging", href: "/messaging", badge: "9", icon: MessageCircle },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Video Review", href: "/video-review", icon: PlaySquare },
  { label: "Content", href: "/content", icon: ClipboardList },
  { label: "Programs", href: "/programs", icon: BookOpen },
  { label: "Exercise Library", href: "/exercise-library", icon: BadgeCheck },
  { label: "Settings", href: "/settings", icon: Settings },
];

type SidebarContentProps = {
  currentPath: string;
  collapsed?: boolean;
};

export function AdminSidebarContent({
  currentPath,
  collapsed = false,
}: SidebarContentProps) {
  const [premiumWindowOpen, setPremiumWindowOpen] = useState(false);
  return (
    <div className="flex h-full flex-col gap-6">
      <div className={collapsed ? "text-center" : undefined}>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Lift Lab
        </p>
        {collapsed ? null : (
          <p className="mt-2 text-2xl font-semibold text-foreground">PHP Admin</p>
        )}
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
        "hidden flex-col border-r border-border bg-card px-6 py-8 transition-all lg:flex",
        collapsed ? "w-20 px-3" : "w-72"
      )}
    >
      <AdminSidebarContent currentPath={pathname} collapsed={collapsed} />
    </aside>
  );
}
