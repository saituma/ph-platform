"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, LogOut, Search, Settings, User } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Menu, MenuTrigger, MenuPopup, MenuGroup, MenuGroupLabel, MenuItem, MenuSeparator } from "../ui/menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { useGetAdminProfileQuery } from "@/lib/apiSlice";

// ─── Breadcrumb auto-generation ───────────────────────────────────────────────

const SEGMENT_LABEL: Record<string, string | null> = {
  "users":                   "Users",
  "teams":                   "Teams",
  "programs":                "Programs",
  "exercise-library":        "Exercise Library",
  "video-review":            "Video Review",
  "billing":                 "Billing",
  "team-payments":           "Team Payments",
  "plans":                   "Plans",
  "nutrition":               "Nutrition",
  "bookings":                "Bookings",
  "content":                 "Content",
  "profile":                 "Profile",
  "testimonials":            "Testimonials",
  "intro-video":             "Intro Video",
  "messaging":               "Messaging",
  "tracking":                "Tracking",
  "training-snapshot":       "Client Training",
  "training-questionnaires": "Questionnaires",
  "physio-referrals":        "Referrals",
  "session-schedule":        "Sessions",
  "stats":                   "Stats",
  "settings":                "Settings",
  "support":                 "Support",
  "portal-config":           "Portal Config",
  "enquiries":               "Enquiries",
  "gallery":                 "Gallery",
  "parents":                 "Parents",
  "athletes":                "Athletes",
  "data":                    "Data",
  "videos":                  "Videos",
  "add":                     "Add User",
  "add-team":                "Add Team",
  // container segments — skip (don't appear as crumbs)
  "modules":                 null,
  "sessions":                null,
  "members":                 null,
  "detail":                  null,
  "log":                     null,
  "others":                  null,
};

// What to call a dynamic segment based on the segment before it
const DYNAMIC_AFTER: Record<string, string> = {
  "programs":       "Program",
  "users":          "Athlete",
  "athletes":       "Athlete",
  "teams":          "Team",
  "modules":        "Module",
  "sessions":       "Session",
  "bookings":       "Booking",
  "video-review":   "Review",
  "team-payments":  "Team",
  "videos":         "Video",
};

function isDynamic(seg: string) {
  return /^\d+$/.test(seg) || /^[0-9a-f-]{20,}$/i.test(seg);
}

function isSlug(seg: string) {
  // human-readable slug like "elite-squad" — keep as label
  return /^[a-z0-9]+(-[a-z0-9]+)+$/.test(seg) && !isDynamic(seg);
}

function toLabel(seg: string, prevSeg: string): string | null {
  if (seg in SEGMENT_LABEL) return SEGMENT_LABEL[seg];
  if (isDynamic(seg)) return DYNAMIC_AFTER[prevSeg] ?? null;
  if (isSlug(seg)) return seg.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type Crumb = { label: string; href?: string };

function useAutoBreadcrumbs(): Crumb[] {
  const pathname = usePathname();
  return useMemo(() => {
    const pathOnly = pathname.split("?")[0] ?? pathname;
    if (pathOnly === "/") return [{ label: "Dashboard" }];

    const segments = pathOnly.split("/").filter(Boolean);
    const crumbs: Crumb[] = [{ label: "Dashboard", href: "/" }];
    let builtPath = "";

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const prev = segments[i - 1] ?? "";
      builtPath += `/${seg}`;

      const label = toLabel(seg, prev);
      if (!label) continue; // skip container segments

      const isLast = i === segments.length - 1;
      crumbs.push(isLast ? { label } : { label, href: builtPath });
    }

    return crumbs;
  }, [pathname]);
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

type TopbarProps = {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  onSearchOpen?: () => void;
};

export function AdminTopbar({ actions, onSearchOpen }: TopbarProps) {
  const router = useRouter();
  const crumbs = useAutoBreadcrumbs();
  const isDeep = crumbs.length > 2;
  const currentLabel = crumbs[crumbs.length - 1]?.label ?? "";

  const { data } = useGetAdminProfileQuery();
  const displayName = data?.user?.name || "Admin";
  const profilePicture = data?.user?.profilePicture ?? null;
  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean);
    if (!parts.length) return "AD";
    return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""}`.toUpperCase() || "AD";
  }, [displayName]);

  async function handleLogout() {
    const csrfToken =
      document.cookie.split(";").map((p) => p.trim()).find((p) => p.startsWith("csrfToken="))?.split("=")[1] ?? "";
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
    });
    const { clearDesktopNotificationPromptFlag } = await import("@/lib/desktop-notifications");
    clearDesktopNotificationPromptFlag();
    router.replace("/login");
  }

  return (
    <header className="hidden min-w-0 items-center gap-3 border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur-sm lg:flex lg:px-5">
      {/* Left */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <div className="h-4 w-px shrink-0 bg-border" />

        {/* Back button on deep pages */}
        {isDeep && (
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        {/* Breadcrumbs */}
        {crumbs.length > 1 ? (
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap text-xs">
              {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                  <BreadcrumbItem key={`${crumb.label}-${i}`}>
                    {!isLast && i > 0 && <BreadcrumbSeparator />}
                    {isLast ? (
                      <BreadcrumbPage className="font-semibold text-foreground">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : crumb.href ? (
                      <>
                        {i > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbLink
                          render={<Link href={crumb.href} />}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {crumb.label}
                        </BreadcrumbLink>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">{crumb.label}</span>
                    )}
                  </BreadcrumbItem>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        ) : (
          <h1 className="truncate text-sm font-bold text-foreground">{currentLabel}</h1>
        )}
      </div>

      {/* Right */}
      <div className="flex shrink-0 items-center gap-1.5">
        {actions ?? null}

        {/* Search */}
        <button
          type="button"
          onClick={onSearchOpen}
          className="group flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/30 hover:bg-secondary hover:text-foreground"
          aria-label="Open search"
        >
          <Search className="h-3.5 w-3.5 shrink-0 transition group-hover:text-primary" aria-hidden />
          <span className="hidden xl:inline">Search…</span>
          <kbd className="hidden rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono xl:inline">⌘K</kbd>
        </button>

        <ThemeToggle />

        {/* User menu */}
        <Menu>
          <MenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-1.5 py-1 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            <div className="relative">
              <Avatar className="h-7 w-7 rounded-md border border-border">
                <AvatarImage src={profilePicture ?? undefined} alt={displayName} />
                <AvatarFallback className="rounded-md bg-secondary text-[10px] font-black text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span aria-hidden className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-card" />
            </div>
            <span className="hidden text-xs font-semibold text-foreground md:inline">{displayName}</span>
          </MenuTrigger>

          <MenuPopup align="end" className="w-48">
            <MenuGroup>
              <MenuGroupLabel className="truncate text-xs">{displayName}</MenuGroupLabel>
              <MenuItem className="gap-2 text-sm" onClick={() => router.push("/profile")}>
                <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                Profile
              </MenuItem>
              <MenuItem className="gap-2 text-sm" onClick={() => router.push("/settings")}>
                <Settings className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                Settings
              </MenuItem>
            </MenuGroup>
            <MenuSeparator />
            <MenuItem className="gap-2 text-sm text-destructive focus:text-destructive" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Logout
            </MenuItem>
          </MenuPopup>
        </Menu>
      </div>
    </header>
  );
}
