"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "../../ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardPanel } from "../../ui/card";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
} from "../../ui/dialog";
import { Empty, EmptyTitle, EmptyDescription } from "../../ui/empty";
import { Frame, FramePanel } from "../../ui/frame";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Badge } from "../../ui/badge";
import {
  buildDisplayPrice,
  defaultForm,
  getErrorMessage,
  getCsrfToken,
  normalizeBillingInterval,
  parseDiscountFields,
  type PlanFormState,
  type PlanTier,
  type SubscriptionPlan,
} from "./billing-admin-utils";

const TIER_ITEMS = [
  { label: "PHP Program", value: "PHP" },
  { label: "PHP Premium", value: "PHP_Premium" },
  { label: "PHP Premium Plus", value: "PHP_Premium_Plus" },
  { label: "PHP Pro", value: "PHP_Pro" },
];

const STATUS_ITEMS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export function PlansManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
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
      setPlans((plansRes.plans ?? []) as SubscriptionPlan[]);
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to load subscription plans."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const openCreatePlan = () => {
    setForm(defaultForm);
    setIsEditorOpen(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setForm({
      id: plan.id ?? null,
      name: plan.name ?? "",
      tier: (plan.tier ?? "PHP") as PlanTier,
      stripePriceId: plan.stripePriceId ?? "manual",
      displayPrice: plan.displayPrice ?? "",
      billingInterval: plan.billingInterval ?? "",
      monthlyPrice: plan.monthlyPrice ?? "",
      discountType: plan.discountType ?? "percent",
      ...parseDiscountFields(plan),
      isActive: Boolean(plan.isActive),
    });
    setIsEditorOpen(true);
  };

  const handleSavePlan = async () => {
    setActionError(null);
    setIsSaving(true);
    try {
      const csrfToken = getCsrfToken();
      const payload = {
        name: form.name.trim(),
        tier: form.tier,
        stripePriceId: form.stripePriceId || "manual",
        displayPrice: buildDisplayPrice(form),
        billingInterval: normalizeBillingInterval(form),
        monthlyPrice: form.monthlyPrice,
        yearlyPrice: "",
        discountType: form.discountType,
        discountValue: form.monthlyDiscountEnabled ? form.monthlyDiscountValue.trim() : "",
        discountAppliesTo: "monthly",
        isActive: form.isActive,
      };
      const isEditing = Boolean(form.id);
      const res = await fetch(
        isEditing
          ? `/api/backend/admin/subscription-plans/${form.id}`
          : "/api/backend/admin/subscription-plans",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const responsePayload = await res.json().catch(() => ({}));
        throw new Error(responsePayload?.error || `Failed to ${isEditing ? "save" : "create"} plan.`);
      }
      await loadPlans();
      resetEditor();
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to save plan."));
    } finally {
      setIsSaving(false);
    }
  };

  const isNameMissing = !form.name.trim();
  const isEditing = Boolean(form.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Plans</CardTitle>
        <CardDescription>
          Dynamic pricing plans used across billing approvals and tier-driven experiences.
        </CardDescription>
        <CardAction>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={loadPlans}>
              Refresh
            </Button>
            <Button onClick={openCreatePlan}>Add plan</Button>
          </div>
        </CardAction>
      </CardHeader>

      <CardPanel className="space-y-4">
        {actionError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive-foreground">
            {actionError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading plans...</div>
        ) : plans.length === 0 ? (
          <Empty className="py-12">
            <EmptyTitle>No plans yet</EmptyTitle>
            <EmptyDescription>Add your first subscription plan to get started.</EmptyDescription>
          </Empty>
        ) : (
          <Frame>
            <FramePanel className="p-0 overflow-hidden">
              <Table variant="card">
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
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>{plan.tier}</TableCell>
                      <TableCell>{plan.displayPrice}</TableCell>
                      <TableCell>
                        <Badge variant={plan.isActive ? "success" : "secondary"}>
                          {plan.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </FramePanel>
          </Frame>
        )}
      </CardPanel>

      <Dialog
        open={isEditorOpen}
        onOpenChange={(open) => {
          if (!open) resetEditor();
        }}
      >
        <DialogPopup className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Plan" : "Add Plan"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the selected plan's name, monthly pricing, discount, and status."
                : "Create a new plan with a name, monthly price, discount, and active status."}
            </DialogDescription>
          </DialogHeader>

          <DialogPanel className="space-y-4">
            <div className="rounded-lg border border-info/30 bg-info/8 p-3 text-sm text-info-foreground">
              <strong>Note:</strong> Mobile app subscription pricing is managed directly in Apple App Store Connect and Google Play Console via RevenueCat. The pricing below is read-only.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="plan-name">Plan Name</Label>
                <Input
                  id="plan-name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="PHP Premium (1:1)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-tier">Tier</Label>
                <Select
                  items={TIER_ITEMS}
                  value={form.tier}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, tier: (value ?? "PHP") as PlanTier }))
                  }
                >
                  <SelectTrigger id="plan-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {TIER_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-status">Status</Label>
                <Select
                  items={STATUS_ITEMS}
                  value={form.isActive ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, isActive: (value ?? "inactive") === "active" }))
                  }
                >
                  <SelectTrigger id="plan-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {STATUS_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Monthly Price (Web Fallback)</Label>
                <Input
                  value={form.monthlyPrice}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, monthlyPrice: event.target.value }))
                  }
                  placeholder="$29"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Input value="Percent" readOnly disabled />
              </div>

              <div className="space-y-2">
                <Label>Monthly Discount (%)</Label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground opacity-60">
                  <input
                    type="checkbox"
                    checked={form.monthlyDiscountEnabled}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, monthlyDiscountEnabled: event.target.checked }))
                    }
                    disabled
                  />
                  <span>Enable monthly discount</span>
                </label>
                <Input
                  value={form.monthlyDiscountValue}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, monthlyDiscountValue: event.target.value }))
                  }
                  placeholder="0"
                  disabled
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Display Price Preview</Label>
                <Input value={buildDisplayPrice(form)} readOnly disabled />
              </div>
            </div>
          </DialogPanel>

          <DialogFooter>
            <Button variant="ghost" onClick={resetEditor}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan} disabled={isNameMissing || isSaving}>
              {isSaving
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </Card>
  );
}
