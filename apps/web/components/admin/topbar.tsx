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
    <header className="hidden flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-4 lg:flex lg:px-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onToggleSidebar} className="h-8 w-8 rounded-none border-border hover:bg-primary hover:text-primary-foreground">
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
        <div className="flex flex-col">
          {subtitle ? (
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary leading-none mb-1">{subtitle}</p>
          ) : null}
          <h1 className="text-xl font-black tracking-tight text-foreground leading-none">{title}</h1>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-end gap-4">
        <div className="hidden w-full max-w-sm md:block">
          <div className="flex items-center gap-2 rounded-none border border-border bg-background px-3 py-1.5 text-xs font-mono">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="SYSTEM SEARCH..."
              className="w-full bg-transparent outline-none placeholder:text-muted-foreground/50 uppercase"
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
        <ThemeToggle />
        {actions ?? null}
        <Button
          variant="ghost"
          className="flex items-center gap-3 rounded-none hover:bg-secondary px-2"
          onClick={() => setOpenProfile(true)}
        >
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-none border border-border bg-secondary text-xs font-black text-foreground font-mono">
            {profilePicture ? (
              <img src={profilePicture} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
            <span className="absolute bottom-0 right-0 h-2 w-2 bg-primary" />
          </div>
          <span className="hidden text-xs font-bold uppercase tracking-wider md:inline">{displayName}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
                const { clearDesktopNotificationPromptFlag } = await import("@/lib/desktop-notifications");
                clearDesktopNotificationPromptFlag();
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
