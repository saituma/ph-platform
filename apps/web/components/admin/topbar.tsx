"use client";

import { useMemo, useState } from "react";
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
import { Badge } from "../ui/badge";
import { useGetAdminProfileQuery } from "../../lib/apiSlice";

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
  const [openNotify, setOpenNotify] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [profileAction, setProfileAction] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { data } = useGetAdminProfileQuery();
  const displayName = data?.user?.name || "Admin";
  const profilePicture = data?.user?.profilePicture || null;
  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean);
    if (!parts.length) return "AD";
    const first = parts[0]?.[0] ?? "";
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return `${first}${second}`.toUpperCase() || "AD";
  }, [displayName]);
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
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const query = search.trim();
                  if (!query) return;
                  router.push(`/search?q=${encodeURIComponent(query)}`);
                }
              }}
            />
          </div>
        </div>
        <div className="hidden md:block" />
        <Button variant="ghost" size="icon" onClick={() => setOpenNotify(true)}>
          <Bell className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        {actions ?? null}
        <Button
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => setOpenProfile(true)}
        >
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-xs font-semibold text-foreground">
            {profilePicture ? (
              <img src={profilePicture} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
          </div>
          <span className="hidden text-sm md:inline">{displayName}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
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
            <DialogDescription>Account actions.</DialogDescription>
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
              Profile
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={async () => {
                setProfileAction("Logging out...");
                const csrfToken =
                  document.cookie
                    .split(";")
                    .map((part) => part.trim())
                    .find((part) => part.startsWith("csrfToken="))
                    ?.split("=")[1] ?? "";
                await fetch("/api/auth/logout", {
                  method: "POST",
                  headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
                });
                router.replace("/login");
              }}
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
