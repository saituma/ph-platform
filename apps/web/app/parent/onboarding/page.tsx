"use client";

import Link from "next/link";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Skeleton } from "../../../components/ui/skeleton";
import { useGetOnboardingConfigQuery } from "../../../lib/apiSlice";

export default function ParentOnboardingPage() {
  const { data, isLoading } = useGetOnboardingConfigQuery();

  const config = data?.config ?? data;

  return (
    <ParentShell
      title="Onboarding"
      subtitle="Manage athlete onboarding configuration and review."
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Onboarding Configuration</CardTitle>
              <Badge variant="secondary">Admin</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : config ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-1 font-medium text-foreground">
                    Onboarding is {config.enabled !== false ? "enabled" : "disabled"}
                  </p>
                </div>
                <p className="text-muted-foreground">
                  Manage which fields parents see during registration and what documents are required.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No onboarding configuration found. Set up the form fields and documents required for athlete registration.
              </p>
            )}
            <Button variant="outline" render={<Link href="/portal-config" />}>
              Edit Onboarding Config
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed Onboarding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Review guardians who have completed the onboarding process and their submitted details.</p>
            <Button variant="outline" render={<Link href="/parent/completed" />}>
              View Completed
            </Button>
          </CardContent>
        </Card>
      </div>
    </ParentShell>
  );
}
