"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Skeleton } from "../../ui/skeleton";

type MessagingTab = "inbox" | "announcement" | "teams" | "stats" | "stories";

type StatsTabProps = {
  stats: {
    totalAnnouncements: number;
    totalThreads: number;
    unreadThreads: number;
    totalTeams: number;
    totalGroups: number;
  };
  isLoading: boolean;
  onNavigateToTab: (tab: MessagingTab) => void;
};

const STAT_TILES: Array<{ label: string; key: keyof StatsTabProps["stats"]; tab: MessagingTab }> = [
  { label: "Announcements", key: "totalAnnouncements", tab: "announcement" },
  { label: "Inbox threads", key: "totalThreads", tab: "inbox" },
  { label: "Unread messages", key: "unreadThreads", tab: "inbox" },
  { label: "Teams", key: "totalTeams", tab: "teams" },
  { label: "Inbox groups", key: "totalGroups", tab: "inbox" },
];

export function StatsTab({ stats, isLoading, onNavigateToTab }: StatsTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {STAT_TILES.map((tile) => (
        <button
          key={tile.key}
          type="button"
          onClick={() => onNavigateToTab(tile.tab)}
          className="text-left transition hover:opacity-80"
          aria-label={`Go to ${tile.label}`}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {tile.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-14" />
              ) : (
                <p className="text-3xl font-semibold text-foreground">
                  {stats[tile.key]}
                </p>
              )}
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
