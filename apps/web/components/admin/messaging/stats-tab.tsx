"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";

type StatsTabProps = {
  stats: {
    totalAnnouncements: number;
    totalThreads: number;
    unreadThreads: number;
    totalTeams: number;
    totalGroups: number;
  };
};

export function StatsTab({ stats }: StatsTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-foreground">
            {stats.totalAnnouncements}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Inbox threads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-foreground">
            {stats.totalThreads}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Unread messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-foreground">
            {stats.unreadThreads}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Teams
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-foreground">
            {stats.totalTeams}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Inbox groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-foreground">
            {stats.totalGroups}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
