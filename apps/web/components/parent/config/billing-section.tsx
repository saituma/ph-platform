"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select } from "../../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";

type PlanTier = "PHP" | "PHP_Plus" | "PHP_Premium";
type PlanFormState = {
  id?: number;
  name: string;
  tier: PlanTier;
  displayPrice: string;
  billingInterval: string;
  monthlyPrice: string;
  yearlyPrice: string;
  discountType: string;
  monthlyDiscountValue: string;
  yearlyDiscountValue: string;
  isActive: boolean;
};

const BILLING_INTERVALS = ["monthly", "yearly"] as const;
const getCsrfToken = () =>
  document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("csrfToken="))
    ?.split("=")[1] ?? "";

function parseIntervals(value: string) {
  return new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function formatIntervals(values: Set<string>) {
  return Array.from(values).join(", ");
}

const PLAN_DEFINITIONS: PlanFormState[] = [
  {
    name: "PHP Program",
    tier: "PHP",
    displayPrice: "",
    billingInterval: "monthly",
    monthlyPrice: "",
    yearlyPrice: "",
    discountType: "percent",
    monthlyDiscountValue: "",
    yearlyDiscountValue: "",
    isActive: true,
  },
  {
    name: "PHP Plus",
    tier: "PHP_Plus",
    displayPrice: "",
    billingInterval: "monthly",
    monthlyPrice: "",
    yearlyPrice: "",
    discountType: "percent",
    monthlyDiscountValue: "",
    yearlyDiscountValue: "",
    isActive: true,
  },
  {
    name: "PHP Premium (1:1)",
    tier: "PHP_Premium",
    displayPrice: "",
    billingInterval: "monthly",
    monthlyPrice: "",
    yearlyPrice: "",
    discountType: "percent",
    monthlyDiscountValue: "",
    yearlyDiscountValue: "",
    isActive: true,
  },
];

function parseDiscountFields(plan: any) {
  const rawValue = String(plan?.discountValue ?? "").trim();
  const appliesTo = String(plan?.discountAppliesTo ?? "").trim().toLowerCase();
  if (!rawValue) {
    return { monthlyDiscountValue: "", yearlyDiscountValue: "" };
  }
  if (appliesTo === "custom") {
    try {
      const parsed = JSON.parse(rawValue) as { monthly?: unknown; yearly?: unknown };
      return {
        monthlyDiscountValue: parsed.monthly == null ? "" : String(parsed.monthly),
        yearlyDiscountValue: parsed.yearly == null ? "" : String(parsed.yearly),
      };
    } catch {
      return { monthlyDiscountValue: "", yearlyDiscountValue: "" };
    }
  }
  if (appliesTo === "monthly") return { monthlyDiscountValue: rawValue, yearlyDiscountValue: "" };
  if (appliesTo === "yearly") return { monthlyDiscountValue: "", yearlyDiscountValue: rawValue };
  if (appliesTo === "both") return { monthlyDiscountValue: rawValue, yearlyDiscountValue: rawValue };
  return { monthlyDiscountValue: "", yearlyDiscountValue: "" };
}

function buildDisplayPrice(plan: PlanFormState) {
  const monthly = plan.monthlyPrice?.trim();
  const yearly = plan.yearlyPrice?.trim();
  const parts: string[] = [];
  if (monthly) parts.push(`Monthly ${monthly}`);
  if (yearly) parts.push(`Yearly ${yearly}`);
  if (parts.length === 0) return "Free";
  return parts.join(" • ");
}

function normalizePlan(plan: PlanFormState) {
  return {
    ...plan,
    monthlyPrice: plan.monthlyPrice ?? "",
    yearlyPrice: plan.yearlyPrice ?? "",
    discountType: plan.discountType ?? "percent",
    monthlyDiscountValue: plan.monthlyDiscountValue ?? "",
    yearlyDiscountValue: plan.yearlyDiscountValue ?? "",
    billingInterval: plan.billingInterval ?? "monthly",
    displayPrice: buildDisplayPrice(plan),
  };
}

export function BillingSection() {
  const [plans, setPlans] = useState<any[]>([]);
  const [formPlans, setFormPlans] = useState<PlanFormState[]>(PLAN_DEFINITIONS);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<Record<
    string,
    { type: "success" | "error"; message: string }
  >>({});
  const updatePlanAt = (index: number, updater: (plan: PlanFormState) => PlanFormState) => {
    setFormPlans((prev) =>
      prev.map((item, idx) => (idx === index ? normalizePlan(updater(item)) : item))
    );
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [plansRes, requestsRes] = await Promise.all([
        fetch("/api/backend/admin/subscription-plans").then((res) => res.json()),
        fetch("/api/backend/admin/subscription-requests").then((res) => res.json()),
      ]);
      const loadedPlans = plansRes.plans ?? [];
      setPlans(loadedPlans);
      setFormPlans((prev) =>
        prev.map((plan) => {
          const existing = loadedPlans.find((item: any) => item.tier === plan.tier);
          if (!existing) return plan;
          const merged: PlanFormState = {
            ...plan,
            id: existing.id,
            name: existing.name ?? plan.name,
            displayPrice: existing.displayPrice ?? "",
            billingInterval: existing.billingInterval ?? plan.billingInterval,
            monthlyPrice: existing.monthlyPrice ?? "",
            yearlyPrice: existing.yearlyPrice ?? "",
            discountType: existing.discountType ?? "percent",
            ...parseDiscountFields(existing),
            isActive: existing.isActive ?? true,
          };
          return normalizePlan(merged);
        })
      );
      setRequests(requestsRes.requests ?? []);
    } catch (error: any) {
      setActionError(error?.message || "Failed to load billing data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSavePlan = async (plan: PlanFormState) => {
    setActionError(null);
    const key = plan.tier;
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(
        plan.id
          ? `/api/backend/admin/subscription-plans/${plan.id}`
          : "/api/backend/admin/subscription-plans",
        {
          method: plan.id ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          },
          body: JSON.stringify({
            name: plan.name,
            tier: plan.tier,
            displayPrice: buildDisplayPrice(plan),
            billingInterval: plan.billingInterval,
            monthlyPrice: plan.monthlyPrice,
            yearlyPrice: plan.yearlyPrice,
            discountType: "percent",
            discountValue: JSON.stringify({
              monthly: plan.monthlyDiscountValue.trim() || undefined,
              yearly: plan.yearlyDiscountValue.trim() || undefined,
            }),
            discountAppliesTo: "custom",
            isActive: plan.isActive,
            stripePriceId: "manual",
          }),
        }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to save plan.");
      }
      await loadData();
      setSaveStatus((prev) => ({ ...prev, [key]: { type: "success", message: "Saved successfully." } }));
    } catch (error: any) {
      const message = error?.message || "Failed to save plan.";
      setActionError(message);
      setSaveStatus((prev) => ({ ...prev, [key]: { type: "error", message: "Failed." } }));
    } finally {
      setTimeout(() => {
        setSaveStatus((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 2000);
    }
  };

  const handleApprove = async (requestId: number) => {
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/backend/admin/subscription-requests/${requestId}/approve`, {
        method: "POST",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to approve request.");
      }
      await loadData();
    } catch (error: any) {
      setActionError(error?.message || "Failed to approve request.");
    }
  };

  const handleReject = async (requestId: number) => {
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/backend/admin/subscription-requests/${requestId}/reject`, {
        method: "POST",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to reject request.");
      }
      await loadData();
    } catch (error: any) {
      setActionError(error?.message || "Failed to reject request.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white">Billing Controls</div>
          <div className="text-sm text-muted-foreground">
            Manage subscription pricing and approve plan changes.
          </div>
        </div>
        <Button variant="outline" onClick={loadData}>
          Refresh
        </Button>
      </div>

      {actionError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {formPlans.map((plan, index) => (
                <div key={plan.tier} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-sm uppercase text-muted-foreground">{plan.tier}</div>
                      <div className="text-lg font-semibold text-white">{plan.name}</div>
                    </div>
                    <Button onClick={() => handleSavePlan(plan)}>
                      {plan.id ? "Update Price" : "Save Price"}
                    </Button>
                  </div>
                  {saveStatus[plan.tier] ? (
                    <div
                      className={
                        saveStatus[plan.tier].type === "success"
                          ? "mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100"
                          : "mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
                      }
                    >
                      {saveStatus[plan.tier].message}
                    </div>
                  ) : null}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Monthly Price</Label>
                      <Input
                        value={plan.monthlyPrice ?? ""}
                        onChange={(event) => updatePlanAt(index, (item) => ({ ...item, monthlyPrice: event.target.value }))}
                        placeholder="$29"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Yearly Price</Label>
                      <Input
                        value={plan.yearlyPrice ?? ""}
                        onChange={(event) => updatePlanAt(index, (item) => ({ ...item, yearlyPrice: event.target.value }))}
                        placeholder="$290"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Billing Interval</Label>
                      <div className="flex flex-wrap gap-3 text-sm text-white/80">
                        {BILLING_INTERVALS.map((interval) => {
                          const selected = parseIntervals(plan.billingInterval);
                          const isChecked = selected.has(interval);
                          return (
                            <label key={interval} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(event) => {
                                  const next = new Set(selected);
                                  if (event.target.checked) {
                                    next.add(interval);
                                  } else {
                                    next.delete(interval);
                                  }
                                  const formatted = formatIntervals(next);
                                  updatePlanAt(index, (item) => ({ ...item, billingInterval: formatted }));
                                }}
                              />
                              <span className="capitalize">{interval}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Discount Type</Label>
                      <Input value="Percent" readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Discount (%)</Label>
                      <Input
                        value={plan.monthlyDiscountValue ?? ""}
                        onChange={(event) => updatePlanAt(index, (item) => ({ ...item, monthlyDiscountValue: event.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Yearly Discount (%)</Label>
                      <Input
                        value={plan.yearlyDiscountValue ?? ""}
                        onChange={(event) => updatePlanAt(index, (item) => ({ ...item, yearlyDiscountValue: event.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Loading requests...
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No requests awaiting approval.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.requestId}>
                      <TableCell>
                        <div className="font-medium">{request.userName}</div>
                        <div className="text-xs text-muted-foreground">{request.userEmail}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{request.planName}</div>
                        <div className="text-xs text-muted-foreground">
                          {request.displayPrice} • {request.billingInterval}
                        </div>
                      </TableCell>
                      <TableCell>{request.status}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprove(request.requestId)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(request.requestId)}>
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
