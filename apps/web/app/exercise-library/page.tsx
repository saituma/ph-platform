"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BookOpen, Layers, Users } from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import { AdultAthleteAssignment } from "../../components/admin/exercise-library/adult-athlete-assignment";
import { Badge } from "../../components/ui/badge";
import {
  AudienceSummary,
  PROGRAM_TIERS,
  isAdultStorageAudienceLabel,
  isYouthAgeAudienceLabel,
  isTeamStorageAudienceLabel,
  fromTeamStorageAudienceLabel,
  normalizeAudienceLabelInput,
  trainingContentRequest,
  clearTrainingContentCache,
} from "../../components/admin/training-content-v2/api";

const BASE_AGE_CARDS = Array.from({ length: 12 }, (_, i) => String(i + 7));

type ViewMode = "youth" | "adult" | "team";

type AudienceCard = {
  label: string;
  moduleCount: number;
  otherCount: number;
  athleteType?: "youth" | "adult" | "mixed";
  memberCount?: number;
};

type TeamSummary = {
  team: string;
  memberCount: number;
  youthCount: number;
  adultCount: number;
  athleteType?: "youth" | "adult";
};

const MODES: {
  id: ViewMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "youth",
    label: "Youth Players",
    description: "Weekly programme content by age group (ages 7–18)",
    icon: BookOpen,
  },
  {
    id: "adult",
    label: "Adult Athletes",
    description: "Content per subscription tier — PHP, Premium, Pro",
    icon: Users,
  },
  {
    id: "team",
    label: "Teams",
    description: "Training content posted to specific teams",
    icon: Layers,
  },
];

function contentSummary(moduleCount: number, otherCount: number) {
  if (moduleCount === 0 && otherCount === 0)
    return "No content yet — click to start building";
  const parts: string[] = [];
  if (moduleCount > 0)
    parts.push(`${moduleCount} programme week${moduleCount !== 1 ? "s" : ""}`);
  if (otherCount > 0)
    parts.push(
      `${otherCount} supplementary session${otherCount !== 1 ? "s" : ""}`,
    );
  return parts.join(" · ");
}

export default function TrainingContentPage() {
  return (
    <Suspense fallback={null}>
      <TrainingContentPageInner />
    </Suspense>
  );
}

function TrainingContentPageInner() {
  const searchParams = useSearchParams();
  const [audiences, setAudiences] = useState<AudienceSummary[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(
    searchParams.get("mode") === "team"
      ? "team"
      : searchParams.get("mode") === "adult"
        ? "adult"
        : "youth",
  );
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
      setError(err instanceof Error ? err.message : "Failed to load content.");
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
      if (!response.ok)
        throw new Error(payload?.error ?? "Failed to load teams.");
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
    const refetch = () => {
      clearTrainingContentCache();
      void loadAudiences();
      void loadTeams();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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

  // ── Youth cards ────────────────────────────────────────────────────────────
  const youthCards = useMemo<AudienceCard[]>(() => {
    const youthAudiences = audiences.filter((a) =>
      isYouthAgeAudienceLabel(a.label, 18),
    );
    const byLabel = new Map(
      youthAudiences.map((a) => [normalizeAudienceLabelInput(a.label), a]),
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
        (a) => !BASE_AGE_CARDS.includes(normalizeAudienceLabelInput(a.label)),
      )
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      .map((a) => ({
        label: normalizeAudienceLabelInput(a.label),
        moduleCount: a.moduleCount,
        otherCount: a.otherCount,
      }));
    return [...primary, ...additional];
  }, [audiences]);

  // ── Adult tier cards ───────────────────────────────────────────────────────
  const adultTierCards = useMemo(() => {
    const byTier = new Map(
      audiences
        .filter((a) => isAdultStorageAudienceLabel(a.label))
        .map((a) => {
          const tierValue = a.label.replace("adult::", "");
          return [tierValue, a] as const;
        }),
    );
    return PROGRAM_TIERS.map((tier) => {
      const existing = byTier.get(tier.value);
      return {
        value: tier.value,
        label: tier.label,
        moduleCount: existing?.moduleCount ?? 0,
        otherCount: existing?.otherCount ?? 0,
      };
    });
  }, [audiences]);

  // ── Team cards ─────────────────────────────────────────────────────────────
  const teamCards = useMemo<AudienceCard[]>(() => {
    const byTeamName = new Map(
      audiences
        .filter((a) => isTeamStorageAudienceLabel(a.label))
        .map((a) => [
          normalizeAudienceLabelInput(fromTeamStorageAudienceLabel(a.label)),
          a,
        ]),
    );
    const teamByNormalized = new Map(
      teams.map((t) => [normalizeAudienceLabelInput(t.team), t] as const),
    );
    const allNames = new Set<string>([
      ...teams.map((t) => normalizeAudienceLabelInput(t.team)),
      ...Array.from(byTeamName.keys()),
    ]);
    return [...allNames]
      .map((normalized) => {
        const existing = byTeamName.get(normalized);
        const teamInfo = teamByNormalized.get(normalized);
        const youthCount = teamInfo?.youthCount ?? 0;
        const adultCount = teamInfo?.adultCount ?? 0;
        const athleteType: AudienceCard["athleteType"] =
          teamInfo?.athleteType === "adult"
            ? "adult"
            : youthCount > 0 && adultCount > 0
              ? "mixed"
              : "youth";
        return {
          label: teamInfo?.team ?? normalized,
          moduleCount: existing?.moduleCount ?? 0,
          otherCount: existing?.otherCount ?? 0,
          athleteType,
          memberCount: teamInfo?.memberCount ?? 0,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [audiences, teams]);

  const subtitle = {
    youth:
      "Each age group (7–18) has its own programme. Open an age to build out weekly modules, sessions, warm-ups, mobility and recovery content.",
    adult:
      "Manage what athletes on each subscription tier can access, then assign athletes to their tier below.",
    team: "Open a team to manage the training content posted specifically to that group.",
  }[viewMode];

  return (
    <AdminShell title="Training Content" subtitle={subtitle}>
      <div className="space-y-6">

        {/* ── Mode switcher ──────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-3">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  isActive
                    ? "border-primary/50 bg-primary/8 ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>
                    {mode.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {mode.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Youth cards ────────────────────────────────────────────────── */}
        {viewMode === "youth" && (
          <div className="space-y-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary/40" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {youthCards.map((card) => {
                  const hasContent = card.moduleCount > 0 || card.otherCount > 0;
                  return (
                    <Link
                      key={card.label}
                      href={`/exercise-library/${encodeURIComponent(card.label)}`}
                      className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-foreground">
                          Age {card.label}
                        </p>
                        {hasContent ? (
                          <span className="h-2 w-2 rounded-full bg-green-500" title="Has content" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-border" title="Empty" />
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {contentSummary(card.moduleCount, card.otherCount)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Adult tier content + athlete assignment ─────────────────────── */}
        {viewMode === "adult" && (
          <div className="space-y-6">
            {/* Tier content cards */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Subscription tier content
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Open a tier to build the programme content athletes on that plan can access.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {adultTierCards.map((tier) => {
                  const hasContent = tier.moduleCount > 0 || tier.otherCount > 0;
                  return (
                    <Link
                      key={tier.value}
                      href={`/exercise-library/${encodeURIComponent(tier.value)}?mode=adult`}
                      className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{tier.label}</p>
                        {hasContent ? (
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-border" />
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {contentSummary(tier.moduleCount, tier.otherCount)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">
                Assign athletes to a tier
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <AdultAthleteAssignment />
          </div>
        )}

        {/* ── Team cards ─────────────────────────────────────────────────── */}
        {viewMode === "team" && (
          <div className="space-y-3">
            {teamError && <p className="text-sm text-red-600">{teamError}</p>}
            {(isLoading || isTeamsLoading) ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary/40" />
                ))}
              </div>
            ) : teamCards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No teams yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create teams under People → Teams, then return here to add content.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {teamCards.map((card) => {
                  const isAdultTeam = card.athleteType === "adult";
                  const href = isAdultTeam
                    ? `/exercise-library/teams/${encodeURIComponent(card.label)}/members`
                    : `/exercise-library/teams/${encodeURIComponent(card.label)}`;

                  const typeLabel =
                    card.athleteType === "adult"
                      ? "Adult team"
                      : card.athleteType === "mixed"
                        ? "Mixed team"
                        : "Youth team";
                  const typeDotColor =
                    card.athleteType === "adult"
                      ? "bg-blue-500"
                      : card.athleteType === "mixed"
                        ? "bg-amber-500"
                        : "bg-green-500";

                  return (
                    <Link
                      key={card.label}
                      href={href}
                      className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${typeDotColor}`} />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {typeLabel}
                        </span>
                        {(card.memberCount ?? 0) > 0 && (
                          <Badge variant="secondary" className="ml-auto text-[10px]">
                            {card.memberCount} members
                          </Badge>
                        )}
                      </div>
                      <p className="font-semibold text-foreground">{card.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isAdultTeam
                          ? "Tap to manage athlete assignments"
                          : contentSummary(card.moduleCount, card.otherCount)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
