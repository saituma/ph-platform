"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Dumbbell, ExternalLink, User } from "lucide-react";

import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { SectionHeader } from "../section-header";
import { useGetAdultAthletesQuery } from "../../../lib/apiSlice";

export function AdultAthleteAssignment() {
  const { data: athletesData, isLoading: athletesLoading } = useGetAdultAthletesQuery();

  const [search, setSearch] = useState("");

  const athletes = athletesData?.athletes ?? [];

  const filteredAthletes = useMemo(() => {
    if (!search.trim()) return athletes;
    const q = search.toLowerCase();
    return athletes.filter((a: any) => a.name?.toLowerCase().includes(q));
  }, [athletes, search]);

  return (
    <div className="mt-6 space-y-4">
      <SectionHeader
        title="Adult Athletes"
        description="Open an athlete's profile to view training progress, video responses, and assign programs."
      />
      <Input
        placeholder="Search athletes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {athletesLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary/40" />
          ))}
        </div>
      ) : filteredAthletes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <User className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="font-semibold text-foreground">
            {search.trim() ? "No athletes match your search." : "No adult athletes found."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAthletes.map((athlete: any) => (
            <div
              key={athlete.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {athlete.name ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {athlete.age ? `Age ${athlete.age}` : "Age unknown"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 min-h-[24px]">
                {(athlete.assignments ?? []).length === 0 ? (
                  <span className="text-xs text-muted-foreground">No programs assigned</span>
                ) : (
                  (athlete.assignments ?? []).map((a: any) => (
                    <Badge key={a.id} variant="secondary" className="text-[10px] gap-1">
                      <Dumbbell className="h-2.5 w-2.5" />
                      {a.programName}
                    </Badge>
                  ))
                )}
              </div>

              <Link href={`/athletes/${athlete.id}`} className="block">
                <Button variant="outline" size="sm" className="w-full gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Profile
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
