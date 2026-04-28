"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "../ui/command";
import {
  useGetAdminTeamsQuery,
  useGetBookingsQuery,
  useGetChatGroupsQuery,
  useGetFoodDiaryQuery,
  useGetPhysioReferralsQuery,
  useGetProgramsQuery,
  useGetThreadsQuery,
  useGetUsersQuery,
  useGetVideoUploadsQuery,
} from "../../lib/apiSlice";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaletteItem = {
  id: string;
  children: string;
  href?: string;
  keywords?: string[];
  onClick?: () => void;
};

type PaletteList = {
  id: string;
  heading: string;
  items: PaletteItem[];
};

type CmdItem = {
  value: string;
  label: string;
  onSelect: () => void;
};

type CmdGroup = {
  value: string;
  heading: string;
  items: CmdItem[];
};

type PaletteUser = {
  id: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  team?: string | null;
  programTier?: string | null;
  currentProgramTier?: string | null;
  guardianProgramTier?: string | null;
};

type PaletteTeam = {
  team: string;
  memberCount: number;
  youthCount: number;
  adultCount: number;
};

type PaletteBooking = {
  id?: number | null;
  name?: string | null;
  athlete?: string | null;
  athleteName?: string | null;
  serviceName?: string | null;
  type?: string | null;
  status?: string | null;
};

type PaletteThread = {
  userId: number;
  name?: string | null;
  preview?: string | null;
  unread?: number | null;
};

type PaletteGroup = {
  id: number;
  name?: string | null;
  category?: PaletteGroupCategory | null;
  createdAt?: string | null;
};

type PaletteGroupCategory = "announcement" | "coach_group" | "team";

type PaletteVideo = {
  id: number;
  athleteId?: number | null;
  athleteName?: string | null;
  notes?: string | null;
  feedback?: string | null;
  programSectionType?: string | null;
};

type PaletteProgram = {
  id: number;
  name?: string | null;
  type?: string | null;
  description?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
};

type PaletteFoodEntry = {
  id: number;
  athleteId?: number | null;
  athleteName?: string | null;
  guardianName?: string | null;
  guardianEmail?: string | null;
  notes?: string | null;
  feedback?: string | null;
};

type PaletteReferralEntry = {
  id: number;
  athleteId?: number | null;
  athleteName?: string | null;
  programTier?: string | null;
  referalLink?: string | null;
  status?: string | null;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_RESULTS_PER_GROUP = 10;
const USER_SEARCH_MIN_QUERY_LENGTH = 2;
const USER_SEARCH_FETCH_LIMIT = 50;
const SEARCH_RESOURCE_FETCH_LIMIT = 50;

const NAV_ITEMS: PaletteList = {
  id: "pages",
  heading: "Pages",
  items: [
    { id: "home", children: "Overview", href: "/", keywords: ["dashboard", "home"] },
    { id: "users", children: "Users & Tiers", href: "/users", keywords: ["athletes", "guardians", "clients"] },
    { id: "add-user", children: "Add user", href: "/users/add", keywords: ["new user", "create user"] },
    { id: "add-team", children: "Add team", href: "/users/add-team", keywords: ["new team", "create team"] },
    { id: "teams", children: "Teams", href: "/teams" },
    { id: "coaching", children: "Coaching", href: "/coaching", keywords: ["coach", "sessions"] },
    { id: "onboarding", children: "Onboarding", href: "/onboarding-config", keywords: ["onboard", "setup", "config"] },
    { id: "training-snapshot", children: "Client training", href: "/training-snapshot", keywords: ["training", "snapshot"] },
    { id: "top-athletes", children: "Top athletes", href: "/top-athletes", keywords: ["leaderboard", "ranking"] },
    { id: "tracking", children: "Tracking", href: "/tracking", keywords: ["activity", "progress"] },
    { id: "training-questionnaires", children: "Training answers", href: "/training-questionnaires", keywords: ["questionnaire", "answers", "forms"] },
    { id: "stats", children: "Stats", href: "/stats", keywords: ["analytics", "statistics"] },
    { id: "billing", children: "Billing", href: "/billing", keywords: ["payments", "invoices", "subscriptions"] },
    { id: "billing-approvals", children: "Billing — Pending approvals", href: "/billing/pending-approvals", keywords: ["approve", "pending", "billing"] },
    { id: "billing-plans", children: "Billing — Plans", href: "/billing/plans", keywords: ["plans", "tiers", "subscriptions"] },
    { id: "content-profile", children: "Content — Profile", href: "/content/profile", keywords: ["admin story", "photo", "cms", "home content"] },
    { id: "content-testimonials", children: "Content — Testimonials", href: "/content/testimonials", keywords: ["reviews", "submissions", "testimonials"] },
    { id: "content-intro-video", children: "Content — Intro Video", href: "/content/intro-video", keywords: ["video", "intro", "audience", "cms"] },
    { id: "gallery", children: "Gallery", href: "/gallery", keywords: ["photos", "images", "media"] },
    { id: "parent", children: "Parent Portal", href: "/parent", keywords: ["guardian", "parent hub"] },
    { id: "exercise-library", children: "Training content", href: "/exercise-library", keywords: ["exercises", "library", "workouts"] },
    { id: "messaging", children: "Messaging", href: "/messaging", keywords: ["chat", "threads", "inbox"] },
    { id: "video-review", children: "Video Feedback", href: "/video-review", keywords: ["video", "review", "uploads"] },
    { id: "bookings", children: "Schedule", href: "/bookings", keywords: ["calendar", "sessions", "appointments"] },
    { id: "nutrition", children: "Nutrition & Wellness", href: "/nutrition", keywords: ["food", "diary", "wellness", "nutrition"] },
    { id: "referrals", children: "Referrals", href: "/physio-referrals", keywords: ["physio", "referral"] },
    { id: "programs", children: "Programs", href: "/programs", keywords: ["plans", "curriculum"] },
    { id: "support", children: "Support", href: "/support" },
    { id: "settings", children: "Settings", href: "/settings" },
    { id: "preferences", children: "Preferences", href: "/preferences", keywords: ["display", "theme", "language"] },
    { id: "profile", children: "Profile", href: "/profile", keywords: ["account", "my profile"] },
    { id: "search", children: "Search", href: "/search", keywords: ["find", "global search"] },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function matchesQuery(query: string, values: unknown[]) {
  if (!query) return true;
  return values.some((value) => normalize(value).includes(query));
}

function toKeywords(values: unknown[]) {
  return values
    .filter((v) => v != null && String(v).trim().length > 0)
    .map((v) => String(v));
}

function classifyGroupCategory(group: { category?: string | null; name?: string | null }): PaletteGroupCategory {
  if (group?.category === "announcement" || group?.category === "coach_group" || group?.category === "team") {
    return group.category;
  }
  const n = String(group?.name ?? "").toLowerCase();
  if (/(announce|announcement|broadcast)/i.test(n)) return "announcement";
  if (/(team|squad|club)/i.test(n)) return "team";
  return "coach_group";
}

function formatGroupLabel(category: PaletteGroupCategory, name: string) {
  if (category === "announcement") return `Announcement: ${name}`;
  if (category === "team") return `Team chat: ${name}`;
  return `Coach inbox: ${name}`;
}

function filterGroups(groups: PaletteList[], search: string): PaletteList[] {
  if (!search.trim()) return groups;
  const q = search.trim().toLowerCase();
  return groups
    .map((list) => ({
      ...list,
      items: list.items.filter((item) => {
        const label = item.children.toLowerCase();
        const kw = (item.keywords ?? []).join(" ").toLowerCase();
        return label.includes(q) || kw.includes(q);
      }),
    }))
    .filter((list) => list.items.length > 0);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GlobalCommandPalette({
  open: controlledOpen,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const trimmedSearch = search.trim();

  const shouldFetchUsers = open && query.length >= USER_SEARCH_MIN_QUERY_LENGTH;
  const shouldFetchResources = open && query.length >= USER_SEARCH_MIN_QUERY_LENGTH;

  const { data: usersData } = useGetUsersQuery(
    shouldFetchUsers ? { q: trimmedSearch, limit: USER_SEARCH_FETCH_LIMIT } : undefined,
    { skip: !shouldFetchUsers },
  );
  const { data: teamsData } = useGetAdminTeamsQuery(undefined, { skip: !open });
  const { data: bookingsData } = useGetBookingsQuery(
    shouldFetchResources ? { q: trimmedSearch, limit: SEARCH_RESOURCE_FETCH_LIMIT } : undefined,
    { skip: !shouldFetchResources },
  );
  const { data: threadsData } = useGetThreadsQuery(
    shouldFetchResources ? { q: trimmedSearch, limit: SEARCH_RESOURCE_FETCH_LIMIT } : undefined,
    { skip: !shouldFetchResources },
  );
  const { data: videosData } = useGetVideoUploadsQuery(
    shouldFetchResources ? { q: trimmedSearch, limit: SEARCH_RESOURCE_FETCH_LIMIT } : undefined,
    { skip: !shouldFetchResources },
  );
  const { data: programsData } = useGetProgramsQuery(
    shouldFetchResources ? { q: trimmedSearch, limit: SEARCH_RESOURCE_FETCH_LIMIT } : undefined,
    { skip: !shouldFetchResources },
  );
  const { data: foodDiaryData } = useGetFoodDiaryQuery(
    shouldFetchResources ? { q: trimmedSearch, limit: SEARCH_RESOURCE_FETCH_LIMIT } : undefined,
    { skip: !shouldFetchResources },
  );
  const { data: referralsData } = useGetPhysioReferralsQuery(
    shouldFetchResources ? { q: trimmedSearch, limit: SEARCH_RESOURCE_FETCH_LIMIT } : undefined,
    { skip: !shouldFetchResources },
  );
  const { data: chatGroupsData } = useGetChatGroupsQuery(
    shouldFetchResources ? { q: trimmedSearch, limit: SEARCH_RESOURCE_FETCH_LIMIT } : undefined,
    { skip: !shouldFetchResources },
  );

  // Cmd/Ctrl+K toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = navigator?.platform?.toLowerCase().includes("mac");
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(!open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Clear search when dialog closes
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  // ── Quick actions ──
  const quickActions: PaletteList = useMemo(
    () => ({
      id: "quick-actions",
      heading: "Quick actions",
      items: [
        {
          id: "search-current",
          children: query ? `Search all data for "${trimmedSearch}"` : "Search all data",
          keywords: ["search", "find", "global", "results"],
          onClick: () => {
            if (!trimmedSearch) return;
            router.push(`/search?q=${encodeURIComponent(trimmedSearch)}`);
          },
        },
        {
          id: "go-bookings",
          children: "Create or review bookings",
          keywords: ["schedule", "calendar", "session"],
          onClick: () => router.push("/bookings"),
        },
        {
          id: "go-messages",
          children: "Open messaging inbox",
          keywords: ["chat", "threads", "announcement"],
          onClick: () => router.push("/messaging"),
        },
        {
          id: "logout",
          children: "Log out",
          keywords: ["sign out", "exit", "auth"],
          onClick: async () => {
            const csrfToken =
              document.cookie
                .split(";")
                .map((p) => p.trim())
                .find((p) => p.startsWith("csrfToken="))
                ?.split("=")[1] ?? "";
            await fetch("/api/auth/logout", {
              method: "POST",
              headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
            });
            const { clearDesktopNotificationPromptFlag } = await import("@/lib/desktop-notifications");
            clearDesktopNotificationPromptFlag();
            router.replace("/login");
          },
        },
      ],
    }),
    [query, router, trimmedSearch],
  );

  // ── Live data lists ──
  const dataLists = useMemo<PaletteList[]>(() => {
    const lists: PaletteList[] = [];

    const users = ((usersData?.users ?? []) as PaletteUser[])
      .filter((u) => matchesQuery(query, [u?.name, u?.email, u?.role, u?.team, u?.programTier, u?.currentProgramTier, u?.guardianProgramTier]))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((u) => ({
        id: `user-${u.id}`,
        children: `User: ${u?.name ?? u?.email ?? `#${u.id}`} ${u?.role ? `(${u.role})` : ""}`,
        onClick: () => router.push(`/users/${u.id}`),
        keywords: toKeywords([u?.name, u?.email, u?.role, u?.team, u?.programTier, u?.currentProgramTier, u?.guardianProgramTier]),
      }));
    if (users.length) lists.push({ id: "users-live", heading: `Users (${users.length})`, items: users });

    const teams = ((teamsData?.teams ?? []) as PaletteTeam[])
      .filter((t) => matchesQuery(query, [t?.team, t?.memberCount, t?.youthCount, t?.adultCount]))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((t) => ({
        id: `team-${t.team}`,
        children: `Team: ${t.team} (${t.youthCount} youth, ${t.adultCount} adult)`,
        onClick: () => router.push(`/teams/${encodeURIComponent(t.team)}`),
        keywords: toKeywords([t?.team, t?.memberCount, t?.youthCount, t?.adultCount]),
      }));
    if (teams.length) lists.push({ id: "teams-live", heading: `Teams (${teams.length})`, items: teams });

    const bookings = ((bookingsData?.bookings ?? []) as PaletteBooking[])
      .filter((b) => matchesQuery(query, [b?.id, b?.name, b?.athlete, b?.athleteName, b?.serviceName, b?.type, b?.status]))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((b) => {
        const bId = b?.id;
        const title = b?.name ?? b?.serviceName ?? b?.type ?? `Booking ${bId ?? ""}`;
        const athlete = b?.athlete ?? b?.athleteName ?? "Athlete";
        return {
          id: `booking-${bId ?? title}`,
          children: `Booking: ${title} - ${athlete}`,
          onClick: () => bId != null ? router.push(`/bookings/${bId}`) : router.push("/bookings"),
          keywords: toKeywords([bId, b?.name, b?.athlete, b?.athleteName, b?.serviceName, b?.type, b?.status]),
        };
      });
    if (bookings.length) lists.push({ id: "bookings-live", heading: `Bookings (${bookings.length})`, items: bookings });

    const threads = ((threadsData?.threads ?? []) as PaletteThread[])
      .filter((t) => matchesQuery(query, [t?.name, t?.preview, t?.unread, t?.userId]))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((t) => ({
        id: `thread-${t.userId}`,
        children: `Message: ${t?.name ?? `User ${t.userId}`}${t?.preview ? ` - ${t.preview}` : ""}`,
        onClick: () => router.push(`/messaging?tab=inbox&userId=${encodeURIComponent(String(t.userId))}`),
        keywords: toKeywords([t?.name, t?.preview, t?.userId, t?.unread]),
      }));
    if (threads.length) lists.push({ id: "threads-live", heading: `Messages (${threads.length})`, items: threads });

    const groupItems = ((chatGroupsData?.groups ?? []) as PaletteGroup[]).filter((g) =>
      matchesQuery(query, [g?.id, g?.name, g?.createdAt]),
    );
    const classified = groupItems.map((g) => {
      const cat = classifyGroupCategory(g);
      const name = g?.name ?? `Group ${g.id}`;
      return {
        cat,
        item: {
          id: `group-${g.id}`,
          children: formatGroupLabel(cat, name),
          onClick: () => router.push(`/messaging?tab=inbox&groupId=${encodeURIComponent(String(g.id))}`),
          keywords: toKeywords([g?.id, g?.name, cat]),
        },
      };
    });
    const announcements = classified.filter((x) => x.cat === "announcement").slice(0, MAX_RESULTS_PER_GROUP).map((x) => x.item);
    const coachGroups = classified.filter((x) => x.cat === "coach_group").slice(0, MAX_RESULTS_PER_GROUP).map((x) => x.item);
    const teamGroups = classified.filter((x) => x.cat === "team").slice(0, MAX_RESULTS_PER_GROUP).map((x) => x.item);
    if (announcements.length) lists.push({ id: "groups-announcements-live", heading: `Coach announcements (${announcements.length})`, items: announcements });
    if (coachGroups.length) lists.push({ id: "groups-coach-live", heading: `Coach inbox (${coachGroups.length})`, items: coachGroups });
    if (teamGroups.length) lists.push({ id: "groups-team-live", heading: `Team inbox (${teamGroups.length})`, items: teamGroups });

    const videos = ((videosData?.items ?? []) as PaletteVideo[])
      .filter((v) => matchesQuery(query, [v?.id, v?.athleteName, v?.notes, v?.feedback]))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((v) => ({
        id: `video-${v.id}`,
        children: `Video: ${v?.athleteName ?? `Athlete ${v?.athleteId ?? ""}`}${v?.notes ? ` - ${v.notes}` : ""}`,
        onClick: () => {
          const aId = Number(v?.athleteId);
          if (!Number.isFinite(aId) || aId <= 0) { router.push("/video-review"); return; }
          const tab = String(v?.programSectionType ?? "program").toLowerCase();
          router.push(`/video-review/athletes/${aId}?tab=${encodeURIComponent(tab)}&videoId=${encodeURIComponent(String(v.id))}`);
        },
        keywords: toKeywords([v?.id, v?.athleteName, v?.notes, v?.feedback]),
      }));
    if (videos.length) lists.push({ id: "videos-live", heading: `Videos (${videos.length})`, items: videos });

    const programs = ((programsData?.programs ?? []) as PaletteProgram[])
      .filter((p) => matchesQuery(query, [p?.id, p?.name, p?.type, p?.description, p?.minAge, p?.maxAge]))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((p) => ({
        id: `program-${p.id}`,
        children: `Program: ${p?.name ?? `#${p.id}`} (${p?.type ?? "type n/a"})`,
        onClick: () => router.push(`/programs?programId=${encodeURIComponent(String(p.id))}&action=manage`),
        keywords: toKeywords([p?.id, p?.name, p?.type, p?.description, p?.minAge, p?.maxAge]),
      }));
    if (programs.length) lists.push({ id: "programs-live", heading: `Programs (${programs.length})`, items: programs });

    const foodEntries = ((foodDiaryData?.items ?? []) as PaletteFoodEntry[])
      .filter((e) => matchesQuery(query, [e?.id, e?.athleteId, e?.athleteName, e?.guardianName, e?.guardianEmail, e?.notes, e?.feedback]))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((e) => ({
        id: `food-${e.id}`,
        children: `Food diary: ${e?.athleteName ?? `Athlete ${e?.athleteId ?? ""}`}${e?.notes ? ` - ${e.notes}` : ""}`,
        onClick: () => router.push("/nutrition"),
        keywords: toKeywords([e?.id, e?.athleteId, e?.athleteName, e?.guardianName, e?.guardianEmail, e?.notes, e?.feedback]),
      }));
    if (foodEntries.length) lists.push({ id: "food-live", heading: `Food diary (${foodEntries.length})`, items: foodEntries });

    const referrals = ((referralsData?.items ?? []) as PaletteReferralEntry[])
      .filter((e) => matchesQuery(query, [e?.id, e?.athleteId, e?.athleteName, e?.programTier, e?.referalLink, e?.status]))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((e) => ({
        id: `referral-${e.id}`,
        children: `Referral: ${e?.athleteName ?? `Athlete ${e?.athleteId ?? ""}`}${e?.programTier ? ` (${e.programTier})` : ""}`,
        onClick: () => router.push(`/physio-referrals?tab=existing&entryId=${encodeURIComponent(String(e.id))}&edit=1`),
        keywords: toKeywords([e?.id, e?.athleteId, e?.athleteName, e?.programTier, e?.referalLink, e?.status]),
      }));
    if (referrals.length) lists.push({ id: "referrals-live", heading: `Referrals (${referrals.length})`, items: referrals });

    return lists;
  }, [bookingsData, chatGroupsData, foodDiaryData, programsData, query, referralsData, router, teamsData, threadsData, usersData, videosData]);

  const totalDynamicItems = useMemo(
    () => dataLists.reduce((sum, list) => sum + list.items.length, 0),
    [dataLists],
  );

  // ── Combine → filter → convert to COSS Command format ──
  const allGroups: PaletteList[] = useMemo(
    () => [quickActions, NAV_ITEMS, ...dataLists],
    [dataLists, quickActions],
  );

  const commandGroups = useMemo<CmdGroup[]>(() => {
    const filtered = filterGroups(allGroups, search);
    return filtered.map((list) => ({
      value: list.id,
      heading: list.heading,
      items: list.items.map((item) => ({
        value: item.id,
        label: item.children,
        onSelect: () => {
          item.onClick?.();
          if (!item.onClick && item.href) router.push(item.href);
          setOpen(false);
          setSearch("");
        },
      })),
    }));
  }, [allGroups, router, search]);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandDialogPopup>
          <Command
            items={commandGroups}
            value={search}
            onValueChange={(v: string) => setSearch(v)}
            mode="none"
          >
            <CommandInput placeholder="Search users, teams, bookings, messages, content…" />
            <CommandEmpty>
              <div className="py-8 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            </CommandEmpty>
            <CommandList>
              {(group: CmdGroup, index: number) => (
                <React.Fragment key={group.value}>
                  <CommandGroup items={group.items}>
                    <CommandGroupLabel>{group.heading}</CommandGroupLabel>
                    <CommandCollection>
                      {(item: CmdItem) => (
                        <CommandItem
                          key={item.value}
                          value={item.value}
                          onClick={item.onSelect}
                        >
                          {item.label}
                        </CommandItem>
                      )}
                    </CommandCollection>
                  </CommandGroup>
                  {index < commandGroups.length - 1 && <CommandSeparator />}
                </React.Fragment>
              )}
            </CommandList>
            <CommandFooter>
              <span className="text-muted-foreground">
                {totalDynamicItems > 0 ? `${totalDynamicItems} live results` : "Type to search live data"}
              </span>
              <span className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <CommandShortcut>↑↓</CommandShortcut>
                  <span>navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <CommandShortcut>↵</CommandShortcut>
                  <span>select</span>
                </span>
                <span className="flex items-center gap-1">
                  <CommandShortcut>esc</CommandShortcut>
                  <span>close</span>
                </span>
              </span>
            </CommandFooter>
          </Command>
        </CommandDialogPopup>
      </CommandDialog>
    </>
  );
}
