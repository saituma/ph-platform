"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  fromStorageAudienceLabel,
  AudienceSummary,
  PROGRAM_TIERS,
  isYouthAgeAudienceLabel,
  isAdultStorageAudienceLabel,
  isTeamStorageAudienceLabel,
  toTeamStorageAudienceLabel,
  fromTeamStorageAudienceLabel,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../components/admin/training-content-v2/api";

const BASE_AGE_CARDS = Array.from({ length: 12 }, (_, index) =>
  String(index + 7),
);
const ADULT_TIER_CARDS = PROGRAM_TIERS.map((tier) => tier.label);

type AudienceCard = {
  label: string;
  moduleCount: number;
  otherCount: number;
};

type TeamSummary = {
  team: string;
  memberCount: number;
  youthCount: number;
  adultCount: number;
};

export default function ExerciseLibraryAudiencePage() {
  const searchParams = useSearchParams();
  const [audiences, setAudiences] = useState<AudienceSummary[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [viewMode, setViewMode] = useState<"youth" | "adult" | "team">(
    (searchParams.get("mode") as any) === "team"
      ? "team"
      : searchParams.get("mode") === "adult"
        ? "adult"
        : "youth",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [audienceInput, setAudienceInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);

  const loadAudiences = async () => {
    setIsLoading(true);
    try {
      const data = await trainingContentRequest<{ items: AudienceSummary[] }>(
        "/admin/audiences",
      );
      setAudiences(data.items ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ages.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeams = async () => {
    setIsTeamsLoading(true);
    try {
      const response = await fetch("/api/backend/admin/teams", {
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load teams.");
      }
      setTeams(Array.isArray(payload?.teams) ? payload.teams : []);
      setTeamError(null);
    } catch (err) {
      setTeamError(
        err instanceof Error ? err.message : "Failed to load teams.",
      );
    } finally {
      setIsTeamsLoading(false);
    }
  };

  useEffect(() => {
    void loadAudiences();
  }, []);

  useEffect(() => {
    if (viewMode !== "team") return;
    void loadTeams();
  }, [viewMode]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "team") setViewMode("team");
    else if (mode === "adult") setViewMode("adult");
    else setViewMode("youth");
  }, [searchParams]);

  const normalizedAudience = normalizeAudienceLabelInput(audienceInput);

  const youthCards = useMemo<AudienceCard[]>(() => {
    const youthAudiences = audiences.filter((audience) =>
      isYouthAgeAudienceLabel(audience.label, 18),
    );
    const byLabel = new Map(
      youthAudiences.map((audience) => [
        normalizeAudienceLabelInput(audience.label),
        audience,
      ]),
    );

    const primary = BASE_AGE_CARDS.map((label) => {
      const existing = byLabel.get(label);
      return {
        label,
        moduleCount: existing?.moduleCount ?? 0,
        otherCount: existing?.otherCount ?? 0,
      };
    });

    const additional = youthAudiences
      .filter(
        (audience) =>
          !BASE_AGE_CARDS.includes(normalizeAudienceLabelInput(audience.label)),
      )
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true }),
      )
      .map((audience) => ({
        label: normalizeAudienceLabelInput(audience.label),
        moduleCount: audience.moduleCount,
        otherCount: audience.otherCount,
      }));

    return [...primary, ...additional];
  }, [audiences]);

  const adultTierCards = useMemo<AudienceCard[]>(() => {
    const byLabel = new Map(
      audiences
        .filter((audience) => isAdultStorageAudienceLabel(audience.label))
        .map((audience) => [
          fromStorageAudienceLabel(audience.label),
          audience,
        ]),
    );
    return ADULT_TIER_CARDS.map((label) => {
      const existing = byLabel.get(label);
      return {
        label,
        moduleCount: existing?.moduleCount ?? 0,
        otherCount: existing?.otherCount ?? 0,
      };
    });
  }, [audiences]);

  const teamCards = useMemo<AudienceCard[]>(() => {
    const audienceSummaryByTeamName = new Map(
      audiences
        .filter((audience) => isTeamStorageAudienceLabel(audience.label))
        .map((audience) => [
          normalizeAudienceLabelInput(
            fromTeamStorageAudienceLabel(audience.label),
          ),
          audience,
        ]),
    );

    const canonicalTeamNameByNormalized = new Map(
      teams.map(
        (team) => [normalizeAudienceLabelInput(team.team), team.team] as const,
      ),
    );

    const allNormalizedTeamNames = new Set<string>([
      ...teams.map((team) => normalizeAudienceLabelInput(team.team)),
      ...Array.from(audienceSummaryByTeamName.keys()),
    ]);

    return [...allNormalizedTeamNames]
      .map((normalized) => {
        const existing = audienceSummaryByTeamName.get(normalized);
        const label =
          canonicalTeamNameByNormalized.get(normalized) ?? normalized;
        return {
          label,
          moduleCount: existing?.moduleCount ?? 0,
          otherCount: existing?.otherCount ?? 0,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [audiences, teams]);

  const activeCards = useMemo(() => {
    if (viewMode === "adult") return adultTierCards;
    if (viewMode === "team") return teamCards;
    return youthCards;
  }, [viewMode, adultTierCards, teamCards, youthCards]);

  return (
    <AdminShell
      title="Exercise library"
      subtitle={
        viewMode === "adult"
          ? "Adult mode is on. Open a tier to manage adult modules and other content."
          : viewMode === "team"
            ? "Team mode is on. Open a team to manage training content for that team."
            : "Organized by age. Open an age card to manage modules and session content."
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex w-full items-center gap-2 rounded-full border border-border bg-card p-1 sm:w-fit">
                <Button
                  variant={viewMode === "youth" ? "default" : "outline"}
                  onClick={() => setViewMode("youth")}
                >
                  Youth mode
                </Button>
                <Button
                  variant={viewMode === "adult" ? "default" : "outline"}
                  onClick={() => setViewMode("adult")}
                >
                  Adult mode
                </Button>
                <Button
                  variant={viewMode === "team" ? "default" : "outline"}
                  onClick={() => setViewMode("team")}
                >
                  Team mode
                </Button>
              </div>
              <SectionHeader
                title={
                  viewMode === "adult"
                    ? "Adult tiers"
                    : viewMode === "team"
                      ? "Team training"
                      : "Age groups"
                }
                description={
                  viewMode === "adult"
                    ? "Choose a tier to manage adult modules and other content."
                    : viewMode === "team"
                      ? "Manage training content posted to specific teams."
                      : "Start with ages 7 to 18. Open any card to manage modules, sessions, warm-up, sessions A/B/C, mobility, recovery, and cool-down content."
                }
              />
              {viewMode !== "adult" ? (
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setAudienceInput("");
                    setModalOpen(true);
                  }}
                >
                  {viewMode === "team"
                    ? "+ Add team training"
                    : "+ Add age or range"}
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error || teamError ? (
              <p className="text-sm text-red-600">{error ?? teamError}</p>
            ) : null}
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                {viewMode === "adult"
                  ? "Loading tiers..."
                  : viewMode === "team"
                    ? "Loading teams..."
                    : "Loading age groups..."}
              </p>
            ) : null}
            {viewMode === "team" && isTeamsLoading ? (
              <p className="text-sm text-muted-foreground">Loading teams...</p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {activeCards.map((audience) => (
                <Link
                  key={audience.label}
                  href={
                    viewMode === "team"
                      ? `/exercise-library/teams/${encodeURIComponent(audience.label)}`
                      : `/exercise-library/${encodeURIComponent(audience.label)}${viewMode !== "youth" ? `?mode=${viewMode}` : ""}`
                  }
                  className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <p className="text-lg font-semibold text-foreground">
                    {viewMode === "adult"
                      ? audience.label
                      : viewMode === "team"
                        ? audience.label
                        : `Age ${audience.label}`}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {audience.moduleCount} modules · {audience.otherCount} other
                    items
                  </p>
                </Link>
              ))}
              {viewMode === "team" &&
                activeCards.length === 0 &&
                !isLoading &&
                !isTeamsLoading && (
                  <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                    No teams yet.
                  </p>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader>
          <DialogTitle>
            {viewMode === "team" ? "Add team training" : "Add age group"}
          </DialogTitle>
          <DialogDescription>
            {viewMode === "team"
              ? "Enter the exact name of the team to create a training space for them."
              : "Enter a value like 7, 8, 12, 7-18, or All."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Input
            placeholder={
              viewMode === "team" ? "e.g. U14 Elite" : "7, 8, 12, 7-18, All"
            }
            value={audienceInput}
            onChange={(event) => setAudienceInput(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!normalizedAudience) return;
                try {
                  const label =
                    viewMode === "team"
                      ? toTeamStorageAudienceLabel(audienceInput)
                      : normalizedAudience;

                  await trainingContentRequest("/admin/audiences", {
                    method: "POST",
                    body: JSON.stringify({ label }),
                  });
                  setAudienceInput("");
                  setModalOpen(false);
                  await loadAudiences();
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Failed to create audience.",
                  );
                }
              }}
              disabled={!audienceInput.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      </Dialog>
    </AdminShell>
  );
}
