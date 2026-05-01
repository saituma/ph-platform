"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Search, User } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Menu, MenuTrigger, MenuPopup, MenuGroup, MenuGroupLabel, MenuItem, MenuSeparator } from "../ui/menu";
import { useGetAdminProfileQuery } from "../../lib/apiSlice";

type TopbarProps = {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  onSearchOpen?: () => void;
};

export function AdminTopbar({ title, subtitle, actions, onSearchOpen }: TopbarProps) {
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

  async function handleLogout() {
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
  }

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
        <button
          type="button"
          className="group hidden w-full max-w-sm items-center gap-2 rounded-none border border-border bg-gradient-to-r from-background to-secondary/25 px-3 py-2 text-left text-xs shadow-sm transition hover:border-primary/40 hover:from-background hover:to-secondary/50 xl:flex"
          onClick={onSearchOpen}
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" aria-hidden />
          <span className="flex-1 text-muted-foreground">Find users, bookings, teams, messages…</span>
          <kbd className="rounded-none border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">⌘K</kbd>
        </button>
        <ThemeToggle />
        {actions ?? null}
        <Menu>
          <MenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-none px-2 py-1.5 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            <div className="relative">
              <Avatar className="h-8 w-8 rounded-none border border-border">
                <AvatarImage src={profilePicture ?? undefined} alt={displayName} />
                <AvatarFallback className="rounded-none bg-secondary text-xs font-black font-mono text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span
                aria-hidden
                className="absolute bottom-0 right-0 h-2 w-2 bg-primary"
              />
            </div>
            <span className="hidden text-xs font-bold uppercase tracking-wider md:inline">{displayName}</span>
          </MenuTrigger>
          <MenuPopup align="end" className="w-48">
            <MenuGroup>
              <MenuGroupLabel className="truncate">{displayName}</MenuGroupLabel>
              <MenuItem
                className="gap-2"
                onClick={() => router.push("/profile")}
              >
                <User className="h-4 w-4 text-muted-foreground" aria-hidden />
                Profile
              </MenuItem>
            </MenuGroup>
            <MenuSeparator />
            <MenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Logout
            </MenuItem>
          </MenuPopup>
        </Menu>
      </div>
    </header>
  );
}
