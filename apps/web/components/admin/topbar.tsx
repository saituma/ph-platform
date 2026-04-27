"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Button } from "../ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { GlobalCommandPalette } from "./global-command-palette";
import { useGetAdminProfileQuery } from "../../lib/apiSlice";

type TopbarProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export function AdminTopbar({ title, subtitle, actions }: TopbarProps) {
  const [openNotify, setOpenNotify] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [profileAction, setProfileAction] = useState<string | null>(null);
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
    <header className="hidden min-w-0 items-center gap-2 border-b border-border bg-card px-4 py-3 lg:flex lg:px-6">
      <SidebarTrigger className="-ml-1" />
      <div className="h-4 w-px bg-border" />
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex min-w-0 flex-col">
          {subtitle ? (
            <p className="mb-1 truncate text-[10px] font-bold uppercase leading-none tracking-widest text-primary">{subtitle}</p>
          ) : null}
          <h1 className="truncate text-xl font-black leading-none tracking-tight text-foreground">{title}</h1>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
        <div className="hidden w-full max-w-sm xl:block">
          <GlobalCommandPalette />
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
