"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

import { Button } from "../ui/button";
import { ThemeToggle } from "../admin/theme-toggle";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

type TopbarProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

export function ParentTopbar({
  title,
  subtitle,
  actions,
  isSidebarCollapsed = false,
  onToggleSidebar,
}: TopbarProps) {
  const [openNotify, setOpenNotify] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const router = useRouter();

  return (
    <header className="hidden flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-6 lg:flex lg:px-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      </div>
      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="hidden w-full max-w-sm md:block">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search onboarding, schedules, messages"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpenNotify(true)}>
          <Bell className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        {actions ?? (
          <Button variant="outline" onClick={() => router.push("/parent/onboarding")}>
            Review Onboarding
          </Button>
        )}
        <Button
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => setOpenProfile(true)}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-foreground">
            PG
          </div>
          <span className="hidden text-sm md:inline">Parent Guardian</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
      <Dialog open={openNotify} onOpenChange={setOpenNotify}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>Updates from coaches and staff.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl border border-border bg-secondary/40 p-3">
              New feedback on Dawit’s last session.
            </div>
            <div className="rounded-2xl border border-border bg-secondary/40 p-3">
              Upcoming training scheduled for Friday 17:00.
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openProfile} onOpenChange={setOpenProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account</DialogTitle>
            <DialogDescription>Manage your parent profile.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/parent/settings")}>
              Settings
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.replace("/login");
              }}
            >
              Logout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
