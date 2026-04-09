"use client";

import Link from "next/link";
import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
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
  const [teamName, setTeamName] = useState("");
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planAmount, setPlanAmount] = useState("");
  const [planDurationMonths, setPlanDurationMonths] = useState("3");
  const [planError, setPlanError] = useState<string | null>(null);
  const [planSuccess, setPlanSuccess] = useState<string | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  const openPlanModal = () => {
    setPlanError(null);
    setPlanSuccess(null);
    if (!planName.trim()) {
      const trimmedTeamName = teamName.trim();
      setPlanName(
        trimmedTeamName ? `PHP Team - ${trimmedTeamName}` : "PHP Team - ",
      );
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
    } catch (error: unknown) {
      setPlanError(getErrorMessage(error, "Failed to create team plan."));
    } finally {
      setIsCreatingPlan(false);
    }
  };

  return (
    <AdminShell
      title="Add team"
      subtitle="Create a plan now; assign members to teams later."
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
        <Card>
          <CardHeader>
            <CardTitle>Team defaults</CardTitle>
            <CardDescription>
              Set the team name used when you assign members later.
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create plan for this team</CardTitle>
            <CardDescription>
              Create a single fixed-duration plan (no monthly/yearly split).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Team:{" "}
              <span className="text-foreground">
                {teamName.trim() || "Not set yet"}
              </span>
            </p>
            <Button
              type="button"
              onClick={openPlanModal}
              disabled={!teamName.trim()}
            >
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
            <DialogDescription>
              Set plan name, amount, and total duration in months.
            </DialogDescription>
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
              <Button
                onClick={() => void createTeamPlan()}
                disabled={isCreatingPlan}
              >
                {isCreatingPlan ? "Creating plan…" : "Save plan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
