"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

type ApiErrorLike = {
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const apiError = error as ApiErrorLike;
    if (typeof apiError.message === "string") return apiError.message;
  }
  return fallback;
}

function getCsrfToken() {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("csrfToken="))
      ?.split("=")[1] ?? ""
  );
}

export default function AddTeamPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const cleanTeamName = teamName.trim();
    if (!cleanTeamName) {
      setError("Team name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/backend/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ teamName: cleanTeamName }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to create team.");
      }

      const nextTeamName = String(payload?.team ?? cleanTeamName);
      router.push(`/teams/${encodeURIComponent(nextTeamName)}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create team."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminShell
      title="Add team"
      subtitle="Create a team by name. Members can be assigned later."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/users" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>
        </Button>
      }
    >
      <form onSubmit={createTeam} className="mx-auto grid max-w-4xl gap-6">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>Create the team name.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team name</Label>
              <Input
                id="teamName"
                required
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="e.g. U14 Phoenix"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="ghost" asChild>
            <Link href="/teams">Cancel</Link>
          </Button>
          <Button type="submit" disabled={!teamName.trim() || isSubmitting}>
            {isSubmitting ? "Creating…" : "Create team"}
          </Button>
        </div>
      </form>
    </AdminShell>
  );
}
