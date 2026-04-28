"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import {
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  CardFrameDescription,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Field, FieldLabel } from "../../components/ui/field";
import { Skeleton } from "../../components/ui/skeleton";

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

/** A single metric display card using CardFrame */
function MetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameDescription>{label}</CardFrameDescription>
        {loading ? (
          <Skeleton className="mt-1 h-8 w-28 rounded-md" />
        ) : (
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
        )}
      </CardFrameHeader>
    </CardFrame>
  );
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

    return { projectedMonthly, projectedCommitmentValue, projectedYearly };
  }, [averageCommitmentMonths, averageMonthlyPrice, newAthletesPerMonth]);

  return (
    <AdminShell title="Stats" subtitle="Revenue view and income calculator for admin decisions.">
      <div className="space-y-8">
        {/* Revenue Snapshot */}
        <section className="space-y-4">
          <SectionHeader
            title="Revenue Snapshot"
            description={
              isLoading
                ? "Loading billing metrics…"
                : "Live metrics from subscription requests and approvals."
            }
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Approved Revenue (Total)" value={formatMoney(approvedRevenueTotal)} loading={isLoading} />
            <MetricCard label="MRR Estimate" value={formatMoney(monthlyRecurringEstimate)} loading={isLoading} />
            <MetricCard label="Paid Requests" value={String(paidRequests.length)} loading={isLoading} />
            <MetricCard label="Pending Approval Value" value={formatMoney(potentialRevenue)} loading={isLoading} />
          </div>
        </section>

        {/* Calculator + Revenue by Tier */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Income Calculator */}
          <CardFrame>
            <CardFrameHeader>
              <CardFrameTitle>Income Calculator</CardFrameTitle>
              <CardFrameDescription>
                Estimate revenue from new athlete signups.
              </CardFrameDescription>
            </CardFrameHeader>

            <div className="px-6 pb-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="newAthletes">New Athletes / Month</FieldLabel>
                  <Input
                    id="newAthletes"
                    type="number"
                    value={newAthletesPerMonth}
                    onChange={(event) => setNewAthletesPerMonth(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="avgPrice">Avg Monthly Price</FieldLabel>
                  <Input
                    id="avgPrice"
                    type="number"
                    value={averageMonthlyPrice}
                    onChange={(event) => setAverageMonthlyPrice(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="avgCommitment">Avg Commitment (Months)</FieldLabel>
                  <Input
                    id="avgCommitment"
                    type="number"
                    value={averageCommitmentMonths}
                    onChange={(event) => setAverageCommitmentMonths(event.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <CardFrame>
                  <CardFrameHeader>
                    <CardFrameDescription>Projected Monthly</CardFrameDescription>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {formatMoney(calculator.projectedMonthly)}
                    </p>
                  </CardFrameHeader>
                </CardFrame>
                <CardFrame>
                  <CardFrameHeader>
                    <CardFrameDescription>Projected 12-Month</CardFrameDescription>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {formatMoney(calculator.projectedYearly)}
                    </p>
                  </CardFrameHeader>
                </CardFrame>
                <CardFrame>
                  <CardFrameHeader>
                    <CardFrameDescription>Commitment Contract Value</CardFrameDescription>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {formatMoney(calculator.projectedCommitmentValue)}
                    </p>
                  </CardFrameHeader>
                </CardFrame>
              </div>
            </div>
          </CardFrame>

          {/* Revenue by Tier */}
          <CardFrame>
            <CardFrameHeader>
              <CardFrameTitle>Revenue by Tier</CardFrameTitle>
              <CardFrameDescription>Approved subscriptions grouped by plan tier.</CardFrameDescription>
            </CardFrameHeader>

            <div className="px-6 pb-6 space-y-3">
              {!revenueByTier.length ? (
                <p className="text-sm text-muted-foreground">No approved revenue yet.</p>
              ) : (
                revenueByTier.map(([tier, summary]) => (
                  <CardFrame key={tier}>
                    <CardFrameHeader>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{tier}</p>
                          <CardFrameDescription>{summary.count} approved request{summary.count !== 1 ? "s" : ""}</CardFrameDescription>
                        </div>
                        <p className="text-sm font-semibold tabular-nums text-foreground">
                          {formatMoney(summary.total)}
                        </p>
                      </div>
                    </CardFrameHeader>
                  </CardFrame>
                ))
              )}
            </div>
          </CardFrame>
        </div>

        {/* Plan Coverage */}
        <section className="space-y-4">
          <SectionHeader title="Plan Coverage" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total Plans" value={String(plans.length)} loading={isLoading} />
            <MetricCard
              label="Active Plans"
              value={String(plans.filter((plan) => plan.isActive).length)}
              loading={isLoading}
            />
            <MetricCard
              label="Approved Requests"
              value={String(approvedRequests.length)}
              loading={isLoading}
            />
            <MetricCard
              label="Pending Approvals"
              value={String(
                requests.filter(
                  (request) => String(request.status ?? "").toLowerCase() === "pending_approval"
                ).length
              )}
              loading={isLoading}
            />
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
