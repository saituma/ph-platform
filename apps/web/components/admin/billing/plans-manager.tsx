"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select } from "../../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import {
  buildDisplayPrice,
  defaultForm,
  getCsrfToken,
  normalizeBillingInterval,
  parseDiscountFields,
  type PlanFormState,
  type PlanTier,
} from "./billing-admin-utils";

export function PlansManager() {
  const [plans, setPlans] = useState<any[]>([]);
  const [form, setForm] = useState<PlanFormState>(defaultForm);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetEditor = useCallback(() => {
    setForm(defaultForm);
    setIsEditorOpen(false);
  }, []);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const plansRes = await fetch("/api/backend/admin/subscription-plans").then((res) => res.json());
      setPlans(plansRes.plans ?? []);
    } catch (error: any) {
      setActionError(error?.message || "Failed to load subscription plans.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

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
      await loadPlans();
      resetEditor();
    } catch (error: any) {
      setActionError(error?.message || "Failed to save plan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Subscription Plans</CardTitle>
          <CardDescription>
            Dynamic pricing plans used across billing approvals and tier-driven experiences.
          </CardDescription>
        </div>
        <Button variant="outline" onClick={loadPlans}>
          Refresh plans
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {actionError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {actionError}
          </div>
        ) : null}

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
    </Card>
  );
}
