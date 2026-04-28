"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CreditCard, ShieldCheck } from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import {
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  CardFrameDescription,
  CardFrameAction,
  CardFrameFooter,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";

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
      const requests: ApprovalRequestSummaryItem[] = Array.isArray(requestsRes?.requests)
        ? requestsRes.requests
        : [];
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
      description:
        "Review live pricing, tiers, and active plan configuration used across the app.",
      href: "/billing/plans",
      icon: CreditCard,
      badge: isLoading ? null : `${summary.planCount} plans`,
      badgeDetail: isLoading ? null : `${summary.activePlanCount} active`,
    },
    {
      title: "Pending Approvals",
      description:
        "Handle guardian subscription change requests and keep access aligned with approvals.",
      href: "/billing/pending-approvals",
      icon: ShieldCheck,
      badge: isLoading ? null : `${summary.pendingApprovalCount}`,
      badgeDetail: "awaiting review",
    },
  ];

  return (
    <AdminShell title="Billing" subtitle="Manage subscription plans and approval flow.">
      <div className="grid gap-5 lg:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="group block">
              <CardFrame className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardFrameHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardFrameTitle>{card.title}</CardFrameTitle>
                      <CardFrameDescription className="mt-1">
                        {card.description}
                      </CardFrameDescription>
                    </div>
                  </div>
                  <CardFrameAction>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </CardFrameAction>
                </CardFrameHeader>

                <CardFrameFooter className="px-6 pb-4 flex items-center gap-2">
                  {isLoading ? (
                    <Skeleton className="h-5 w-32 rounded-full" />
                  ) : (
                    <>
                      <Badge variant="secondary" className="rounded-full">
                        {card.badge}
                      </Badge>
                      {card.badgeDetail && (
                        <span className="text-xs text-muted-foreground">{card.badgeDetail}</span>
                      )}
                    </>
                  )}
                </CardFrameFooter>
              </CardFrame>
            </Link>
          );
        })}
      </div>
    </AdminShell>
  );
}
