"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  ChevronDown,
  Plus,
  Search,
  User,
} from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ThemeToggle } from "./theme-toggle";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select } from "../ui/select";
import { Badge } from "../ui/badge";

type TopbarProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

export function AdminTopbar({
  title,
  subtitle,
  actions,
  isSidebarCollapsed = false,
  onToggleSidebar,
}: TopbarProps) {
  const [openQuick, setOpenQuick] = useState(false);
  const [openNotify, setOpenNotify] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [profileAction, setProfileAction] = useState<string | null>(null);
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
              placeholder="Search athletes, messages, bookings"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        <Select className="hidden w-44 md:block">
          <option>Date range</option>
          <option>This week</option>
          <option>This month</option>
          <option>This quarter</option>
        </Select>
        <Button variant="outline" className="hidden md:inline-flex" onClick={() => setOpenQuick(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Quick Action
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setOpenNotify(true)}>
          <Bell className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        {actions ?? <Button>New Message</Button>}
        <Button
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => setOpenProfile(true)}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-foreground">
            LL
          </div>
          <span className="hidden text-sm md:inline">Coach</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
      <Dialog open={openQuick} onOpenChange={setOpenQuick}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Action</DialogTitle>
            <DialogDescription>Choose a workflow to jump into.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            {["Create program", "Open slots", "Send message", "Add content"].map((item) => (
              <Button key={item} variant="outline" className="w-full justify-start">
                {item}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openNotify} onOpenChange={setOpenNotify}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>Recent alerts and updates.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl border border-border bg-secondary/40 p-3">
              New premium message from Ava Patterson.
            </div>
            <div className="rounded-2xl border border-border bg-secondary/40 p-3">
              Booking confirmed for 15:30.
            </div>
            <div className="rounded-2xl border border-border bg-secondary/40 p-3">
              Video upload awaiting review.
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={openProfile}
        onOpenChange={(open) => {
          setOpenProfile(open);
          if (!open) setProfileAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
            <DialogDescription>Account and preferences.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setOpenProfile(false);
                router.push("/profile");
              }}
            >
              View Profile
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setOpenProfile(false);
                router.push("/preferences");
              }}
            >
              Preferences
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setProfileAction("Logging out...")}
            >
              Logout
            </Button>
            {profileAction ? (
              <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
                {profileAction}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
