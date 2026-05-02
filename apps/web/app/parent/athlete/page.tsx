"use client";

import { useMemo } from "react";
import Link from "next/link";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { useGetUsersQuery } from "../../../lib/apiSlice";

export default function ParentAthletePage() {
  const { data: usersData, isLoading } = useGetUsersQuery();

  const athletes = useMemo(() => {
    const users = usersData?.users ?? [];
    return users
      .filter((u: { role?: string }) => u.role === "athlete" || u.role === "guardian")
      .slice(0, 20);
  }, [usersData]);

  return (
    <ParentShell
      title="Athlete Profiles"
      subtitle="Overview of athletes linked to parent/guardian accounts."
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={`skel-${i}`} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : athletes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No athletes found yet.</p>
            <Button variant="outline" className="mt-4" render={<Link href="/users/add" />}>
              Add Athlete
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {athletes.map((athlete: { id: number; name: string; email: string; role?: string; status?: string; program?: string | null; athleteType?: string | null }) => (
            <Link key={athlete.id} href={`/users/${athlete.id}`}>
              <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{athlete.name}</CardTitle>
                    <Badge variant={athlete.status === "Active" ? "default" : "secondary"}>
                      {athlete.status ?? "—"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>{athlete.email}</p>
                  {athlete.program && <p className="text-xs">Program: {athlete.program}</p>}
                  {athlete.athleteType && (
                    <p className="text-xs capitalize">Type: {athlete.athleteType}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </ParentShell>
  );
}
