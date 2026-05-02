"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { SectionHeader } from "../../../components/admin/section-header";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  useProvisionAdultAthleteMutation,
  useProvisionGuardianMutation,
} from "../../../lib/apiSlice";

type SubscriptionPlan = {
  id: number;
  name: string;
  tier: string | null;
  displayPrice: string;
  monthlyPrice: string | null;
  billingInterval: string;
  isActive: boolean;
};

const TIER_LABELS: Record<string, string> = {
  PHP: "PHP (Starter)",
  PHP_Premium: "PHP Premium",
  PHP_Premium_Plus: "PHP Premium Plus",
  PHP_Pro: "PHP Pro",
};

function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let pwd = "";
  for (let i = 0; i < 20; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

type TeamMember = {
  athleteId: number;
  athleteName: string;
  birthDate: string | null;
  age: number | null;
  trainingPerWeek: number | null;
  currentProgramTier: string | null;
  isSponsored: boolean;
  guardianEmail: string | null;
  guardianPhone: string | null;
  relationToAthlete: string | null;
  sessionsCompleted: number;
  modulesCompleted: number;
  rank: number;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
};

type TeamDetails = {
  team: string;
  teamId: number;
  athleteType: "youth" | "adult";
  minAge: number | null;
  maxAge: number | null;
  planTier: string | null;
  planName: string | null;
  sponsoredPlayerCount: number;
  sponsoredPlanId: number | null;
  subscriptionStatus: string;
  manager: { id: number; name: string | null; email: string; role: string | null } | null;
  summary: {
    memberCount: number;
    youthCount?: number;
    adultCount?: number;
    createdAt: string | Date | null;
    updatedAt: string | Date | null;
  };
  members: TeamMember[];
};

type AgeBand = { label: string; minAge: number; maxAge: number };

const AGE_BANDS: AgeBand[] = [
  { label: "U10", minAge: 0, maxAge: 9 },
  { label: "U12", minAge: 10, maxAge: 11 },
  { label: "U14", minAge: 12, maxAge: 13 },
  { label: "U16", minAge: 14, maxAge: 15 },
  { label: "U18", minAge: 16, maxAge: 17 },
  { label: "18+", minAge: 18, maxAge: 999 },
];

function getAgeBand(age: number | null): string {
  if (age === null) return "Unknown";
  const band = AGE_BANDS.find((b) => age >= b.minAge && age <= b.maxAge);
  return band?.label ?? "Unknown";
}

function groupByAgeBand(members: TeamMember[]): Record<string, TeamMember[]> {
  const groups: Record<string, TeamMember[]> = {};
  for (const m of members) {
    const band = getAgeBand(m.age);
    if (!groups[band]) groups[band] = [];
    groups[band].push(m);
  }
  return groups;
}

const BAND_ORDER = [...AGE_BANDS.map((b) => b.label), "Unknown"];


function formatDate(value: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}


function MemberRow({
  member,
  teamName,
  showAge,
  showGuardian,
}: {
  member: TeamMember;
  teamName: string;
  showAge?: boolean;
  showGuardian?: boolean;
}) {
  return (
    <Link
      href={`/teams/${encodeURIComponent(teamName)}/members/${member.athleteId}`}
      className="block rounded-xl border border-border p-4 transition hover:border-primary/50 hover:bg-primary/5 group"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ring-1 ring-border transition group-hover:ring-primary/20 ${
              member.rank === 1
                ? "bg-amber-100 text-amber-700 ring-amber-200"
                : member.rank === 2
                  ? "bg-slate-100 text-slate-700 ring-slate-200"
                  : member.rank === 3
                    ? "bg-orange-100 text-orange-700 ring-orange-200"
                    : "bg-muted/50 text-muted-foreground"
            }`}
          >
            {member.rank}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {member.athleteName}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {showAge ? <span>Age: {member.age ?? "—"}</span> : null}
              {showAge ? <span>•</span> : null}
              <span>Tier: {member.currentProgramTier ?? "—"}</span>
              {member.isSponsored ? (
                <>
                  <span>•</span>
                  <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-300">Sponsored</span>
                </>
              ) : null}
              {showGuardian && member.guardianEmail ? (
                <>
                  <span>•</span>
                  <span>Guardian: {member.guardianEmail}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-6 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Sessions
            </p>
            <p className="text-sm font-bold text-foreground">
              {member.sessionsCompleted}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Modules
            </p>
            <p className="text-sm font-bold text-foreground">
              {member.modulesCompleted}
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center text-xs font-medium text-primary">
            Details
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function TeamDetailPage() {
  const params = useParams<{ teamName: string }>();
  const encodedName = String(params.teamName ?? "");
  const teamName = useMemo(
    () => decodeURIComponent(encodedName),
    [encodedName],
  );
  const cleanTeamName = useMemo(() => teamName.trim(), [teamName]);
  const router = useRouter();
  const [details, setDetails] = useState<TeamDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Quick Add state (uses team's plan automatically)
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [newAthleteName, setNewAthleteName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newIsSponsored, setNewIsSponsored] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  // Full Plan Add state
  const [fullPlanOpen, setFullPlanOpen] = useState(false);
  const [fpName, setFpName] = useState("");
  const [fpAge, setFpAge] = useState("");
  const [fpTrainingPerWeek, setFpTrainingPerWeek] = useState("3");
  const [fpTier, setFpTier] = useState<string>("PHP");
  const [fpBillingCycle, setFpBillingCycle] = useState<"monthly" | "6months" | "yearly">("monthly");
  const [fpGoals, setFpGoals] = useState("");
  const [fpInjuries, setFpInjuries] = useState("");
  const [fpGuardianName, setFpGuardianName] = useState("");

  const [provisionAdult, { isLoading: isProvisioningAdult }] = useProvisionAdultAthleteMutation();
  const [provisionGuardian, { isLoading: isProvisioningGuardian }] = useProvisionGuardianMutation();
  const isProvisioning = isProvisioningAdult || isProvisioningGuardian;

  const generatedEmail = useMemo(() => {
    const slug = newAthleteName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const team = cleanTeamName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return slug && team ? `${slug}-${team}@phplatform.com` : "";
  }, [newAthleteName, cleanTeamName]);

  const fpGeneratedEmail = useMemo(() => {
    const slug = fpName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const team = cleanTeamName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return slug && team ? `${slug}-${team}@phplatform.com` : "";
  }, [fpName, cleanTeamName]);

  useEffect(() => {
    if ((!assignModalOpen && !fullPlanOpen) || plans.length) return;
    fetch("/api/backend/admin/subscription-plans", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const active = (Array.isArray(data?.plans) ? data.plans : []).filter((p: SubscriptionPlan) => p.isActive);
        setPlans(active);
      })
      .catch(() => {});
  }, [assignModalOpen, fullPlanOpen]);

  const loadDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/backend/admin/teams/${encodeURIComponent(teamName)}`,
        {
          credentials: "include",
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load team details.");
      }
      const next = payload as TeamDetails;
      setDetails(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load team details.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!details?.teamId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/backend/admin/teams/${details.teamId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to delete team.");
      }
      router.push("/teams");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team.");
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const resetForm = () => {
    setNewAthleteName("");
    setNewAge("");
    setNewIsSponsored(false);
  };

  const athleteType = details?.athleteType ?? "youth";

  const handleProvision = async () => {
    setPageNotice(null);
    const password = generatePassword();
    const age = Number(newAge) || 10;
    const birthYear = new Date().getFullYear() - age;
    const birthDate = `${birthYear}-01-01`;
    const common = {
      email: generatedEmail,
      athleteName: newAthleteName.trim(),
      birthDate,
      team: cleanTeamName,
      trainingPerWeek: 3,
      desiredProgramType: (details?.planTier ?? "PHP") as "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro",
      planPaymentType: "monthly" as const,
      planCommitmentMonths: 12 as const,
      termsVersion: "1.0",
      privacyVersion: "1.0",
      appVersion: "1.0",
      initialPassword: password,
    };
    try {
      let athleteId: number;
      if (athleteType === "adult") {
        const res = await provisionAdult(common).unwrap();
        athleteId = res.athleteId;
      } else {
        const res = await provisionGuardian({
          ...common,
          guardianDisplayName: newAthleteName.trim(),
        }).unwrap();
        athleteId = res.athleteId;
      }

      const attachRes = await fetch(
        `/api/backend/admin/teams/${encodeURIComponent(cleanTeamName)}/athletes/${athleteId}/attach`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ allowMoveFromOtherTeam: false, isSponsored: newIsSponsored }),
        },
      );
      if (!attachRes.ok) {
        const attachErr = await attachRes.json().catch(() => ({}));
        throw new Error(attachErr?.error ?? "Failed to attach athlete to team.");
      }

      setAssignModalOpen(false);
      resetForm();
      setPageNotice(`${newAthleteName.trim()} added${newIsSponsored ? " (sponsored)" : ""}. Login: ${generatedEmail} · Password: ${password}`);
      await loadDetails();
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { data?: { error?: string } })?.data?.error ?? "Failed to add team member.";
      setPageNotice(msg);
    }
  };

  const resetFullPlan = () => {
    setFpName(""); setFpAge(""); setFpTrainingPerWeek("3");
    setFpTier("PHP"); setFpBillingCycle("monthly");
    setFpGoals(""); setFpInjuries(""); setFpGuardianName("");
  };

  const handleFullPlanProvision = async () => {
    setPageNotice(null);
    const password = generatePassword();
    const age = Number(fpAge) || 10;
    const birthDate = `${new Date().getFullYear() - age}-01-01`;
    const commitmentMonths: 6 | 12 = fpBillingCycle === "6months" ? 6 : 12;
    const paymentType: "monthly" | "upfront" = fpBillingCycle === "monthly" ? "monthly" : "upfront";
    const common = {
      email: fpGeneratedEmail,
      athleteName: fpName.trim(),
      birthDate,
      team: cleanTeamName,
      trainingPerWeek: Number(fpTrainingPerWeek) || 3,
      desiredProgramType: fpTier as "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro",
      performanceGoals: fpGoals.trim() || null,
      injuries: fpInjuries.trim() || null,
      planPaymentType: paymentType,
      planCommitmentMonths: commitmentMonths,
      termsVersion: "1.0",
      privacyVersion: "1.0",
      appVersion: "1.0",
      initialPassword: password,
    };
    try {
      let athleteId: number;
      if (athleteType === "adult") {
        const res = await provisionAdult(common).unwrap();
        athleteId = res.athleteId;
      } else {
        const res = await provisionGuardian({
          ...common,
          guardianDisplayName: fpGuardianName.trim() || fpName.trim(),
        }).unwrap();
        athleteId = res.athleteId;
      }
      const attachRes = await fetch(
        `/api/backend/admin/teams/${encodeURIComponent(cleanTeamName)}/athletes/${athleteId}/attach`,
        { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ allowMoveFromOtherTeam: false }) },
      );
      if (!attachRes.ok) {
        const attachErr = await attachRes.json().catch(() => ({}));
        throw new Error(attachErr?.error ?? "Failed to attach athlete to team.");
      }
      setFullPlanOpen(false);
      resetFullPlan();
      setPageNotice(`${fpName.trim()} added (${TIER_LABELS[fpTier] ?? fpTier}). Login: ${fpGeneratedEmail} · Password: ${password}`);
      await loadDetails();
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { data?: { error?: string } })?.data?.error ?? "Failed to add team member.";
      setPageNotice(msg);
    }
  };

  useEffect(() => {
    if (!teamName) return;
    void loadDetails();
  }, [teamName]);

  const ageBandGroups = useMemo(() => {
    if (!details?.members) return {};
    return groupByAgeBand(details.members);
  }, [details?.members]);

  return (
    <AdminShell
      title={teamName || "Team details"}
      subtitle={`${athleteType === "adult" ? "Adult" : "Youth"} team — members and training overview.`}
    >
      <div className="grid gap-6">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        {pageNotice ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {pageNotice}
          </div>
        ) : null}

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 pt-6">
            <Button
              size="sm"
              onClick={() => setAssignModalOpen(true)}
            >
              Add Athlete
            </Button>
            {athleteType === "adult" ? (
              <Button size="sm" render={<Link href={`/exercise-library/teams/${encodeURIComponent(teamName)}`} />}>
                Post to whole team
              </Button>
            ) : null}
            <Button variant="outline" size="sm" render={<Link href="/teams" />}>
              Back to teams
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => setConfirmDelete(true)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete Team"}
            </Button>
          </CardContent>
        </Card>

        {details?.manager ? (
          <Card>
            <CardHeader>
              <SectionHeader
                title="Team Manager"
                description="The manager assigned to this team."
              />
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {details.manager.name || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="mt-1 text-sm font-semibold text-foreground break-all">
                  {details.manager.email}
                </p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="mt-1 text-sm font-semibold text-foreground capitalize">
                  {(details.manager.role ?? "team_coach").replace(/_/g, " ")}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <SectionHeader
              title="Summary"
              description="Overview for this team."
            />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading team details...
              </p>
            ) : (
              <>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Athletes</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {details?.summary.memberCount ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Team type</p>
                  <p className="mt-1 text-lg font-semibold text-foreground capitalize">
                    {athleteType}
                  </p>
                </div>
                {(details?.sponsoredPlayerCount ?? 0) > 0 ? (
                  <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
                    <p className="text-xs text-violet-400">Sponsored players</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {details?.members.filter((m) => m.isSponsored).length ?? 0} / {details?.sponsoredPlayerCount ?? 0}
                    </p>
                  </div>
                ) : null}
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatDate(details?.summary.createdAt ?? null)}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Last updated</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatDate(details?.summary.updatedAt ?? null)}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Members"
              description={
                athleteType === "youth"
                  ? "Athletes grouped by age band. Post training to a specific age group."
                  : "Athletes on this team. Post training to individuals or the whole team."
              }
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading members...</p>
            ) : !details?.members.length ? (
              <p className="text-sm text-muted-foreground">No members found for this team.</p>
            ) : athleteType === "youth" ? (
              <div className="space-y-6">
                {BAND_ORDER.filter((band) => ageBandGroups[band]?.length).map((band) => (
                  <div key={band}>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                          {band}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ageBandGroups[band].length} athlete{ageBandGroups[band].length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/exercise-library/teams/${encodeURIComponent(teamName)}?ageGroup=${band}`} />}
                      >
                        Post to {band}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {ageBandGroups[band].map((member) => (
                        <MemberRow key={member.athleteId} member={member} teamName={teamName} showAge showGuardian />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {details.members.map((member) => (
                  <div key={member.athleteId} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <MemberRow member={member} teamName={teamName} />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      render={<Link href={`/exercise-library/teams/${encodeURIComponent(teamName)}?athleteId=${member.athleteId}`} />}
                    >
                      Post
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={assignModalOpen} onOpenChange={(open) => { setAssignModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Create a new {athleteType === "adult" ? "adult athlete" : "youth athlete"} account for {teamName}.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-athlete-name">Name</Label>
              <Input
                id="new-athlete-name"
                placeholder="Full name"
                value={newAthleteName}
                onChange={(e) => setNewAthleteName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-age">
                Age{" "}
                <span className="text-muted-foreground">
                  ({athleteType === "adult" ? "must be 18+" : "under 18"})
                </span>
              </Label>
              <Input
                id="new-age"
                type="number"
                min={athleteType === "adult" ? 18 : 1}
                max={athleteType === "adult" ? 99 : 17}
                placeholder={athleteType === "adult" ? "e.g. 25" : "e.g. 14"}
                value={newAge}
                onChange={(e) => setNewAge(e.target.value)}
              />
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
              Plan: <span className="font-medium text-foreground">
                {details?.planName ?? (details?.planTier ? TIER_LABELS[details.planTier] : "Team plan")}
              </span>
            </div>
            {(details?.sponsoredPlayerCount ?? 0) > 0 ? (
              <label className="flex items-center gap-3 rounded-lg border border-violet-500/30 bg-violet-500/5 px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsSponsored}
                  onChange={(e) => setNewIsSponsored(e.target.checked)}
                  className="h-4 w-4 accent-violet-500"
                />
                <span className="text-sm font-medium text-foreground">Sponsored player</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  Gets the team's sponsored plan tier
                </span>
              </label>
            ) : null}
            {generatedEmail ? (
              <p className="text-xs text-muted-foreground">
                Login email: <span className="font-mono text-foreground">{generatedEmail}</span>
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setAssignModalOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleProvision()}
                disabled={
                  isProvisioning ||
                  !newAthleteName.trim() ||
                  !newAge ||
                  (athleteType === "adult" ? Number(newAge) < 18 : Number(newAge) >= 18)
                }
              >
                {isProvisioning ? "Creating..." : "Add Team Member"}
              </Button>
            </div>
          </div>
          </DialogPanel>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{teamName}</strong>? Athletes will be detached but not deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete Team"}
              </Button>
            </div>
          </DialogPanel>
        </DialogContent>
      </Dialog>

      {/* Full Plan Dialog (kept for existing athletes) */}
      <Dialog open={fullPlanOpen} onOpenChange={(open) => { setFullPlanOpen(open); if (!open) resetFullPlan(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add with Full Plan</DialogTitle>
            <DialogDescription>
              Create a new {athleteType === "adult" ? "adult athlete" : "youth athlete"} with plan and billing details for {cleanTeamName}.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="space-y-4">
              {athleteType === "youth" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="fp-guardian">Guardian name</Label>
                  <Input id="fp-guardian" placeholder="Parent / Guardian full name" value={fpGuardianName} onChange={(e) => setFpGuardianName(e.target.value)} />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="fp-name">Athlete name</Label>
                <Input id="fp-name" placeholder="Full name" value={fpName} onChange={(e) => setFpName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fp-age">
                    Age{" "}
                    <span className="text-muted-foreground">
                      ({athleteType === "adult" ? "18+" : "<18"})
                    </span>
                  </Label>
                  <Input
                    id="fp-age"
                    type="number"
                    min={athleteType === "adult" ? 18 : 1}
                    max={athleteType === "adult" ? 99 : 17}
                    placeholder={athleteType === "adult" ? "e.g. 25" : "e.g. 14"}
                    value={fpAge}
                    onChange={(e) => setFpAge(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fp-training">Training days/week</Label>
                  <Input id="fp-training" type="number" min={1} max={7} value={fpTrainingPerWeek} onChange={(e) => setFpTrainingPerWeek(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Plan / Tier</Label>
                {plans.length > 0 ? (
                  <div className="grid gap-2">
                    {plans.map((plan) => {
                      const tier = plan.tier ?? "PHP";
                      const isSelected = fpTier === tier;
                      return (
                        <button key={plan.id} type="button" onClick={() => setFpTier(tier)}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                          <div>
                            <p className="text-sm font-medium text-foreground">{TIER_LABELS[tier] ?? plan.name}</p>
                            <p className="text-xs text-muted-foreground">{plan.billingInterval}</p>
                          </div>
                          <span className="text-sm font-semibold text-foreground">{plan.monthlyPrice ?? plan.displayPrice}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {(["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"] as const).map((tier) => (
                      <button key={tier} type="button" onClick={() => setFpTier(tier)}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${fpTier === tier ? "border-primary bg-primary/10 font-medium text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                        {TIER_LABELS[tier]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Billing cycle</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["monthly", "6months", "yearly"] as const).map((cycle) => (
                    <button key={cycle} type="button" onClick={() => setFpBillingCycle(cycle)}
                      className={`rounded-lg border px-3 py-2 text-center text-sm transition ${fpBillingCycle === cycle ? "border-primary bg-primary/10 font-medium text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      {cycle === "monthly" ? "Monthly" : cycle === "6months" ? "6 Months" : "Yearly"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fp-goals">Performance goals <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="fp-goals" placeholder="e.g. improve sprint speed" value={fpGoals} onChange={(e) => setFpGoals(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fp-injuries">Injuries / notes <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="fp-injuries" placeholder="e.g. left knee" value={fpInjuries} onChange={(e) => setFpInjuries(e.target.value)} />
              </div>

              {fpGeneratedEmail ? (
                <p className="text-xs text-muted-foreground">
                  Login email: <span className="font-mono text-foreground">{fpGeneratedEmail}</span>
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setFullPlanOpen(false); resetFullPlan(); }}>Cancel</Button>
                <Button
                  onClick={() => void handleFullPlanProvision()}
                  disabled={
                    isProvisioning ||
                    !fpName.trim() ||
                    !fpAge ||
                    (athleteType === "adult" ? Number(fpAge) < 18 : Number(fpAge) >= 18)
                  }
                >
                  {isProvisioning ? "Creating..." : "Add Member"}
                </Button>
              </div>
            </div>
          </DialogPanel>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
