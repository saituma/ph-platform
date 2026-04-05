"use client";

import { useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  useGetAdminTeamsQuery,
  useGetBookingsQuery,
  useGetFoodDiaryQuery,
  useGetPhysioReferralsQuery,
  useGetProgramsQuery,
  useGetThreadsQuery,
  useGetUsersQuery,
  useGetVideoUploadsQuery,
} from "../../lib/apiSlice";

type SearchUser = {
  id: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  team?: string | null;
  programTier?: string | null;
  guardianProgramTier?: string | null;
  currentProgramTier?: string | null;
};

type SearchBooking = {
  id?: number | null;
  name?: string | null;
  serviceName?: string | null;
  status?: string | null;
  athleteName?: string | null;
  type?: string | null;
  startsAt?: string | null;
};

type SearchThread = {
  userId: number;
  name?: string | null;
  preview?: string | null;
  unread?: number | null;
};

type SearchVideo = {
  id: number;
  athleteId?: number | null;
  athleteName?: string | null;
  notes?: string | null;
  feedback?: string | null;
  programSectionType?: string | null;
};

type SearchTeam = {
  team?: string | null;
  memberCount?: number | null;
  guardianCount?: number | null;
};

type SearchProgram = {
  id: number;
  name?: string | null;
  type?: string | null;
  description?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
};

type SearchFood = {
  id: number;
  athleteId?: number | null;
  athleteName?: string | null;
  guardianName?: string | null;
  guardianEmail?: string | null;
  notes?: string | null;
  feedback?: string | null;
};

type SearchReferral = {
  id: number;
  athleteId?: number | null;
  athleteName?: string | null;
  programTier?: string | null;
  referalLink?: string | null;
  status?: string | null;
};

type PageResult = {
  id: string;
  label: string;
  href: string;
  keywords?: string[];
};

const PAGE_RESULTS: PageResult[] = [
  { id: "overview", label: "Overview", href: "/", keywords: ["dashboard", "home"] },
  { id: "users", label: "Users & Tiers", href: "/users", keywords: ["user", "athlete", "guardian"] },
  { id: "add-user", label: "Add user", href: "/users/add", keywords: ["create", "register", "athlete"] },
  { id: "add-team", label: "Add team", href: "/users/add-team", keywords: ["create", "team"] },
  { id: "teams", label: "Teams", href: "/teams", keywords: ["team", "squad"] },
  { id: "onboarding", label: "Onboarding", href: "/onboarding-config", keywords: ["onboarding", "forms"] },
  { id: "training", label: "Client training", href: "/training-snapshot", keywords: ["training", "snapshot"] },
  { id: "billing", label: "Billing", href: "/billing", keywords: ["payment", "invoice"] },
  { id: "content", label: "Content", href: "/content", keywords: ["cms"] },
  { id: "parent", label: "Parent Portal", href: "/parent", keywords: ["guardian", "parent"] },
  { id: "library", label: "Training content", href: "/exercise-library", keywords: ["exercise", "library"] },
  { id: "messaging", label: "Messaging", href: "/messaging", keywords: ["chat", "threads", "inbox"] },
  { id: "video", label: "Video Feedback", href: "/video-review", keywords: ["video", "review"] },
  { id: "bookings", label: "Schedule", href: "/bookings", keywords: ["booking", "calendar"] },
  { id: "food", label: "Food Diary", href: "/food-diary", keywords: ["nutrition"] },
  { id: "referrals", label: "Referrals", href: "/physio-referrals", keywords: ["physio", "referral"] },
  { id: "programs", label: "Programs", href: "/programs", keywords: ["tiers", "plans"] },
  { id: "support", label: "Support", href: "/support", keywords: ["help"] },
  { id: "settings", label: "Settings", href: "/settings", keywords: ["preferences"] },
  { id: "profile", label: "Profile", href: "/profile", keywords: ["account"] },
];

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function tokenize(query: string) {
  return normalize(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildSearchText(parts: Array<string | number | null | undefined>) {
  return normalize(
    parts
      .filter((part) => part != null && String(part).trim().length > 0)
      .map((part) => String(part))
      .join(" ")
  );
}

function scoreMatch(queryTokens: string[], text: string) {
  if (!queryTokens.length || !text) return 0;
  let score = 0;
  for (const token of queryTokens) {
    if (text.includes(token)) {
      score += text.startsWith(token) ? 4 : 2;
    }
  }
  return score;
}

function rankByQuery<T>(items: T[], queryTokens: string[], buildText: (item: T) => string) {
  return items
    .map((item) => {
      const text = buildText(item);
      const score = scoreMatch(queryTokens, text);
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

function SearchContent() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const queryTokens = useMemo(() => tokenize(query), [query]);

  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery();
  const { data: teamsData, isLoading: teamsLoading } = useGetAdminTeamsQuery();
  const { data: bookingsData, isLoading: bookingsLoading } = useGetBookingsQuery();
  const { data: programsData, isLoading: programsLoading } = useGetProgramsQuery();
  const { data: foodDiaryData, isLoading: foodDiaryLoading } = useGetFoodDiaryQuery();
  const { data: referralsData, isLoading: referralsLoading } = useGetPhysioReferralsQuery();
  const { data: threadsData, isLoading: threadsLoading } = useGetThreadsQuery();
  const { data: videosData, isLoading: videosLoading } = useGetVideoUploadsQuery();

  const pages = useMemo(
    () =>
      queryTokens.length
        ? rankByQuery(PAGE_RESULTS, queryTokens, (page) => buildSearchText([page.label, ...(page.keywords ?? [])]))
        : [],
    [queryTokens]
  );

  const users = useMemo(
    () =>
      queryTokens.length
        ? rankByQuery((usersData?.users ?? []) as SearchUser[], queryTokens, (user) =>
            buildSearchText([
              user.name,
              user.email,
              user.role,
              user.team,
              user.programTier,
              user.guardianProgramTier,
              user.currentProgramTier,
            ])
          )
        : [],
    [usersData, queryTokens]
  );

  const teams = useMemo(
    () =>
      queryTokens.length
        ? rankByQuery((teamsData?.teams ?? []) as SearchTeam[], queryTokens, (team) =>
            buildSearchText([team.team, team.memberCount, team.guardianCount])
          )
        : [],
    [teamsData, queryTokens]
  );

  const bookings = useMemo(() => {
    if (!queryTokens.length) return [];
    return rankByQuery((bookingsData?.bookings ?? []) as SearchBooking[], queryTokens, (booking) =>
      buildSearchText([
        booking.id,
        booking.name,
        booking.serviceName,
        booking.athleteName,
        booking.type,
        booking.status,
      ])
    );
  }, [bookingsData, queryTokens]);

  const threads = useMemo(() => {
    if (!queryTokens.length) return [];
    return rankByQuery((threadsData?.threads ?? []) as SearchThread[], queryTokens, (thread) =>
      buildSearchText([thread.userId, thread.name, thread.preview, thread.unread])
    );
  }, [threadsData, queryTokens]);

  const videos = useMemo(() => {
    if (!queryTokens.length) return [];
    return rankByQuery((videosData?.items ?? []) as SearchVideo[], queryTokens, (video) =>
      buildSearchText([video.id, video.athleteId, video.athleteName, video.notes, video.feedback, video.programSectionType])
    );
  }, [videosData, queryTokens]);

  const programs = useMemo(() => {
    if (!queryTokens.length) return [];
    return rankByQuery((programsData?.programs ?? []) as SearchProgram[], queryTokens, (program) =>
      buildSearchText([program.id, program.name, program.type, program.description, program.minAge, program.maxAge])
    );
  }, [programsData, queryTokens]);

  const foodEntries = useMemo(() => {
    if (!queryTokens.length) return [];
    return rankByQuery((foodDiaryData?.items ?? []) as SearchFood[], queryTokens, (entry) =>
      buildSearchText([
        entry.id,
        entry.athleteId,
        entry.athleteName,
        entry.guardianName,
        entry.guardianEmail,
        entry.notes,
        entry.feedback,
      ])
    );
  }, [foodDiaryData, queryTokens]);

  const referrals = useMemo(() => {
    if (!queryTokens.length) return [];
    return rankByQuery((referralsData?.items ?? []) as SearchReferral[], queryTokens, (entry) =>
      buildSearchText([entry.id, entry.athleteId, entry.athleteName, entry.programTier, entry.status, entry.referalLink])
    );
  }, [referralsData, queryTokens]);

  const isLoading =
    usersLoading ||
    teamsLoading ||
    bookingsLoading ||
    programsLoading ||
    foodDiaryLoading ||
    referralsLoading ||
    threadsLoading ||
    videosLoading;
  const hasResults =
    pages.length ||
    users.length ||
    teams.length ||
    bookings.length ||
    programs.length ||
    foodEntries.length ||
    referrals.length ||
    threads.length ||
    videos.length;

  return (
    <AdminShell
      title="Search Results"
      subtitle={query ? `Results for "${query}"` : "Enter a search term"}
      actions={
        query ? (
          <Button variant="outline" onClick={() => router.push("/bookings")}>
            Back to Schedule
          </Button>
        ) : null
      }
    >
      <div className="space-y-6">
        <SectionHeader
          title="Overview"
          description={isLoading ? "Searching..." : hasResults ? "Matches across the admin console." : "No results found."}
        />

        {!query ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Type a search query in the header to see results.
            </CardContent>
          </Card>
        ) : null}

        {pages.length ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-semibold text-foreground">Pages</p>
              {pages.map((page) => (
                <button
                  key={page.id}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-left text-sm transition hover:border-primary/40"
                  onClick={() => router.push(page.href)}
                >
                  <span>{page.label}</span>
                  <span className="text-xs text-muted-foreground">Open</span>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {users.length ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-semibold text-foreground">Users</p>
              {users.map((user) => (
                <button
                  key={user.id}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-left text-sm transition hover:border-primary/40"
                  onClick={() => router.push(`/users?highlight=${user.id}`)}
                >
                  <span>{user.name ?? user.email}</span>
                  <span className="text-xs text-muted-foreground">{user.role}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {teams.length ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-semibold text-foreground">Teams</p>
              {teams.map((team) => (
                <button
                  key={team.team ?? "unknown-team"}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-left text-sm transition hover:border-primary/40"
                  onClick={() => router.push(`/teams/${encodeURIComponent(String(team.team ?? "Unknown"))}`)}
                >
                  <span>{team.team ?? "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">
                    {team.memberCount ?? 0} athletes
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {bookings.length ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-semibold text-foreground">Bookings</p>
              {bookings.map((booking) => (
                <button
                  key={booking.id ?? `${booking.athleteName}-${booking.startsAt}`}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-left text-sm transition hover:border-primary/40"
                  onClick={() => router.push("/bookings")}
                >
                  <span>{booking.serviceName ?? booking.type ?? "Session"}</span>
                  <span className="text-xs text-muted-foreground">{booking.athleteName ?? "Athlete"}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {threads.length ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-semibold text-foreground">Messages</p>
              {threads.map((thread) => (
                <button
                  key={thread.userId}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-left text-sm transition hover:border-primary/40"
                  onClick={() => router.push(`/messaging?tab=inbox&userId=${thread.userId}`)}
                >
                  <span>{thread.name ?? "User"}</span>
                  <span className="text-xs text-muted-foreground">{thread.preview ?? ""}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {videos.length ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-semibold text-foreground">Video Feedback</p>
              {videos.map((video) => (
                <button
                  key={video.id}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-left text-sm transition hover:border-primary/40"
                  onClick={() => router.push("/video-review")}
                >
                  <span>{video.athleteName ?? "Athlete"}</span>
                  <span className="text-xs text-muted-foreground">{video.notes ?? "Video upload"}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {programs.length ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-semibold text-foreground">Programs</p>
              {programs.map((program) => (
                <button
                  key={program.id}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-left text-sm transition hover:border-primary/40"
                  onClick={() =>
                    router.push(`/programs?programId=${encodeURIComponent(String(program.id))}&action=manage`)
                  }
                >
                  <span>{program.name ?? `Program #${program.id}`}</span>
                  <span className="text-xs text-muted-foreground">{program.type ?? "Program"}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {foodEntries.length ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-semibold text-foreground">Food Diary</p>
              {foodEntries.map((entry) => (
                <button
                  key={entry.id}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-left text-sm transition hover:border-primary/40"
                  onClick={() => router.push(`/food-diary/entry/${entry.id}`)}
                >
                  <span>{entry.athleteName ?? `Athlete ${entry.athleteId ?? ""}`}</span>
                  <span className="text-xs text-muted-foreground">Entry #{entry.id}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {referrals.length ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-semibold text-foreground">Referrals</p>
              {referrals.map((entry) => (
                <button
                  key={entry.id}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-left text-sm transition hover:border-primary/40"
                  onClick={() =>
                    router.push(
                      `/physio-referrals?tab=existing&entryId=${encodeURIComponent(String(entry.id))}&edit=1`
                    )
                  }
                >
                  <span>{entry.athleteName ?? `Athlete ${entry.athleteId ?? ""}`}</span>
                  <span className="text-xs text-muted-foreground">{entry.programTier ?? "Referral"}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AdminShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
