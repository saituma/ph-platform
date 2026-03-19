"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ParentShell } from "../../../components/parent/shell";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
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

type PlanFormState = {
  name: string;
  tier: "PHP_Plus" | "PHP_Premium";
  stripePriceId: string;
  displayPrice: string;
  billingInterval: string;
  isActive: boolean;
};

const defaultForm: PlanFormState = {
  name: "",
  tier: "PHP_Plus",
  stripePriceId: "manual",
  displayPrice: "",
  billingInterval: "monthly",
  isActive: true,
};
const getCsrfToken = () =>
  document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("csrfToken="))
    ?.split("=")[1] ?? "";

export default function ParentBillingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [form, setForm] = useState<PlanFormState>(defaultForm);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

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
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(
        editingPlanId
          ? `/api/backend/admin/subscription-plans/${editingPlanId}`
          : "/api/backend/admin/subscription-plans",
        {
          method: editingPlanId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to save plan.");
      }
      setForm(defaultForm);
      setEditingPlanId(null);
      await loadData();
    } catch (error: any) {
      setActionError(error?.message || "Failed to save plan.");
    }
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    if (plan.tier === "PHP") return;
    setForm({
      name: plan.name ?? "",
      tier: plan.tier ?? "PHP_Plus",
      stripePriceId: plan.stripePriceId ?? "",
      displayPrice: plan.displayPrice ?? "",
      billingInterval: plan.billingInterval ?? "monthly",
      isActive: Boolean(plan.isActive),
    });
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="PHP Plus"
                />
              </div>
              <div className="space-y-2">
                <Label>Program Tier</Label>
                <Select
                  value={form.tier}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, tier: event.target.value as PlanFormState["tier"] }))
                  }
                >
                  <option value="PHP_Plus">PHP Plus</option>
                  <option value="PHP_Premium">PHP Premium</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Display Price</Label>
                <Input
                  value={form.displayPrice}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, displayPrice: event.target.value }))
                  }
                  placeholder="$29 / month"
                />
              </div>
              <div className="space-y-2">
                <Label>Billing Interval</Label>
                <Input
                  value={form.billingInterval}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, billingInterval: event.target.value }))
                  }
                  placeholder="monthly"
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
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSavePlan}>
                {editingPlanId ? "Update Plan" : "Create Plan"}
              </Button>
              {editingPlanId ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingPlanId(null);
                    setForm(defaultForm);
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>

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
                      No plans yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  plans
                    .filter((plan) => plan.tier !== "PHP")
                    .map((plan) => (
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(request.requestId)}
                          >
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
    </ParentShell>
  );
}
