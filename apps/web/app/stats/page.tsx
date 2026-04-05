"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

type PlanTier = "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro";

type AdminSubscriptionPlan = {
  id: number;
  name: string;
  tier: PlanTier;
  displayPrice?: string | null;
  monthlyPrice?: string | null;
  billingInterval?: string | null;
  isActive?: boolean;
};

type AdminSubscriptionRequest = {
  requestId: number;
  status?: string | null;
  paymentStatus?: string | null;
  displayPrice?: string | null;
  billingInterval?: string | null;
  planTier?: PlanTier | null;
  createdAt?: string | null;
};

function parseMoneyAmount(input?: string | null) {
  const raw = String(input ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.replace(/,/g, "");
  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return 0;
  const value = Number.parseFloat(match[0]);
  return Number.isFinite(value) ? value : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function startsWithMonthlyInterval(interval?: string | null) {
  const normalized = String(interval ?? "").trim().toLowerCase();
  return normalized === "monthly" || normalized.endsWith("_months");
}

function getCommitmentMonths(interval?: string | null) {
  const normalized = String(interval ?? "").trim().toLowerCase();
  const matched = normalized.match(/^(\d+)_months$/);
  if (!matched) return null;
  const months = Number.parseInt(matched[1] ?? "", 10);
  return Number.isFinite(months) ? months : null;
}

export default function StatsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([]);
  const [requests, setRequests] = useState<AdminSubscriptionRequest[]>([]);

  const [newAthletesPerMonth, setNewAthletesPerMonth] = useState("10");
  const [averageMonthlyPrice, setAverageMonthlyPrice] = useState("79");
  const [averageCommitmentMonths, setAverageCommitmentMonths] = useState("6");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const [plansRes, requestsRes] = await Promise.all([
          fetch("/api/backend/admin/subscription-plans").then((res) => res.json()),
          fetch("/api/backend/admin/subscription-requests").then((res) => res.json()),
        ]);
        if (!mounted) return;
        setPlans(Array.isArray(plansRes?.plans) ? plansRes.plans : []);
        setRequests(Array.isArray(requestsRes?.requests) ? requestsRes.requests : []);
      } catch {
        if (!mounted) return;
        setPlans([]);
        setRequests([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const approvedRequests = useMemo(
    () => requests.filter((request) => String(request.status ?? "").toLowerCase() === "approved"),
    [requests]
  );

  const paidRequests = useMemo(() => {
    const paidStatuses = new Set(["paid", "succeeded", "no_payment_required"]);
    return requests.filter((request) => paidStatuses.has(String(request.paymentStatus ?? "").toLowerCase()));
  }, [requests]);

  const approvedRevenueTotal = useMemo(
    () => approvedRequests.reduce((sum, request) => sum + parseMoneyAmount(request.displayPrice), 0),
    [approvedRequests]
  );

  const monthlyRecurringEstimate = useMemo(() => {
    return approvedRequests.reduce((sum, request) => {
      const amount = parseMoneyAmount(request.displayPrice);
      if (amount <= 0) return sum;
      if (startsWithMonthlyInterval(request.billingInterval)) return sum + amount;
      return sum;
    }, 0);
  }, [approvedRequests]);

  const potentialRevenue = useMemo(() => {
    return requests
      .filter((request) => String(request.status ?? "").toLowerCase() === "pending_approval")
      .reduce((sum, request) => sum + parseMoneyAmount(request.displayPrice), 0);
  }, [requests]);

  const revenueByTier = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const request of approvedRequests) {
      const key = request.planTier ?? "Unknown";
      const current = map.get(key) ?? { count: 0, total: 0 };
      current.count += 1;
      current.total += parseMoneyAmount(request.displayPrice);
      map.set(key, current);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [approvedRequests]);

  const calculator = useMemo(() => {
    const athletes = Number.parseFloat(newAthletesPerMonth);
    const monthlyPrice = Number.parseFloat(averageMonthlyPrice);
    const commitmentMonths = Number.parseFloat(averageCommitmentMonths);

    const safeAthletes = Number.isFinite(athletes) && athletes > 0 ? athletes : 0;
    const safePrice = Number.isFinite(monthlyPrice) && monthlyPrice > 0 ? monthlyPrice : 0;
    const safeCommitment = Number.isFinite(commitmentMonths) && commitmentMonths > 0 ? commitmentMonths : 0;

    const projectedMonthly = safeAthletes * safePrice;
    const projectedCommitmentValue = projectedMonthly * safeCommitment;
    const projectedYearly = projectedMonthly * 12;

    return {
      projectedMonthly,
      projectedCommitmentValue,
      projectedYearly,
    };
  }, [averageCommitmentMonths, averageMonthlyPrice, newAthletesPerMonth]);

  return (
    <AdminShell title="Stats" subtitle="Revenue view and income calculator for admin decisions.">
      <div className="space-y-6">
        <SectionHeader
          title="Revenue Snapshot"
          description={isLoading ? "Loading billing metrics..." : "Live metrics from subscription requests and approvals."}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Approved Revenue (Total)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatMoney(approvedRevenueTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">MRR Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatMoney(monthlyRecurringEstimate)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Paid Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{paidRequests.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pending Approval Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatMoney(potentialRevenue)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Income Calculator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="newAthletes">New Athletes / Month</Label>
                  <Input
                    id="newAthletes"
                    type="number"
                    value={newAthletesPerMonth}
                    onChange={(event) => setNewAthletesPerMonth(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="avgPrice">Average Monthly Price</Label>
                  <Input
                    id="avgPrice"
                    type="number"
                    value={averageMonthlyPrice}
                    onChange={(event) => setAverageMonthlyPrice(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="avgCommitment">Average Commitment (Months)</Label>
                  <Input
                    id="avgCommitment"
                    type="number"
                    value={averageCommitmentMonths}
                    onChange={(event) => setAverageCommitmentMonths(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="text-xs text-muted-foreground">Projected Monthly Revenue</p>
                  <p className="mt-1 text-lg font-semibold">{formatMoney(calculator.projectedMonthly)}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="text-xs text-muted-foreground">Projected 12-Month Revenue</p>
                  <p className="mt-1 text-lg font-semibold">{formatMoney(calculator.projectedYearly)}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="text-xs text-muted-foreground">Commitment Contract Value</p>
                  <p className="mt-1 text-lg font-semibold">{formatMoney(calculator.projectedCommitmentValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by Tier (Approved)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!revenueByTier.length ? (
                <p className="text-sm text-muted-foreground">No approved revenue yet.</p>
              ) : (
                revenueByTier.map(([tier, summary]) => (
                  <div key={tier} className="rounded-xl border border-border bg-secondary/35 p-3">
                    <p className="text-sm font-semibold">{tier}</p>
                    <p className="text-xs text-muted-foreground">{summary.count} approved requests</p>
                    <p className="mt-1 text-sm">{formatMoney(summary.total)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan Coverage</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-secondary/35 p-3">
              <p className="text-xs text-muted-foreground">Total Plans</p>
              <p className="mt-1 text-lg font-semibold">{plans.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/35 p-3">
              <p className="text-xs text-muted-foreground">Active Plans</p>
              <p className="mt-1 text-lg font-semibold">{plans.filter((plan) => plan.isActive).length}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/35 p-3">
              <p className="text-xs text-muted-foreground">Approved Requests</p>
              <p className="mt-1 text-lg font-semibold">{approvedRequests.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/35 p-3">
              <p className="text-xs text-muted-foreground">Pending Approvals</p>
              <p className="mt-1 text-lg font-semibold">
                {requests.filter((request) => String(request.status ?? "").toLowerCase() === "pending_approval").length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
