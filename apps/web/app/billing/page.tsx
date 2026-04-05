"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CreditCard, ShieldCheck } from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/utils";

type BillingSummary = {
  planCount: number;
  activePlanCount: number;
  pendingApprovalCount: number;
};

type PlanSummaryItem = {
  isActive?: boolean;
};

type ApprovalRequestSummaryItem = {
  status?: string;
};

const DEFAULT_SUMMARY: BillingSummary = {
  planCount: 0,
  activePlanCount: 0,
  pendingApprovalCount: 0,
};

export default function BillingOverviewPage() {
  const [summary, setSummary] = useState<BillingSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansRes, requestsRes] = await Promise.all([
        fetch("/api/backend/admin/subscription-plans").then((res) => res.json()),
        fetch("/api/backend/admin/subscription-requests").then((res) => res.json()),
      ]);
      const plans: PlanSummaryItem[] = Array.isArray(plansRes?.plans) ? plansRes.plans : [];
      const requests: ApprovalRequestSummaryItem[] = Array.isArray(requestsRes?.requests) ? requestsRes.requests : [];
      setSummary({
        planCount: plans.length,
        activePlanCount: plans.filter((plan) => plan.isActive).length,
        pendingApprovalCount: requests.filter((request) => request.status === "pending").length,
      });
    } catch {
      setSummary(DEFAULT_SUMMARY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const cards = [
    {
      title: "Subscription Plans",
      description: "Review live pricing, tiers, and active plan configuration used across the app.",
      href: "/billing/plans",
      icon: CreditCard,
      stat: isLoading ? "Loading..." : `${summary.planCount} plans · ${summary.activePlanCount} active`,
      accent: "from-emerald-500/15 to-teal-500/10 border-emerald-500/20",
      iconBg: "bg-emerald-500/15 text-emerald-300",
    },
    {
      title: "Pending Approvals",
      description: "Handle guardian subscription change requests and keep access aligned with approvals.",
      href: "/billing/pending-approvals",
      icon: ShieldCheck,
      stat: isLoading ? "Loading..." : `${summary.pendingApprovalCount} awaiting review`,
      accent: "from-amber-500/15 to-orange-500/10 border-amber-500/20",
      iconBg: "bg-amber-500/15 text-amber-300",
    },
  ];

  return (
    <AdminShell
      title="Billing"
      subtitle="Manage subscription plans and approval flow."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card
                className={cn(
                  "group h-full border bg-gradient-to-br transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                  card.accent
                )}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", card.iconBg)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle>{card.title}</CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-muted-foreground">{card.stat}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </AdminShell>
  );
}
