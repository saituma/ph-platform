"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { useGetOnboardingConfigQuery } from "../../../lib/apiSlice";

type MemberDraft = {
  email: string;
  guardianDisplayName: string;
  athleteName: string;
  birthDate: string;
  trainingPerWeek: string;
  parentPhone: string | null;
  relationToAthlete: string | null;
};

function createEmptyMember(): MemberDraft {
  return {
    email: "",
    guardianDisplayName: "",
    athleteName: "",
    birthDate: "",
    trainingPerWeek: "3",
    parentPhone: null,
    relationToAthlete: null,
  };
}

function validateMember(member: MemberDraft) {
  if (!member.email.trim().includes("@")) return "Valid email is required.";
  if (!member.guardianDisplayName.trim()) return "Guardian name is required.";
  if (!member.athleteName.trim()) return "Athlete name is required.";
  if (!member.birthDate.trim()) return "Birth date is required.";
  const trainingPerWeek = Number.parseInt(member.trainingPerWeek, 10);
  if (!Number.isFinite(trainingPerWeek) || trainingPerWeek < 0) {
    return "Training days/week must be a valid non-negative number.";
  }
  return null;
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
  const { data: configData, isLoading: configLoading } = useGetOnboardingConfigQuery();

  const termsVersion = configData?.config?.termsVersion ?? "1.0";
  const privacyVersion = configData?.config?.privacyVersion ?? "1.0";

  const [teamName, setTeamName] = useState("");
  const [injuries, setInjuries] = useState("");
  const [growthNotes, setGrowthNotes] = useState("");
  const [performanceGoals, setPerformanceGoals] = useState("");
  const [equipmentAccess, setEquipmentAccess] = useState("");
  const [members, setMembers] = useState<MemberDraft[]>([createEmptyMember()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    emailed: number;
    failed: Array<{ member: number; email: string; reason: string }>;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planAmount, setPlanAmount] = useState("");
  const [planDurationMonths, setPlanDurationMonths] = useState("3");
  const [planError, setPlanError] = useState<string | null>(null);
  const [planSuccess, setPlanSuccess] = useState<string | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  const memberErrors = useMemo(() => members.map((member) => validateMember(member)), [members]);
  const canSubmit =
    teamName.trim().length > 0 &&
    members.length > 0 &&
    memberErrors.every((error) => !error);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setResult(null);

    if (!canSubmit) {
      setFormError("Complete team details and fix member errors before creating accounts.");
      return;
    }

    setIsSubmitting(true);
    try {
      const csrfToken = getCsrfToken();
      const payload = {
        teamName: teamName.trim(),
        injuries: injuries.trim() || undefined,
        growthNotes: growthNotes.trim() || null,
        performanceGoals: performanceGoals.trim() || null,
        equipmentAccess: equipmentAccess.trim() || null,
        termsVersion,
        privacyVersion,
        appVersion: "admin-web",
        members: members.map((member) => ({
          email: member.email.trim(),
          guardianDisplayName: member.guardianDisplayName.trim(),
          athleteName: member.athleteName.trim(),
          birthDate: member.birthDate.trim(),
          trainingPerWeek: Number.parseInt(member.trainingPerWeek, 10),
          parentPhone: member.parentPhone?.trim() || null,
          relationToAthlete: member.relationToAthlete?.trim() || null,
        })),
      };
      const response = await fetch("/api/backend/admin/teams/provision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responsePayload?.error || "Failed to create team.");
      }
      setResult({
        created: Number(responsePayload?.created ?? 0),
        emailed: Number(responsePayload?.emailed ?? 0),
        failed: Array.isArray(responsePayload?.failed) ? responsePayload.failed : [],
      });
    } catch (error: any) {
      const message = error?.message ?? "Failed to create team.";
      setFormError(typeof message === "string" ? message : "Failed to create team.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPlanModal = () => {
    setPlanError(null);
    setPlanSuccess(null);
    if (!planName.trim()) {
      const trimmedTeamName = teamName.trim();
      setPlanName(trimmedTeamName ? `PHP Team - ${trimmedTeamName}` : "PHP Team - ");
    }
    setPlanModalOpen(true);
  };

  const createTeamPlan = async () => {
    setPlanError(null);
    setPlanSuccess(null);
    const cleanName = planName.trim();
    const cleanAmount = planAmount.trim();
    const months = Number.parseInt(planDurationMonths, 10);

    if (!cleanName) {
      setPlanError("Plan name is required.");
      return;
    }
    if (!cleanAmount) {
      setPlanError("Amount is required.");
      return;
    }
    if (!Number.isFinite(months) || months < 1) {
      setPlanError("Duration (months) must be a positive number.");
      return;
    }

    setIsCreatingPlan(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/backend/admin/subscription-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({
          name: cleanName,
          tier: "PHP",
          stripePriceId: "manual",
          displayPrice: `${cleanAmount} for ${months} month${months === 1 ? "" : "s"}`,
          billingInterval: `${months}_months`,
          isActive: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to create team plan.");
      }
      setPlanSuccess(`Plan created: ${payload?.plan?.name ?? cleanName}`);
      setPlanModalOpen(false);
    } catch (error: any) {
      const message = error?.message ?? "Failed to create team plan.";
      setPlanError(typeof message === "string" ? message : "Failed to create team plan.");
    } finally {
      setIsCreatingPlan(false);
    }
  };

  return (
    <AdminShell
      title="Add team"
      subtitle="Bulk-create guardian + athlete accounts for the team roster."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/users" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>
        </Button>
      }
    >
      <div className="mx-auto grid max-w-4xl gap-6">
        {configLoading ? <p className="text-sm text-muted-foreground">Loading onboarding defaults…</p> : null}

        {formError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{formError}</div>
        ) : null}

        {result ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <p className="font-medium">
              Team import complete: {result.created} created, {result.emailed} welcome emails sent.
            </p>
            {result.failed.length ? (
              <div className="mt-3 space-y-2 text-amber-200/90">
                <p>{result.failed.length} member(s) failed:</p>
                {result.failed.slice(0, 8).map((item) => (
                  <p key={`${item.member}-${item.email}`}>
                    Member {item.member} ({item.email || "no email"}): {item.reason}
                  </p>
                ))}
              </div>
            ) : null}
            <div className="mt-4">
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href="/users">Go to users</Link>
              </Button>
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Team defaults</CardTitle>
              <CardDescription>
                Set team details used for member onboarding.
              </CardDescription>
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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="injuries">Injuries / history</Label>
                <Textarea
                  id="injuries"
                  rows={2}
                  value={injuries}
                  onChange={(event) => setInjuries(event.target.value)}
                  placeholder="Optional team-wide default notes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="growthNotes">Growth notes</Label>
                <Textarea
                  id="growthNotes"
                  rows={2}
                  value={growthNotes}
                  onChange={(event) => setGrowthNotes(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="performanceGoals">Performance goals</Label>
                <Textarea
                  id="performanceGoals"
                  rows={2}
                  value={performanceGoals}
                  onChange={(event) => setPerformanceGoals(event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="equipmentAccess">Equipment access</Label>
                <Textarea
                  id="equipmentAccess"
                  rows={2}
                  value={equipmentAccess}
                  onChange={(event) => setEquipmentAccess(event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team members</CardTitle>
              <CardDescription>
                Fill one form per member. Each member creates one guardian login and one athlete profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.map((member, index) => (
                <div key={`member-${index}`} className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Member {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={members.length === 1}
                      onClick={() =>
                        setMembers((current) => current.filter((_, rowIndex) => rowIndex !== index))
                      }
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      type="email"
                      placeholder="Guardian email"
                      value={member.email}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, email: event.target.value } : row
                          )
                        )
                      }
                    />
                    <Input
                      placeholder="Guardian name"
                      value={member.guardianDisplayName}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, guardianDisplayName: event.target.value } : row
                          )
                        )
                      }
                    />
                    <Input
                      placeholder="Athlete name"
                      value={member.athleteName}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, athleteName: event.target.value } : row
                          )
                        )
                      }
                    />
                    <Input
                      type="date"
                      value={member.birthDate}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, birthDate: event.target.value } : row
                          )
                        )
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Training days / week"
                      value={member.trainingPerWeek}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, trainingPerWeek: event.target.value } : row
                          )
                        )
                      }
                    />
                    <Input
                      placeholder="Parent phone (optional)"
                      value={member.parentPhone ?? ""}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, parentPhone: event.target.value } : row
                          )
                        )
                      }
                    />
                    <Input
                      className="sm:col-span-2"
                      placeholder="Relation to athlete (optional)"
                      value={member.relationToAthlete ?? ""}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, relationToAthlete: event.target.value } : row
                          )
                        )
                      }
                    />
                  </div>
                  {memberErrors[index] ? (
                    <p className="mt-2 text-xs text-red-300">{memberErrors[index]}</p>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setMembers((current) => [...current, createEmptyMember()])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add member
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" asChild>
              <Link href="/users">Cancel</Link>
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting || configLoading}>
              {isSubmitting ? "Creating team…" : "Create team & send passwords"}
            </Button>
          </div>
        </form>

        <Card>
          <CardHeader>
            <CardTitle>Create plan for this team</CardTitle>
            <CardDescription>
              Create a single fixed-duration plan (no monthly/yearly split).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Team: <span className="text-foreground">{teamName.trim() || "Not set yet"}</span>
            </p>
            <Button type="button" onClick={openPlanModal} disabled={!teamName.trim()}>
              Create plan
            </Button>
          </CardContent>
        </Card>
        {planSuccess ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {planSuccess}
          </div>
        ) : null}
        {planError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {planError}
          </div>
        ) : null}
      </div>

      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create team plan</DialogTitle>
            <DialogDescription>Set plan name, amount, and total duration in months.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan name</Label>
              <Input
                id="plan-name"
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
                placeholder="e.g. PHP Team - U14 Phoenix"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-amount">How much</Label>
              <Input
                id="plan-amount"
                value={planAmount}
                onChange={(event) => setPlanAmount(event.target.value)}
                placeholder="e.g. $399"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-months">How many months it will last</Label>
              <Input
                id="plan-months"
                type="number"
                min={1}
                value={planDurationMonths}
                onChange={(event) => setPlanDurationMonths(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPlanModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void createTeamPlan()} disabled={isCreatingPlan}>
                {isCreatingPlan ? "Creating plan…" : "Save plan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
