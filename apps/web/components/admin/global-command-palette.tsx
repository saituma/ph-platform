"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CommandPalette, { filterItems, getItemIndex } from "react-cmdk";
import { Search } from "lucide-react";
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
  guardianCount: number;
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
  createdAt?: string | null;
};

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

const MAX_RESULTS_PER_GROUP = 10;

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function matchesQuery(query: string, values: unknown[]) {
  if (!query) return true;
  return values.some((value) => normalize(value).includes(query));
}

function toKeywords(values: unknown[]) {
  return values
    .filter((value) => value != null && String(value).trim().length > 0)
    .map((value) => String(value));
}

const NAV_ITEMS: PaletteList = {
  id: "pages",
  heading: "Pages",
  items: [
    {
      id: "home",
      children: "Overview",
      href: "/",
      keywords: ["dashboard", "home"],
    },
    {
      id: "coaching",
      children: "1:1 Coaching",
      href: "/coaching",
      keywords: ["premium", "athlete"],
    },
    { id: "users", children: "Users & Tiers", href: "/users" },
    { id: "add-user", children: "Add user", href: "/users/add" },
    { id: "add-team", children: "Add team", href: "/users/add-team" },
    { id: "teams", children: "Teams", href: "/teams" },
    { id: "onboarding", children: "Onboarding", href: "/onboarding-config" },
    {
      id: "training-snapshot",
      children: "Client training",
      href: "/training-snapshot",
    },
    { id: "billing", children: "Billing", href: "/billing" },
    { id: "content", children: "Content", href: "/content" },
    { id: "parent", children: "Parent Portal", href: "/parent" },
    {
      id: "exercise-library",
      children: "Training content",
      href: "/exercise-library",
    },
    { id: "messaging", children: "Messaging", href: "/messaging" },
    { id: "video-review", children: "Video Feedback", href: "/video-review" },
    { id: "bookings", children: "Schedule", href: "/bookings" },
    { id: "food-diary", children: "Food Diary", href: "/food-diary" },
    { id: "referrals", children: "Referrals", href: "/physio-referrals" },
    { id: "programs", children: "Programs", href: "/programs" },
    { id: "support", children: "Support", href: "/support" },
    { id: "settings", children: "Settings", href: "/settings" },
    { id: "profile", children: "Profile", href: "/profile" },
  ],
};

export function GlobalCommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();

  const { data: usersData } = useGetUsersQuery(undefined, { skip: !isOpen });
  const { data: teamsData } = useGetAdminTeamsQuery(undefined, {
    skip: !isOpen,
  });
  const { data: bookingsData } = useGetBookingsQuery(undefined, {
    skip: !isOpen,
  });
  const { data: threadsData } = useGetThreadsQuery(undefined, {
    skip: !isOpen,
  });
  const { data: videosData } = useGetVideoUploadsQuery(undefined, {
    skip: !isOpen,
  });
  const { data: programsData } = useGetProgramsQuery(undefined, {
    skip: !isOpen,
  });
  const { data: foodDiaryData } = useGetFoodDiaryQuery(undefined, {
    skip: !isOpen,
  });
  const { data: referralsData } = useGetPhysioReferralsQuery(undefined, {
    skip: !isOpen,
  });
  const { data: chatGroupsData } = useGetChatGroupsQuery(undefined, {
    skip: !isOpen,
  });

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
          children: query
            ? `Search all data for \"${search.trim()}\"`
            : "Search all data",
          closeOnSelect: true,
          onClick: () => {
            const text = search.trim();
            if (!text) return;
            router.push(`/search?q=${encodeURIComponent(text)}`);
          },
          keywords: ["search", "find", "global", "results"],
        },
        {
          id: "go-bookings",
          children: "Create or review bookings",
          closeOnSelect: true,
          onClick: () => router.push("/bookings"),
          keywords: ["schedule", "calendar", "session"],
        },
        {
          id: "go-messages",
          children: "Open messaging inbox",
          closeOnSelect: true,
          onClick: () => router.push("/messaging"),
          keywords: ["chat", "threads", "announcement"],
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

            const { clearDesktopNotificationPromptFlag } =
              await import("@/lib/desktop-notifications");
            clearDesktopNotificationPromptFlag();
            router.replace("/login");
          },
          keywords: ["sign out", "exit", "auth"],
        },
      ],
    }),
    [query, router, search],
  );

  const dataLists = useMemo<PaletteList[]>(() => {
    const lists: PaletteList[] = [];

    const userItems = (usersData?.users ?? []) as PaletteUser[];
    const users = userItems
      .filter((user) =>
        matchesQuery(query, [
          user?.name,
          user?.email,
          user?.role,
          user?.team,
          user?.programTier,
          user?.currentProgramTier,
          user?.guardianProgramTier,
        ]),
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((user) => ({
        id: `user-${user.id}`,
        children: `User: ${user?.name ?? user?.email ?? `#${user.id}`} ${user?.role ? `(${user.role})` : ""}`,
        closeOnSelect: true,
        onClick: () => router.push(`/users/${user.id}`),
        keywords: toKeywords([
          user?.name,
          user?.email,
          user?.role,
          user?.team,
          user?.programTier,
          user?.currentProgramTier,
          user?.guardianProgramTier,
        ]),
      }));

    if (users.length) {
      lists.push({
        id: "users-live",
        heading: `Users (${users.length})`,
        items: users,
      });
    }

    const teamItems = (teamsData?.teams ?? []) as PaletteTeam[];
    const teams = teamItems
      .filter((team) =>
        matchesQuery(query, [
          team?.team,
          team?.memberCount,
          team?.guardianCount,
        ]),
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((team) => ({
        id: `team-${team.team}`,
        children: `Team: ${team.team} (${team.memberCount} athletes, ${team.guardianCount} guardians)`,
        closeOnSelect: true,
        onClick: () => router.push(`/teams/${encodeURIComponent(team.team)}`),
        keywords: toKeywords([
          team?.team,
          team?.memberCount,
          team?.guardianCount,
        ]),
      }));

    if (teams.length) {
      lists.push({
        id: "teams-live",
        heading: `Teams (${teams.length})`,
        items: teams,
      });
    }

    const bookingItems = (bookingsData?.bookings ?? []) as PaletteBooking[];
    const bookings = bookingItems
      .filter((booking) =>
        matchesQuery(query, [
          booking?.id,
          booking?.name,
          booking?.athlete,
          booking?.athleteName,
          booking?.serviceName,
          booking?.type,
          booking?.status,
        ]),
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((booking) => {
        const bookingId = booking?.id;
        const title =
          booking?.name ??
          booking?.serviceName ??
          booking?.type ??
          `Booking ${bookingId ?? ""}`;
        const athlete = booking?.athlete ?? booking?.athleteName ?? "Athlete";
        return {
          id: `booking-${bookingId ?? title}`,
          children: `Booking: ${title} - ${athlete}`,
          closeOnSelect: true,
          onClick: () => {
            if (bookingId != null) {
              router.push(`/bookings/${bookingId}`);
              return;
            }
            router.push("/bookings");
          },
          keywords: toKeywords([
            bookingId,
            booking?.name,
            booking?.athlete,
            booking?.athleteName,
            booking?.serviceName,
            booking?.type,
            booking?.status,
          ]),
        };
      });

    if (bookings.length) {
      lists.push({
        id: "bookings-live",
        heading: `Bookings (${bookings.length})`,
        items: bookings,
      });
    }

    const threadItems = (threadsData?.threads ?? []) as PaletteThread[];
    const threads = threadItems
      .filter((thread) =>
        matchesQuery(query, [
          thread?.name,
          thread?.preview,
          thread?.unread,
          thread?.userId,
        ]),
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((thread) => ({
        id: `thread-${thread.userId}`,
        children: `Message: ${thread?.name ?? `User ${thread.userId}`} ${thread?.preview ? `- ${thread.preview}` : ""}`,
        closeOnSelect: true,
        onClick: () =>
          router.push(
            `/messaging?tab=inbox&userId=${encodeURIComponent(String(thread.userId))}`,
          ),
        keywords: toKeywords([
          thread?.name,
          thread?.preview,
          thread?.userId,
          thread?.unread,
        ]),
      }));

    if (threads.length) {
      lists.push({
        id: "threads-live",
        heading: `Messages (${threads.length})`,
        items: threads,
      });
    }

    const groupItems = (chatGroupsData?.groups ?? []) as PaletteGroup[];
    const groups = groupItems
      .filter((group) =>
        matchesQuery(query, [group?.id, group?.name, group?.createdAt]),
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((group) => ({
        id: `group-${group.id}`,
        children: `Group: ${group?.name ?? `Group ${group.id}`}`,
        closeOnSelect: true,
        onClick: () =>
          router.push(
            `/messaging?tab=inbox&groupId=${encodeURIComponent(String(group.id))}`,
          ),
        keywords: toKeywords([group?.id, group?.name, group?.createdAt]),
      }));

    if (groups.length) {
      lists.push({
        id: "groups-live",
        heading: `Groups (${groups.length})`,
        items: groups,
      });
    }

    const videoItems = (videosData?.items ?? []) as PaletteVideo[];
    const videos = videoItems
      .filter((video) =>
        matchesQuery(query, [
          video?.id,
          video?.athleteName,
          video?.notes,
          video?.feedback,
        ]),
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((video) => ({
        id: `video-${video.id}`,
        children: `Video: ${video?.athleteName ?? `Athlete ${video?.athleteId ?? ""}`} ${video?.notes ? `- ${video.notes}` : ""}`,
        closeOnSelect: true,
        onClick: () => {
          const athleteId = Number(video?.athleteId);
          if (!Number.isFinite(athleteId) || athleteId <= 0) {
            router.push("/video-review");
            return;
          }
          const tab = String(
            video?.programSectionType ?? "program",
          ).toLowerCase();
          router.push(
            `/video-review/athletes/${athleteId}?tab=${encodeURIComponent(tab)}&videoId=${encodeURIComponent(String(video.id))}`,
          );
        },
        keywords: toKeywords([
          video?.id,
          video?.athleteName,
          video?.notes,
          video?.feedback,
        ]),
      }));

    if (videos.length) {
      lists.push({
        id: "videos-live",
        heading: `Videos (${videos.length})`,
        items: videos,
      });
    }

    const programItems = (programsData?.programs ?? []) as PaletteProgram[];
    const programs = programItems
      .filter((program) =>
        matchesQuery(query, [
          program?.id,
          program?.name,
          program?.type,
          program?.description,
          program?.minAge,
          program?.maxAge,
        ]),
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((program) => ({
        id: `program-${program.id}`,
        children: `Program: ${program?.name ?? `#${program.id}`} (${program?.type ?? "type n/a"})`,
        closeOnSelect: true,
        onClick: () =>
          router.push(
            `/programs?programId=${encodeURIComponent(String(program.id))}&action=manage`,
          ),
        keywords: toKeywords([
          program?.id,
          program?.name,
          program?.type,
          program?.description,
          program?.minAge,
          program?.maxAge,
        ]),
      }));

    if (programs.length) {
      lists.push({
        id: "programs-live",
        heading: `Programs (${programs.length})`,
        items: programs,
      });
    }

    const foodItems = (foodDiaryData?.items ?? []) as PaletteFoodEntry[];
    const foodEntries = foodItems
      .filter((entry) =>
        matchesQuery(query, [
          entry?.id,
          entry?.athleteId,
          entry?.athleteName,
          entry?.guardianName,
          entry?.guardianEmail,
          entry?.notes,
          entry?.feedback,
        ]),
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((entry) => ({
        id: `food-${entry.id}`,
        children: `Food diary: ${entry?.athleteName ?? `Athlete ${entry?.athleteId ?? ""}`} ${entry?.notes ? `- ${entry.notes}` : ""}`,
        closeOnSelect: true,
        onClick: () =>
          router.push(
            entry?.id ? `/food-diary/entry/${entry.id}` : "/food-diary",
          ),
        keywords: toKeywords([
          entry?.id,
          entry?.athleteId,
          entry?.athleteName,
          entry?.guardianName,
          entry?.guardianEmail,
          entry?.notes,
          entry?.feedback,
        ]),
      }));

    if (foodEntries.length) {
      lists.push({
        id: "food-live",
        heading: `Food diary (${foodEntries.length})`,
        items: foodEntries,
      });
    }

    const referralItems = (referralsData?.items ??
      []) as PaletteReferralEntry[];
    const referrals = referralItems
      .filter((entry) =>
        matchesQuery(query, [
          entry?.id,
          entry?.athleteId,
          entry?.athleteName,
          entry?.programTier,
          entry?.referalLink,
          entry?.status,
        ]),
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((entry) => ({
        id: `referral-${entry.id}`,
        children: `Referral: ${entry?.athleteName ?? `Athlete ${entry?.athleteId ?? ""}`} ${entry?.programTier ? `(${entry.programTier})` : ""}`,
        closeOnSelect: true,
        onClick: () =>
          router.push(
            `/physio-referrals?tab=existing&entryId=${encodeURIComponent(String(entry.id))}&edit=1`,
          ),
        keywords: toKeywords([
          entry?.id,
          entry?.athleteId,
          entry?.athleteName,
          entry?.programTier,
          entry?.referalLink,
          entry?.status,
        ]),
      }));

    if (referrals.length) {
      lists.push({
        id: "referrals-live",
        heading: `Referrals (${referrals.length})`,
        items: referrals,
      });
    }

    return lists;
  }, [
    bookingsData,
    foodDiaryData,
    programsData,
    query,
    referralsData,
    router,
    chatGroupsData,
    teamsData,
    threadsData,
    usersData,
    videosData,
  ]);

  const totalDynamicItems = useMemo(
    () => dataLists.reduce((sum, list) => sum + list.items.length, 0),
    [dataLists],
  );

  const paletteItems = useMemo(() => {
    const allLists: PaletteList[] = [quickActions, NAV_ITEMS, ...dataLists];
    return allLists.map((list) => ({
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
  }, [dataLists, quickActions, router]);
  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
    Ctrl/Cmd K
  </kbd>;

  const filteredItems = useMemo(
    () => filterItems(paletteItems, search, { filterOnListHeading: true }),
    [paletteItems, search],
  );

  return (
    <>
      <button
        type="button"
        className="group flex w-full items-center gap-2 rounded-md border border-border bg-gradient-to-r from-background to-secondary/25 px-3 py-2 text-xs text-left shadow-sm transition hover:border-primary/40 hover:from-background hover:to-secondary/50"
        onClick={() => setIsOpen(true)}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" />
        <span className="flex-1 text-muted-foreground">
          Find users, bookings, teams, messages, content...
        </span>
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
          Ctrl/Cmd K
        </kbd>
      </button>

      <CommandPalette
        onChangeSearch={setSearch}
        onChangeOpen={setIsOpen}
        search={search}
        isOpen={isOpen}
        page="root"
        placeholder="Search everything... users, teams, bookings, messages"
        footer={
          <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
            <span>{totalDynamicItems} live results indexed</span>
            <span>Enter to open</span>
          </div>
        }
      >
        <CommandPalette.Page id="root">
          {filteredItems.length > 0 ? (
            filteredItems.map((list) => (
              <CommandPalette.List key={list.id} heading={list.heading}>
                {list.items.map(({ id, ...item }) => (
                  <CommandPalette.ListItem
                    key={id}
                    index={getItemIndex(filteredItems, id)}
                    showType={false}
                    {...item}
                  />
                ))}
              </CommandPalette.List>
            ))
          ) : (
            <CommandPalette.FreeSearchAction
              label="Search app for"
              onClick={() => {
                const text = search.trim();
                if (!text) return;
                router.push(`/search?q=${encodeURIComponent(text)}`);
                setIsOpen(false);
              }}
            />
          )}
        </CommandPalette.Page>
      </CommandPalette>
    </>
  );
}
