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

type StripeSub = {
  subscriptionId: string;
  status: string;
  customerEmail: string | null;
  customerName: string | null;
  amountCents: number;
  currency: string;
  billingCycleAnchor: string;
  card: { brand: string; last4: string; expMonth: number; expYear: number } | null;
  failureCode: string | null;
  failureDeclineCode: string | null;
  nextRetryAt: string | null;
};

function formatMoney(cents: number, currency = "gbp") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function MetricCard({
  label,
  value,
  sub,
  loading,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
  accent?: "green" | "red" | "amber";
}) {
  const accentClass = accent === "green"
    ? "text-green-600"
    : accent === "red"
    ? "text-red-600"
    : accent === "amber"
    ? "text-amber-600"
    : "text-foreground";

  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameDescription>{label}</CardFrameDescription>
        {loading ? (
          <Skeleton className="mt-1 h-8 w-28 rounded-md" />
        ) : (
          <>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${accentClass}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </>
        )}
      </CardFrameHeader>
    </CardFrame>
  );
}

export default function StatsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [subs, setSubs] = useState<StripeSub[]>([]);
  const [planCount, setPlanCount] = useState(0);
  const [activePlanCount, setActivePlanCount] = useState(0);

  const [newAthletesPerMonth, setNewAthletesPerMonth] = useState("10");
  const [averageMonthlyPrice, setAverageMonthlyPrice] = useState("79");
  const [averageCommitmentMonths, setAverageCommitmentMonths] = useState("6");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const [stripeRes, plansRes] = await Promise.all([
          fetch("/api/backend/admin/stripe/payment-status").then((r) => r.json()),
          fetch("/api/backend/admin/subscription-plans").then((r) => r.json()),
        ]);
        if (!mounted) return;
        setSubs(Array.isArray(stripeRes?.subscriptions) ? stripeRes.subscriptions : []);
        const plans = Array.isArray(plansRes?.plans) ? plansRes.plans : [];
        setPlanCount(plans.length);
        setActivePlanCount(plans.filter((p: { isActive?: boolean }) => p.isActive).length);
      } catch {
        if (!mounted) return;
        setSubs([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const active = useMemo(() => subs.filter((s) => s.status === "active"), [subs]);
  const pastDue = useMemo(() => subs.filter((s) => s.status === "past_due"), [subs]);
  const cancelled = useMemo(() => subs.filter((s) => s.status === "canceled"), [subs]);

  const mrr = useMemo(() => active.reduce((s, r) => s + r.amountCents, 0), [active]);
  const pastDueValue = useMemo(() => pastDue.reduce((s, r) => s + r.amountCents, 0), [pastDue]);
  const arr = mrr * 12;

  // Group active subs by amount band as a proxy for tier
  const revenueByBand = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const s of active) {
      const amt = s.amountCents;
      const label =
        amt >= 17000 ? "Team (£178/mo)" :
        amt >= 9800 && amt < 17000 ? "Individual Pro (£99/mo)" :
        amt >= 6500 && amt < 9800 ? "Individual (£69.99/mo)" :
        amt >= 3400 && amt < 6500 ? "Team Player (£34.99/mo)" :
        amt >= 3000 && amt < 3400 ? "Team Player (£32/mo)" :
        `Other (${formatMoney(amt)})`;
      const cur = map.get(label) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += amt;
      map.set(label, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [active]);

  const calculator = useMemo(() => {
    const athletes = Number.parseFloat(newAthletesPerMonth);
    const monthlyPrice = Number.parseFloat(averageMonthlyPrice);
    const commitmentMonths = Number.parseFloat(averageCommitmentMonths);
    const sa = Number.isFinite(athletes) && athletes > 0 ? athletes : 0;
    const sp = Number.isFinite(monthlyPrice) && monthlyPrice > 0 ? monthlyPrice : 0;
    const sc = Number.isFinite(commitmentMonths) && commitmentMonths > 0 ? commitmentMonths : 0;
    return {
      projectedMonthly: sa * sp,
      projectedYearly: sa * sp * 12,
      projectedCommitmentValue: sa * sp * sc,
    };
  }, [newAthletesPerMonth, averageMonthlyPrice, averageCommitmentMonths]);

  return (
    <AdminShell title="Revenue & Growth" subtitle="Live revenue metrics pulled directly from Stripe.">
      <div className="space-y-8">

        {/* Primary metrics */}
        <section className="space-y-4">
          <SectionHeader
            title="Revenue Snapshot"
            description={isLoading ? "Loading from Stripe…" : `${active.length + pastDue.length + cancelled.length} total subscriptions tracked`}
          />
          <p className="text-xs text-muted-foreground">Live data from Stripe. Updates every page load.</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="MRR (Active)" value={isLoading ? "—" : formatMoney(mrr)} sub={`${active.length} active subs`} loading={isLoading} accent="green" />
            <MetricCard label="ARR" value={isLoading ? "—" : formatMoney(arr)} loading={isLoading} />
            <MetricCard label="Past Due" value={isLoading ? "—" : formatMoney(pastDueValue)} sub={`${pastDue.length} subscription${pastDue.length !== 1 ? "s" : ""}`} loading={isLoading} accent={pastDue.length > 0 ? "red" : undefined} />
            <MetricCard label="Cancelled" value={isLoading ? "—" : String(cancelled.length)} loading={isLoading} />
          </div>
        </section>

        {/* Past due detail */}
        {!isLoading && pastDue.length > 0 && (
          <section className="space-y-3">
            <SectionHeader title="Past Due" description="These subscriptions failed to renew today — at risk of churning." />
            <div className="rounded-xl border divide-y overflow-hidden">
              {pastDue.map((s) => (
                <div key={s.subscriptionId} className="flex items-center justify-between px-4 py-3 bg-red-50/40 dark:bg-red-950/10">
                  <div>
                    <p className="text-sm font-medium">{s.customerName || "—"}</p>
                    <p className="text-xs text-muted-foreground">{s.customerEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatMoney(s.amountCents)}/mo</p>
                    {s.nextRetryAt && (
                      <p className="text-xs text-amber-600">Retry {new Date(s.nextRetryAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Calculator + Revenue by tier */}
        <p className="text-sm font-semibold text-foreground">Growth Calculator</p>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <CardFrame>
            <CardFrameHeader>
              <CardFrameTitle>Income Calculator</CardFrameTitle>
              <CardFrameDescription>Estimate revenue from new athlete signups.</CardFrameDescription>
            </CardFrameHeader>
            <div className="px-6 pb-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="newAthletes">New Athletes / Month</FieldLabel>
                  <Input id="newAthletes" type="number" value={newAthletesPerMonth} onChange={(e) => setNewAthletesPerMonth(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="avgPrice">Avg Monthly Price</FieldLabel>
                  <Input id="avgPrice" type="number" value={averageMonthlyPrice} onChange={(e) => setAverageMonthlyPrice(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="avgCommitment">Avg Commitment (Months)</FieldLabel>
                  <Input id="avgCommitment" type="number" value={averageCommitmentMonths} onChange={(e) => setAverageCommitmentMonths(e.target.value)} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Projected Monthly", value: calculator.projectedMonthly * 100 },
                  { label: "Projected 12-Month", value: calculator.projectedYearly * 100 },
                  { label: "Commitment Contract Value", value: calculator.projectedCommitmentValue * 100 },
                ].map(({ label, value }) => (
                  <CardFrame key={label}>
                    <CardFrameHeader>
                      <CardFrameDescription>{label}</CardFrameDescription>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{formatMoney(value)}</p>
                    </CardFrameHeader>
                  </CardFrame>
                ))}
              </div>
            </div>
          </CardFrame>

          <CardFrame>
            <CardFrameHeader>
              <CardFrameTitle>Revenue by Tier</CardFrameTitle>
              <CardFrameDescription>Active subscriptions grouped by price band.</CardFrameDescription>
            </CardFrameHeader>
            <div className="px-6 pb-6 space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
              ) : revenueByBand.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active revenue.</p>
              ) : (
                revenueByBand.map(([label, { count, total }]) => (
                  <CardFrame key={label}>
                    <CardFrameHeader>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{label}</p>
                          <CardFrameDescription>{count} subscriber{count !== 1 ? "s" : ""}</CardFrameDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">{formatMoney(total)}/mo</p>
                        </div>
                      </div>
                    </CardFrameHeader>
                  </CardFrame>
                ))
              )}
            </div>
          </CardFrame>
        </div>

        {/* Plan coverage */}
        <section className="space-y-4">
          <SectionHeader title="Plan Coverage" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total Plans" value={String(planCount)} loading={isLoading} />
            <MetricCard label="Active Plans" value={String(activePlanCount)} loading={isLoading} />
            <MetricCard label="Active Subs" value={String(active.length)} loading={isLoading} accent="green" />
            <MetricCard label="Past Due Subs" value={String(pastDue.length)} loading={isLoading} accent={pastDue.length > 0 ? "red" : undefined} />
          </div>
        </section>

      </div>
    </AdminShell>
  );
}
