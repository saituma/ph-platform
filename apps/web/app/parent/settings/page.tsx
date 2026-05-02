"use client";

import Link from "next/link";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { useGetAdminProfileQuery } from "../../../lib/apiSlice";

export default function ParentSettingsPage() {
  const { data, isLoading } = useGetAdminProfileQuery();
  const settings = data?.settings;
  const user = data?.user;

  return (
    <ParentShell title="Settings" subtitle="Portal preferences and account settings.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="mt-1 font-medium text-foreground">{user?.name ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="mt-1 font-medium text-foreground">{user?.email ?? "—"}</p>
                </div>
              </>
            )}
            <Button variant="outline" render={<Link href="/settings" />}>
              Full Settings
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground">Timezone</p>
                  <p className="mt-1 font-medium text-foreground">{settings?.timezone ?? "Not set"}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground">Notifications</p>
                  <p className="mt-1 font-medium text-foreground">
                    {settings?.notificationSummary ?? "Default"}
                  </p>
                </div>
              </>
            )}
            <Button variant="outline" render={<Link href="/settings" />}>
              Edit Preferences
            </Button>
          </CardContent>
        </Card>
      </div>
    </ParentShell>
  );
}
