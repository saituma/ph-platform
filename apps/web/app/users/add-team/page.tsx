"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
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

type Plan = {
  id: number;
  name: string;
  displayPrice: string;
  billingInterval: string;
};

export default function AddTeamPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [athleteType, setAthleteType] = useState<"youth" | "adult">("youth");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [planId, setPlanId] = useState<string>("");
  const [maxAthletes, setMaxAthletes] = useState<number>(10);
  const [paymentMethod, setPaymentMethod] = useState<"pay_now" | "email_link" | "cash">("pay_now");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "6months" | "yearly">("monthly");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await fetch("/api/backend/billing/plans");
        if (!response.ok) throw new Error("Failed to load plans");
        const data = await response.json();
        setPlans(data.plans || []);
        if (data.plans?.[0]) {
          setPlanId(String(data.plans[0].id));
        }
      } catch (err) {
        console.error("Error loading plans:", err);
      } finally {
        setIsLoadingPlans(false);
      }
    };
    void loadPlans();
  }, []);

  const selectedPlan = plans.find((p) => String(p.id) === planId);
  const unitPrice = selectedPlan ? parseFloat(selectedPlan.displayPrice.replace(/[^0-9.]/g, "")) : 0;
  
  const multiplier = billingCycle === "6months" ? 6 : billingCycle === "yearly" ? 12 : 1;
  const intervalTotal = unitPrice * multiplier; 
  const subtotal = intervalTotal * maxAthletes;

  const createTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const cleanTeamName = teamName.trim();
    if (!cleanTeamName) {
      setError("Team name is required.");
      return;
    }
    if (!planId) {
      setError("A subscription plan is required.");
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
        body: JSON.stringify({
          teamName: cleanTeamName,
          athleteType: athleteType,
          minAge: minAge ? parseInt(minAge, 10) : null,
          maxAge: maxAge ? parseInt(maxAge, 10) : null,
          planId: parseInt(planId, 10),
          maxAthletes: maxAthletes,
          paymentMethod,
          billingCycle,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to create team.");
      }

      // If Stripe Checkout URL is returned, redirect there
      if (payload?.checkoutUrl) {
        window.location.href = payload.checkoutUrl;
        return;
      }

      if (payload?.sentToEmail) {
        router.push("/teams?success=email_sent");
        return;
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
      subtitle="Register a new team with a subscription plan and athlete slots."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/users" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>
        </Button>
      }
    >
      <form onSubmit={createTeam} className="mx-auto grid max-w-4xl gap-6 pb-20">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Team Information</CardTitle>
            <CardDescription>Basic details about the organization or group.</CardDescription>
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
            <div className="space-y-2">
              <Label htmlFor="athleteType">Team Type</Label>
              <select
                id="athleteType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={athleteType}
                onChange={(e) => setAthleteType(e.target.value as any)}
              >
                <option value="youth">Youth Team (Parent Managed)</option>
                <option value="adult">Adult Team (Self Managed)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minAge">Min Age (Optional)</Label>
              <Input
                id="minAge"
                type="number"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                placeholder="e.g. 12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAge">Max Age (Optional)</Label>
              <Input
                id="maxAge"
                type="number"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                placeholder="e.g. 14"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing & Payment</CardTitle>
            <CardDescription>Choose how and when to pay for this team.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <select
                id="paymentMethod"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
              >
                <option value="pay_now">Stripe (Pay Immediately)</option>
                <option value="email_link">Stripe (Email Link to Admin)</option>
                <option value="cash">Cash / Manual (Offline Payment)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingCycle">Billing Cycle</Label>
              <select
                id="billingCycle"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as any)}
              >
                <option value="monthly">Monthly Recurring</option>
                <option value="6months">6 Months Upfront</option>
                <option value="yearly">Yearly Upfront (Best Value)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan & Slots</CardTitle>
            <CardDescription>Select the subscription plan and number of athletes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan">Subscription Plan</Label>
              {isLoadingPlans ? (
                <div className="h-10 animate-pulse rounded-md bg-muted" />
              ) : (
                <select
                  id="plan"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                >
                  <option value="">Select a plan...</option>
                  {plans.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name} ({p.displayPrice}/{p.billingInterval})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAthletes">Number of Athletes (Slots)</Label>
              <Input
                id="maxAthletes"
                type="number"
                min={1}
                max={200}
                required
                value={maxAthletes}
                onChange={(event) => setMaxAthletes(parseInt(event.target.value, 10))}
              />
            </div>

            {selectedPlan && (
              <div className="col-span-full rounded-xl bg-primary/5 p-4 border border-primary/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Price per athlete:</span>
                  <span className="font-medium text-foreground">
                    {selectedPlan.displayPrice.split(" ")[0]} {unitPrice.toFixed(2)} / month
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Interval:</span>
                  <span className="font-medium text-foreground uppercase">{billingCycle}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm border-b border-primary/10 pb-2">
                  <span className="text-muted-foreground">Total slots:</span>
                  <span className="font-medium text-foreground">{maxAthletes}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-base font-bold">
                  <span className="text-foreground">Total Due:</span>
                  <span className="text-primary font-black">
                    {selectedPlan.displayPrice.split(" ")[0]} {subtotal.toFixed(2)}
                  </span>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground italic">
                  {paymentMethod === "cash" 
                    ? "* Confirm that you have received this amount in cash before proceeding. Team will be activated immediately."
                    : paymentMethod === "email_link"
                    ? "* An email will be sent to the admin with a secure Stripe link to pay this amount."
                    : "* You will be redirected to Stripe to pay this amount immediately."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="ghost" asChild>
            <Link href="/teams">Cancel</Link>
          </Button>
          <Button type="submit" disabled={!teamName.trim() || !planId || isSubmitting}>
            {isSubmitting 
              ? "Processing…" 
              : paymentMethod === "cash" 
              ? "Confirm Cash & Activate" 
              : paymentMethod === "email_link" 
              ? "Create Team & Email Link" 
              : "Register Team & Pay"}
          </Button>
        </div>
      </form>
    </AdminShell>
  );
}
