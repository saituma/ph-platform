"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { useGetVideoUploadsQuery } from "../../lib/apiSlice";

type RawVideoUpload = {
  id: number;
  source?: "video_upload" | "program_completion";
  reviewedAt?: string | null;
  createdAt?: string | null;
  programSectionType?: string | null;
  programSectionTitle?: string | null;
  trainingSessionTitle?: string | null;
  sectionTitle?: string | null;
  athleteName?: string | null;
};

type SessionCard = {
  key: string;
  label: string;
  sectionType: string;
  uploads: number;
  awaiting: number;
  latestAt?: string | null;
  athletes: Set<string>;
};

function toSessionLabel(item: RawVideoUpload) {
  return item.trainingSessionTitle ?? item.programSectionTitle ?? item.sectionTitle ?? "General Uploads";
}

function toSessionType(item: RawVideoUpload) {
  return item.programSectionType ?? "program";
}

function toSessionKey(item: RawVideoUpload) {
  return `${toSessionType(item)}::${toSessionLabel(item)}`;
}

export default function VideoReviewSessionListPage() {
  const router = useRouter();
  const { data: videosData, isLoading } = useGetVideoUploadsQuery();

  const sessions = useMemo<SessionCard[]>(() => {
    const items: RawVideoUpload[] = Array.isArray(videosData?.items) ? videosData.items : [];
    const map = new Map<string, SessionCard>();

    for (const item of items) {
      const key = toSessionKey(item);
      const existing = map.get(key);
      const reviewed = Boolean(item.reviewedAt);
      const createdAt = item.createdAt ?? null;
      const athleteName = item.athleteName ?? "Athlete";
      if (!existing) {
        map.set(key, {
          key,
          label: toSessionLabel(item),
          sectionType: toSessionType(item),
          uploads: 1,
          awaiting: reviewed ? 0 : 1,
          latestAt: createdAt,
          athletes: new Set([athleteName]),
        });
      } else {
        existing.uploads += 1;
        existing.awaiting += reviewed ? 0 : 1;
        if (createdAt && (!existing.latestAt || createdAt > existing.latestAt)) {
          existing.latestAt = createdAt;
        }
        existing.athletes.add(athleteName);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.awaiting !== b.awaiting) return b.awaiting - a.awaiting;
      return (
        (b.latestAt ? new Date(b.latestAt).getTime() : 0) -
        (a.latestAt ? new Date(a.latestAt).getTime() : 0)
      );
    });
  }, [videosData]);

  return (
    <AdminShell title="Video Feedback" subtitle="Sessions with uploaded videos.">
      <SectionHeader
        title="Sessions"
        description="Click a session to open the detail page and review videos inline."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {isLoading && <div className="text-sm text-muted-foreground">Loading sessions…</div>}
        {!isLoading && sessions.length === 0 && (
          <div className="text-sm text-muted-foreground">No uploaded videos yet.</div>
        )}
        {sessions.map((session) => (
          <Card
            key={session.key}
            className="cursor-pointer border-border/70 transition hover:border-primary/50"
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/video-review/sessions/${encodeURIComponent(session.key)}`)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              router.push(`/video-review/sessions/${encodeURIComponent(session.key)}`);
            }}
          >
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{session.label}</div>
                  <div className="text-xs text-muted-foreground capitalize">{session.sectionType}</div>
                </div>
                {session.awaiting > 0 ? (
                  <Badge variant="secondary">{session.awaiting} awaiting</Badge>
                ) : (
                  <Badge>Reviewed</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <p>{session.uploads} videos</p>
              <p>{session.athletes.size} athletes</p>
              <p>
                Last upload:{" "}
                {session.latestAt ? new Date(session.latestAt).toLocaleString() : "Unknown"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}

