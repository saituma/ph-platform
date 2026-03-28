"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ParentShell } from "../../../components/parent/shell";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";

type PlanTier = "PHP" | "PHP_Plus" | "PHP_Premium";

type PlanFormState = {
  id: number | null;
  name: string;
  tier: PlanTier;
  stripePriceId: string;
  displayPrice: string;
  billingInterval: string;
  monthlyPrice: string;
  yearlyPrice: string;
  discountType: string;
  monthlyDiscountEnabled: boolean;
  monthlyDiscountValue: string;
  yearlyDiscountEnabled: boolean;
  yearlyDiscountValue: string;
  isActive: boolean;
};

const defaultForm: PlanFormState = {
  id: null,
  name: "",
  tier: "PHP",
  stripePriceId: "manual",
  displayPrice: "",
  billingInterval: "",
  monthlyPrice: "",
  yearlyPrice: "",
  discountType: "percent",
  monthlyDiscountEnabled: false,
  monthlyDiscountValue: "",
  yearlyDiscountEnabled: false,
  yearlyDiscountValue: "",
  isActive: true,
};

function parseDiscountFields(plan: any) {
  const rawValue = String(plan?.discountValue ?? "").trim();
  const appliesTo = String(plan?.discountAppliesTo ?? "").trim().toLowerCase();
  if (!rawValue) {
    return {
      monthlyDiscountEnabled: false,
      monthlyDiscountValue: "",
      yearlyDiscountEnabled: false,
      yearlyDiscountValue: "",
    };
  }
  if (appliesTo === "custom") {
    try {
      const parsed = JSON.parse(rawValue) as { monthly?: unknown; yearly?: unknown };
      const monthlyValue = parsed.monthly == null ? "" : String(parsed.monthly);
      const yearlyValue = parsed.yearly == null ? "" : String(parsed.yearly);
      return {
        monthlyDiscountEnabled: Boolean(monthlyValue.trim()),
        monthlyDiscountValue: monthlyValue,
        yearlyDiscountEnabled: Boolean(yearlyValue.trim()),
        yearlyDiscountValue: yearlyValue,
      };
    } catch {
      return {
        monthlyDiscountEnabled: false,
        monthlyDiscountValue: "",
        yearlyDiscountEnabled: false,
        yearlyDiscountValue: "",
      };
    }
  }
  if (appliesTo === "monthly") {
    return { monthlyDiscountEnabled: true, monthlyDiscountValue: rawValue, yearlyDiscountEnabled: false, yearlyDiscountValue: "" };
  }
  if (appliesTo === "yearly") {
    return { monthlyDiscountEnabled: false, monthlyDiscountValue: "", yearlyDiscountEnabled: true, yearlyDiscountValue: rawValue };
  }
  if (appliesTo === "both") {
    return { monthlyDiscountEnabled: true, monthlyDiscountValue: rawValue, yearlyDiscountEnabled: true, yearlyDiscountValue: rawValue };
  }
  return {
    monthlyDiscountEnabled: false,
    monthlyDiscountValue: "",
    yearlyDiscountEnabled: false,
    yearlyDiscountValue: "",
  };
}

const getCsrfToken = () =>
  document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("csrfToken="))
    ?.split("=")[1] ?? "";

function buildDisplayPrice(plan: Pick<PlanFormState, "monthlyPrice" | "yearlyPrice">) {
  const parts: string[] = [];
  const monthly = plan.monthlyPrice.trim();
  const yearly = plan.yearlyPrice.trim();
  if (monthly) parts.push(`Monthly ${monthly}`);
  if (yearly) parts.push(`Yearly ${yearly}`);
  return parts.length ? parts.join(" • ") : "Free";
}

function normalizeBillingInterval(plan: Pick<PlanFormState, "monthlyPrice" | "yearlyPrice" | "billingInterval">) {
  const hasMonthly = Boolean(plan.monthlyPrice.trim());
  const hasYearly = Boolean(plan.yearlyPrice.trim());
  if (hasMonthly && hasYearly) return "monthly, yearly";
  if (hasMonthly) return "monthly";
  if (hasYearly) return "yearly";
  return plan.billingInterval.trim() || "free";
}

export default function ParentBillingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [form, setForm] = useState<PlanFormState>(defaultForm);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [approvalSearch, setApprovalSearch] = useState("");

  const resetEditor = useCallback(() => {
    setForm(defaultForm);
    setIsEditorOpen(false);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [plansRes, requestsRes] = await Promise.all([
        fetch("/api/backend/admin/subscription-plans").then((res) => res.json()),
        fetch("/api/backend/admin/subscription-requests").then((res) => res.json()),
      ]);
      setPlans(plansRes.plans ?? []);
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

  const handleSavePlan = async () => {
    if (!form.id) return;
    setActionError(null);
    setIsSaving(true);
    try {
      const csrfToken = getCsrfToken();
      const payload = {
        name: form.name,
        tier: form.tier,
        stripePriceId: form.stripePriceId || "manual",
        displayPrice: buildDisplayPrice(form),
        billingInterval: normalizeBillingInterval(form),
        monthlyPrice: form.monthlyPrice,
        yearlyPrice: form.yearlyPrice,
        discountType: form.discountType,
        discountValue: JSON.stringify({
          monthly: form.monthlyDiscountEnabled ? form.monthlyDiscountValue.trim() || undefined : undefined,
          yearly: form.yearlyDiscountEnabled ? form.yearlyDiscountValue.trim() || undefined : undefined,
        }),
        discountAppliesTo: "custom",
        isActive: form.isActive,
      };
      const res = await fetch(`/api/backend/admin/subscription-plans/${form.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to save plan.");
      }
      await loadData();
      resetEditor();
    } catch (error: any) {
      setActionError(error?.message || "Failed to save plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPlan = (plan: any) => {
    setForm({
      id: plan.id ?? null,
      name: plan.name ?? "",
      tier: (plan.tier ?? "PHP") as PlanTier,
      stripePriceId: plan.stripePriceId ?? "manual",
      displayPrice: plan.displayPrice ?? "",
      billingInterval: plan.billingInterval ?? "",
      monthlyPrice: plan.monthlyPrice ?? "",
      yearlyPrice: plan.yearlyPrice ?? "",
      discountType: plan.discountType ?? "percent",
      ...parseDiscountFields(plan),
      isActive: Boolean(plan.isActive),
    });
    setIsEditorOpen(true);
  };

  const handleApprove = async (requestId: number) => {
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(
        `/api/backend/admin/subscription-requests/${requestId}/approve`,
        { method: "POST", headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined }
      );
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
      const res = await fetch(
        `/api/backend/admin/subscription-requests/${requestId}/reject`,
        { method: "POST", headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to reject request.");
      }
      await loadData();
    } catch (error: any) {
      setActionError(error?.message || "Failed to reject request.");
    }
  };

  const filteredRequests = requests.filter((request) =>
    String(request?.userName ?? "")
      .toLowerCase()
      .includes(approvalSearch.trim().toLowerCase())
  );

  return (
    <ParentShell
      title="Billing"
      subtitle="Control subscription pricing and approvals."
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/parent"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Portal
          </Link>
          <Button onClick={loadData}>Refresh</Button>
        </div>
      }
    >
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      Loading plans...
                    </TableCell>
                  </TableRow>
                ) : plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No plans available.
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>{plan.tier}</TableCell>
                      <TableCell>{plan.displayPrice}</TableCell>
                      <TableCell>{plan.isActive ? "Active" : "Inactive"}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guardian-approval-search">Search guardian</Label>
              <Input
                id="guardian-approval-search"
                value={approvalSearch}
                onChange={(event) => setApprovalSearch(event.target.value)}
                placeholder="Search by guardian name"
              />
            </div>
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
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      {approvalSearch.trim()
                        ? "No approvals match that guardian name."
                        : "No requests awaiting approval."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
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

      <Dialog
        open={isEditorOpen}
        onOpenChange={(open) => {
          if (!open) resetEditor();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Plan Pricing</DialogTitle>
            <DialogDescription>
              Update the selected plan&apos;s pricing, discounts, billing interval, and status.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Plan</Label>
              <Input value={form.name} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Monthly Price</Label>
              <Input
                value={form.monthlyPrice}
                onChange={(event) => setForm((prev) => ({ ...prev, monthlyPrice: event.target.value }))}
                placeholder="$29"
              />
            </div>
            <div className="space-y-2">
              <Label>Yearly Price</Label>
              <Input
                value={form.yearlyPrice}
                onChange={(event) => setForm((prev) => ({ ...prev, yearlyPrice: event.target.value }))}
                placeholder="$290"
              />
            </div>
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Input value="Percent" readOnly />
            </div>
            <div className="space-y-2">
              <Label>Monthly Discount (%)</Label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.monthlyDiscountEnabled}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, monthlyDiscountEnabled: event.target.checked }))
                  }
                />
                <span>Enable monthly discount</span>
              </label>
              <Input
                value={form.monthlyDiscountValue}
                onChange={(event) => setForm((prev) => ({ ...prev, monthlyDiscountValue: event.target.value }))}
                placeholder="0"
                disabled={!form.monthlyDiscountEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Yearly Discount (%)</Label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.yearlyDiscountEnabled}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, yearlyDiscountEnabled: event.target.checked }))
                  }
                />
                <span>Enable yearly discount</span>
              </label>
              <Input
                value={form.yearlyDiscountValue}
                onChange={(event) => setForm((prev) => ({ ...prev, yearlyDiscountValue: event.target.value }))}
                placeholder="0"
                disabled={!form.yearlyDiscountEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.isActive ? "active" : "inactive"}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Display Price Preview</Label>
              <Input value={buildDisplayPrice(form)} readOnly />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={resetEditor}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan} disabled={!form.id || isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ParentShell>
  );
}
