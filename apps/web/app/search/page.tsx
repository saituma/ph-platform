"use client";

import { useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  useGetBookingsQuery,
  useGetThreadsQuery,
  useGetUsersQuery,
  useGetVideoUploadsQuery,
} from "../../lib/apiSlice";

function normalize(value: string) {
  return value.toLowerCase();
}

function SearchContent() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const q = normalize(query);

  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery();
  const { data: bookingsData, isLoading: bookingsLoading } = useGetBookingsQuery();
  const { data: threadsData, isLoading: threadsLoading } = useGetThreadsQuery();
  const { data: videosData, isLoading: videosLoading } = useGetVideoUploadsQuery();

  const users = useMemo(() => {
    const list = usersData?.users ?? [];
    if (!q) return [];
    return list.filter((user: any) =>
      [user.name, user.email, user.role].filter(Boolean).some((value) => normalize(String(value)).includes(q))
    );
  }, [usersData, q]);

  const bookings = useMemo(() => {
    const list = bookingsData?.bookings ?? [];
    if (!q) return [];
    return list.filter((booking: any) =>
      [booking.serviceName, booking.athleteName, booking.type]
        .filter(Boolean)
        .some((value) => normalize(String(value)).includes(q))
    );
  }, [bookingsData, q]);

  const threads = useMemo(() => {
    const list = threadsData?.threads ?? [];
    if (!q) return [];
    return list.filter((thread: any) =>
      [thread.name, thread.preview].filter(Boolean).some((value) => normalize(String(value)).includes(q))
    );
  }, [threadsData, q]);

  const videos = useMemo(() => {
    const list = videosData?.items ?? [];
    if (!q) return [];
    return list.filter((video: any) =>
      [video.athleteName, video.notes, video.feedback]
        .filter(Boolean)
        .some((value) => normalize(String(value)).includes(q))
    );
  }, [videosData, q]);

  const isLoading = usersLoading || bookingsLoading || threadsLoading || videosLoading;
  const hasResults = users.length || bookings.length || threads.length || videos.length;

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

        {users.length ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-semibold text-foreground">Users</p>
              {users.map((user: any) => (
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

        {bookings.length ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-semibold text-foreground">Bookings</p>
              {bookings.map((booking: any) => (
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
              {threads.map((thread: any) => (
                <button
                  key={thread.userId}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-left text-sm transition hover:border-primary/40"
                  onClick={() => router.push(`/messaging?user=${thread.userId}`)}
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
              {videos.map((video: any) => (
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
