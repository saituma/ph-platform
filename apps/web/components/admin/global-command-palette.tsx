"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CommandPalette, { filterItems, getItemIndex } from "react-cmdk";
import { Search } from "lucide-react";
import "react-cmdk/dist/cmdk.css";

type PaletteItem = {
  id: string;
  children: string;
  href?: string;
  closeOnSelect?: boolean;
  keywords?: string[];
  onClick?: () => void;
};

type PaletteList = {
  id: string;
  heading: string;
  items: PaletteItem[];
};

const NAV_ITEMS: PaletteList[] = [
  {
    id: "overview",
    heading: "Overview",
    items: [{ id: "home", children: "Overview", href: "/", keywords: ["dashboard", "home"] }],
  },
  {
    id: "coaching",
    heading: "Premium coaching",
    items: [{ id: "coaching", children: "1:1 Coaching", href: "/coaching", keywords: ["premium", "athlete"] }],
  },
  {
    id: "people",
    heading: "People & programs",
    items: [
      { id: "users", children: "Users & Tiers", href: "/users" },
      { id: "add-user", children: "Add user", href: "/users/add" },
      { id: "add-team", children: "Add team", href: "/users/add-team" },
      { id: "teams", children: "Teams", href: "/teams" },
      { id: "onboarding", children: "Onboarding", href: "/onboarding-config" },
      { id: "training-snapshot", children: "Client training", href: "/training-snapshot" },
      { id: "billing", children: "Billing", href: "/billing" },
    ],
  },
  {
    id: "content",
    heading: "Content & parent hub",
    items: [
      { id: "content", children: "Content", href: "/content" },
      { id: "parent", children: "Parent Portal", href: "/parent" },
      { id: "exercise-library", children: "Training content", href: "/exercise-library" },
    ],
  },
  {
    id: "comms",
    heading: "Messages & video",
    items: [
      { id: "messaging", children: "Messaging", href: "/messaging" },
      { id: "video-review", children: "Video Feedback", href: "/video-review" },
    ],
  },
  {
    id: "schedule",
    heading: "Schedule & athlete care",
    items: [
      { id: "bookings", children: "Schedule", href: "/bookings" },
      { id: "food-diary", children: "Food Diary", href: "/food-diary" },
      { id: "referrals", children: "Referrals", href: "/physio-referrals" },
    ],
  },
  {
    id: "workspace",
    heading: "Workspace",
    items: [
      { id: "support", children: "Support", href: "/support" },
      { id: "settings", children: "Settings", href: "/settings" },
      { id: "profile", children: "Profile", href: "/profile" },
    ],
  },
];

export function GlobalCommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isMac = navigator?.platform?.toLowerCase().includes("mac");
      const hasModifier = isMac ? event.metaKey : event.ctrlKey;

      if (hasModifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen((current) => !current);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const quickActions: PaletteList = useMemo(
    () => ({
      id: "quick-actions",
      heading: "Quick actions",
      items: [
        {
          id: "search-current",
          children: search.trim() ? `Search app for \"${search.trim()}\"` : "Search app",
          closeOnSelect: true,
          onClick: () => {
            const query = search.trim();
            if (!query) return;
            router.push(`/search?q=${encodeURIComponent(query)}`);
          },
          keywords: ["search", "find"],
        },
        {
          id: "logout",
          children: "Log out",
          closeOnSelect: true,
          onClick: async () => {
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
          },
          keywords: ["sign out", "exit", "auth"],
        },
      ],
    }),
    [router, search]
  );

  const paletteItems = useMemo(() => {
    return [quickActions, ...NAV_ITEMS].map((list) => ({
      ...list,
      items: list.items.map((item) => ({
        ...item,
        closeOnSelect: item.closeOnSelect ?? true,
        onClick:
          item.onClick ??
          (() => {
            if (item.href) router.push(item.href);
          }),
      })),
    }));
  }, [quickActions, router]);

  const filteredItems = useMemo(() => filterItems(paletteItems, search), [paletteItems, search]);

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-none border border-border bg-background px-3 py-1.5 text-xs font-mono text-left hover:bg-secondary"
        onClick={() => setIsOpen(true)}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 uppercase text-muted-foreground">Quick find pages, actions, users...</span>
        <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">Ctrl/Cmd K</kbd>
      </button>

      <CommandPalette
        onChangeSearch={setSearch}
        onChangeOpen={setIsOpen}
        search={search}
        isOpen={isOpen}
        placeholder="Find pages and run actions..."
      >
        <CommandPalette.Page id="root">
          {filteredItems.length > 0 ? (
            filteredItems.map((list) => (
              <CommandPalette.List key={list.id} heading={list.heading}>
                {list.items.map(({ id, ...item }) => (
                  <CommandPalette.ListItem key={id} index={getItemIndex(filteredItems, id)} {...item} />
                ))}
              </CommandPalette.List>
            ))
          ) : (
            <CommandPalette.FreeSearchAction
              label="Search app for"
              onClick={() => {
                const query = search.trim();
                if (!query) return;
                router.push(`/search?q=${encodeURIComponent(query)}`);
                setIsOpen(false);
              }}
            />
          )}
        </CommandPalette.Page>
      </CommandPalette>
    </>
  );
}
