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
import { Badge } from "../../../components/ui/badge";
import { PlaySquare, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  useProvisionAdultAthleteMutation,
  useProvisionGuardianMutation,
  useGetTeamSessionsQuery,
  useCopySessionToTeamMutation,
  useDeleteTeamSessionMutation,
  useGetSessionLibraryQuery,
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

function getCsrfToken() {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("csrfToken="))
      ?.split("=")
      .slice(1)
      .join("=") ?? ""
  );
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
  planDisplayPrice: string | null;
  planBillingInterval: string | null;
  planMonthlyPrice: string | null;
  planYearlyPrice: string | null;
  planMonthlyAmountCents: number | null;
  sponsoredPlayerCount: number;
  sponsoredPlanId: number | null;
  subscriptionStatus: string;
  paymentQueue?: {
    requestId: number;
    status: string;
    paymentMode: string;
    paymentStatus: string;
    paymentAmountCents: number | null;
    paymentCurrency: string | null;
    allPaymentsComplete: boolean;
    coachPaysSeats: number;
    inviteEmailsReady: boolean;
    inviteEmailsLastAttemptAt: string | null;
    inviteEmailsError: string | null;
    paidCount: number;
    totalCount: number;
    totalAmountCents: number;
    managerAmountCents: number;
    playerAmountCents: number;
    paidAmountCents: number;
    remainingAmountCents: number;
    currency: string;
    invites: Array<{
      id: number;
      playerName: string | null;
      playerEmail: string;
      amountCents: number | null;
      currency: string;
      status: string;
      paidAt: string | null;
      emailSentAt: string | null;
      emailLastError: string | null;
      sponsoredByManager: boolean;
    }>;
  } | null;
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

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: (currency || "gbp").toUpperCase(),
    maximumFractionDigits: 2,
  }).format((cents || 0) / 100);
}

function paymentModeLabel(mode: string) {
  if (mode === "coach_pays_all") return "Manager pays all";
  if (mode === "per_player_all") return "All players pay";
  if (mode === "per_player_selected") return "Selected players pay";
  return mode.replace(/_/g, " ");
}

function paymentStatusLabel(status: string) {
  if (status === "paid") return "Paid";
  if (status === "pending") return "Payment pending";
  if (status === "expired") return "Expired";
  if (status === "cancelled") return "Cancelled";
  return status.replace(/_/g, " ");
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
  const [isApproving, setIsApproving] = useState(false);
  const [isSponsoring, setIsSponsoring] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

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

  // Session library state
  const [sessionLibraryOpen, setSessionLibraryOpen] = useState(false);
  const teamId = details?.teamId ?? 0;
  const { data: teamSessionsData, refetch: refetchTeamSessions } = useGetTeamSessionsQuery(
    { teamId },
    { skip: !teamId },
  );
  const { data: sessionLibraryData } = useGetSessionLibraryQuery();
  const [copySessionToTeam, { isLoading: isCopyingSession }] = useCopySessionToTeamMutation();
  const [deleteTeamSession, { isLoading: isDeletingTeamSession }] = useDeleteTeamSessionMutation();
  const teamSessions = teamSessionsData?.sessions ?? [];
  const librarySessionsList = sessionLibraryData?.sessions ?? [];

  const handleCopySessionToTeam = async (sessionId: number) => {
    if (!teamId) return;
    try {
      await copySessionToTeam({ teamId, sessionId }).unwrap();
      await refetchTeamSessions();
      toast.success("Session added to team");
      setSessionLibraryOpen(false);
    } catch {
      toast.error("Failed to add session");
    }
  };

  const handleDeleteTeamSession = async (sessionId: number) => {
    if (!window.confirm("Remove this session from the team?")) return;
    try {
      await deleteTeamSession({ sessionId }).unwrap();
      await refetchTeamSessions();
      toast.success("Session removed");
    } catch {
      toast.error("Failed to remove session");
    }
  };

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
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/backend/admin/teams/${details.teamId}`, {
        method: "DELETE",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
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

  const approveTeam = async () => {
    if (!details?.teamId) return;
    setIsApproving(true);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/backend/admin/teams/${details.teamId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "x-csrf-token": csrfToken } : {}) },
        credentials: "include",
        body: JSON.stringify({ billingCycle: "monthly" }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to approve team.");
      }
      await loadDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve team.");
    } finally {
      setIsApproving(false);
    }
  };

  const approveSponsorRest = async () => {
    if (!details?.teamId) return;
    setIsSponsoring(true);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/backend/admin/teams/${details.teamId}/approve-sponsor-rest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "x-csrf-token": csrfToken } : {}) },
        credentials: "include",
        body: JSON.stringify({ billingCycle: "monthly" }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to approve and sponsor remaining players.");
      }
      await loadDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sponsor remaining players.");
    } finally {
      setIsSponsoring(false);
    }
  };

  const resetForm = () => {
    setNewAthleteName("");
    setNewAge("");
    setNewIsSponsored(false);
  };

  const athleteType = details?.athleteType ?? "youth";

  useEffect(() => {
    setHasMounted(true);
  }, []);

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
          headers: {
            "Content-Type": "application/json",
            ...(getCsrfToken() ? { "x-csrf-token": getCsrfToken() } : {}),
          },
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
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(getCsrfToken() ? { "x-csrf-token": getCsrfToken() } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ allowMoveFromOtherTeam: false }),
        },
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

  if (!hasMounted) {
    return (
      <AdminShell title="Team details" subtitle="Loading team workspace.">
        <div className="grid gap-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Loading team details...</p>
            </CardContent>
          </Card>
        </div>
      </AdminShell>
    );
  }

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
              {isDeleting ? "Deleting..." : "Delete Team"}
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
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Membership price</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {details?.planMonthlyAmountCents
                      ? formatMoney(details.planMonthlyAmountCents, "gbp")
                      : details?.planMonthlyPrice ?? details?.planDisplayPrice ?? "Not set"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {details?.planName ?? "Team plan"}
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
              <SectionHeader title="Team Payments" description="Amount due, player invite emails, and payment status." />
            </CardHeader>
            <CardContent className="space-y-3">
              {details?.paymentQueue ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-border px-2 py-1">Mode: {paymentModeLabel(details.paymentQueue.paymentMode)}</span>
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-200">
                      Paid {details.paymentQueue.paidCount}/{details.paymentQueue.totalCount}
                    </span>
                    <span className="rounded-full border border-border px-2 py-1">Status: {details.paymentQueue.status.replace(/_/g, " ")}</span>
                    {details.paymentQueue.inviteEmailsReady ? (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">Invite emails sent</span>
                    ) : details.paymentQueue.inviteEmailsError ? (
                      <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-200">Invite email error</span>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                      <p className="text-xs text-primary">Total team amount</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {formatMoney(details.paymentQueue.totalAmountCents, details.paymentQueue.currency)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">Manager pays</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {formatMoney(details.paymentQueue.managerAmountCents, details.paymentQueue.currency)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {paymentStatusLabel(details.paymentQueue.paymentStatus ?? "pending")}
                      </p>
                      {details.paymentQueue.coachPaysSeats > 0 ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {details.paymentQueue.coachPaysSeats} seat{details.paymentQueue.coachPaysSeats === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">Players pay</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {formatMoney(details.paymentQueue.playerAmountCents, details.paymentQueue.currency)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {details.paymentQueue.totalCount} invited payer{details.paymentQueue.totalCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">Amount paid</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {formatMoney(details.paymentQueue.paidAmountCents, details.paymentQueue.currency)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                      <p className="text-xs text-amber-300">Still to pay</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {formatMoney(details.paymentQueue.remainingAmountCents, details.paymentQueue.currency)}
                      </p>
                    </div>
                  </div>

                  {details.paymentQueue.invites.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Player payment invite emails</p>
                      {details.paymentQueue.invites.map((invite) => (
                        <div key={invite.id} className="rounded-xl border border-border p-3 text-sm">
                          <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">{invite.playerName || invite.playerEmail}</p>
                            <p className="text-xs text-muted-foreground">{invite.playerEmail}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Email: {invite.emailSentAt ? `sent ${formatDate(invite.emailSentAt)}` : invite.emailLastError ? "failed" : "not sent yet"}
                            </p>
                            {invite.emailLastError && invite.emailLastError !== "sponsored_by_manager" ? (
                              <p className="mt-1 text-[11px] text-red-300">{invite.emailLastError}</p>
                            ) : null}
                          </div>
                          <div className="text-right text-xs">
                            <p className="mb-1 text-muted-foreground">{formatMoney(invite.amountCents ?? 0, invite.currency)}</p>
                            {invite.sponsoredByManager ? (
                              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-violet-200">Sponsored</span>
                            ) : invite.status === "paid" ? (
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">Paid</span>
                            ) : (
                              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">{paymentStatusLabel(invite.status)}</span>
                            )}
                            {invite.paidAt ? (
                              <p className="mt-2 text-[11px] text-muted-foreground">Paid {formatDate(invite.paidAt)}</p>
                            ) : null}
                          </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No player invites for this team.</p>
                  )}

                  {(details.subscriptionStatus ?? "pending_payment") !== "active" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={approveTeam} disabled={isApproving}>
                        {isApproving ? "Approving..." : "Approve"}
                      </Button>
                      {details.paymentQueue.totalCount > details.paymentQueue.paidCount ? (
                        <Button variant="outline" onClick={approveSponsorRest} disabled={isSponsoring}>
                          {isSponsoring ? "Sponsoring..." : "Approve - sponsor the rest"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs text-primary">Membership price</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {details?.planMonthlyAmountCents
                        ? formatMoney(details.planMonthlyAmountCents, "gbp")
                        : details?.planMonthlyPrice ?? details?.planDisplayPrice ?? "Not set"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {details?.planName ?? "Team plan"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Payment setup</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">No payment queue</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Create the team with coach/player payment mode to track invoices and player payment emails here.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        {/* Team Sessions */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">Team Sessions</h2>
                <p className="text-sm text-muted-foreground">Training sessions assigned to this team from the session library.</p>
              </div>
              <Button size="sm" onClick={() => setSessionLibraryOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> From Session Library
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {teamSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                <PlaySquare className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" />
                <p>No sessions assigned yet.</p>
                <button
                  type="button"
                  onClick={() => setSessionLibraryOpen(true)}
                  className="mt-1 text-primary hover:underline"
                >
                  Add from Session Library
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {teamSessions.map((s: any) => (
                  <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {s.title || `Session ${s.sessionNumber ?? 1}`}
                        </p>
                        {s.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{s.type ?? "program"}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {s.exerciseCount ?? 0} exercise{(s.exerciseCount ?? 0) !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 shrink-0 p-0 text-destructive"
                        onClick={() => handleDeleteTeamSession(s.id)}
                        disabled={isDeletingTeamSession}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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

      {/* Session Library Picker */}
      <Dialog open={sessionLibraryOpen} onOpenChange={setSessionLibraryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Session to Team</DialogTitle>
            <DialogDescription>
              Select a library session to assign to this team. Exercises will be copied.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
            {librarySessionsList.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No sessions in library yet.{" "}
                <Link href="/programs/sessions" className="text-primary hover:underline">
                  Create one first.
                </Link>
              </div>
            ) : (
              librarySessionsList.map((s: any) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={isCopyingSession}
                  onClick={() => handleCopySessionToTeam(s.id)}
                  className="w-full rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                >
                  <div className="text-sm font-medium text-foreground">
                    {s.title || `Session ${s.sessionNumber ?? 1}`}
                  </div>
                  {s.description && (
                    <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{s.description}</div>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{s.type ?? "program"}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {s.exerciseCount ?? 0} exercise{(s.exerciseCount ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
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
