"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
import { Checkbox } from "../../ui/checkbox";
import { Tabs, TabsList, TabsTab, TabsPanel } from "../../ui/tabs";
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
  FEATURE_CATALOG,
  FLAT_FEATURE_CATALOG,
  TIER_ITEMS,
  defaultFormState,
  deriveMultipliedPrice,
  getCsrfToken,
  getErrorMessage,
  planFormToPayload,
  planToFormState,
  type DiscountAppliesTo,
  type DiscountType,
  type PlanFormState,
  type PlanTier,
  type SubscriptionPlan,
} from "./billing-admin-utils";

type StripePrice = {
  stripePriceId: string;
  lookupKey: string | null;
  currency: string;
  unitAmount: number | null;
  interval: string | null;
  intervalCount: number | null;
};

type StripeProduct = {
  stripeProductId: string;
  name: string;
  description: string | null;
  prices: StripePrice[];
};

type PriceRow = {
  productName: string;
  stripePriceId: string;
  lookupKey: string | null;
  unitAmount: number | null;
  currency: string;
  interval: string | null;
  intervalCount: number | null;
  dbPlanId: number | null;
  dbPlanName: string | null;
  dbPlanTier: PlanTier | null;
  dbPlanActive: boolean;
};

function formatStripePrice(unitAmount: number | null, currency: string, interval: string | null, intervalCount: number | null): string {
  if (unitAmount == null) return "—";
  const amount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(unitAmount / 100);
  if (!interval) return amount;
  const count = intervalCount && intervalCount > 1 ? `${intervalCount} ${interval}s` : interval;
  return `${amount}/${count}`;
}

export function PlansManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [stripeRows, setStripeRows] = useState<PriceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<PlanFormState | null>(null);
  const [importTarget, setImportTarget] = useState<PriceRow | null>(null);
  const [importName, setImportName] = useState("");
  const [importTier, setImportTier] = useState<PlanTier>("PHP");
  const [isImporting, setIsImporting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setStripeError(null);
    try {
      const [stripeRes, plansRes] = await Promise.all([
        fetch("/api/backend/admin/stripe-prices").then((r) => r.json()),
        fetch("/api/backend/admin/subscription-plans").then((r) => r.json()),
      ]);

      const products: StripeProduct[] = stripeRes.products ?? [];
      const planList: SubscriptionPlan[] = plansRes.plans ?? [];

      if (stripeRes.error) setStripeError(stripeRes.error);

      setPlans(planList);

      const planByPriceId = new Map<string, SubscriptionPlan>();
      for (const plan of planList) {
        if (plan.stripePriceId && plan.stripePriceId !== "manual") planByPriceId.set(plan.stripePriceId, plan);
        if (plan.stripePriceIdMonthly) planByPriceId.set(plan.stripePriceIdMonthly, plan);
        if (plan.stripePriceIdYearly) planByPriceId.set(plan.stripePriceIdYearly, plan);
        if (plan.stripePriceIdOneTime) planByPriceId.set(plan.stripePriceIdOneTime, plan);
      }

      const merged: PriceRow[] = [];
      for (const product of products) {
        for (const price of product.prices) {
          const dbPlan = planByPriceId.get(price.stripePriceId) ?? null;
          merged.push({
            productName: product.name,
            stripePriceId: price.stripePriceId,
            lookupKey: price.lookupKey,
            unitAmount: price.unitAmount,
            currency: price.currency,
            interval: price.interval,
            intervalCount: price.intervalCount,
            dbPlanId: dbPlan?.id ?? null,
            dbPlanName: dbPlan?.name ?? null,
            dbPlanTier: (dbPlan?.tier as PlanTier) ?? null,
            dbPlanActive: dbPlan?.isActive ?? false,
          });
        }
      }

      setStripeRows(merged);
    } catch (error: unknown) {
      setStripeError(getErrorMessage(error, "Failed to load billing data."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setActionError(null);
    setForm({ ...defaultFormState });
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setActionError(null);
    setForm(planToFormState(plan));
  };

  const handleSave = async () => {
    if (!form) return;
    setActionError(null);
    setIsSaving(true);
    try {
      const csrfToken = getCsrfToken();
      const isEditing = form.id != null;
      const payload = planFormToPayload(form);

      if (!payload.name) throw new Error("Name is required.");
      if (!form.monthlyEnabled && !form.yearlyEnabled && !form.oneTimeEnabled) {
        throw new Error("Enable at least one billing option (monthly, 6 months, or 1 year).");
      }
      if (form.monthlyEnabled && !form.monthlyPrice.trim()) throw new Error("Monthly price required.");
      if (form.yearlyEnabled && !payload.yearlyPrice) {
        throw new Error(form.yearlyAuto ? "Set a monthly price first to auto-derive 1 year." : "1 year price required.");
      }
      if (form.oneTimeEnabled && !payload.oneTimePrice) {
        throw new Error(form.oneTimeAuto ? "Set a monthly price first to auto-derive 6 months." : "6 months price required.");
      }

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
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Failed to ${isEditing ? "update" : "create"} plan.`);
      }
      await load();
      setForm(null);
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to save plan."));
    } finally {
      setIsSaving(false);
    }
  };

  const openImport = (row: PriceRow) => {
    setActionError(null);
    setImportTarget(row);
    setImportName(row.productName || "");
    setImportTier("PHP");
  };

  const handleImport = async () => {
    if (!importTarget) return;
    setActionError(null);
    if (!importName.trim()) {
      setActionError("Name is required.");
      return;
    }
    if (importTarget.unitAmount == null) {
      setActionError("This Stripe price has no amount set.");
      return;
    }
    setIsImporting(true);
    try {
      const csrfToken = getCsrfToken();
      const interval =
        importTarget.interval === "year"
          ? "yearly"
          : importTarget.interval === "month"
            ? "monthly"
            : "one_time";
      const symbol = importTarget.currency.toUpperCase() === "GBP" ? "£" : importTarget.currency.toUpperCase() === "USD" ? "$" : importTarget.currency.toUpperCase() === "EUR" ? "€" : "";
      const amount = (importTarget.unitAmount / 100).toString();
      const priceLabel = `${symbol}${amount}`;
      const suffix = interval === "monthly" ? "/mo" : interval === "yearly" ? "/yr" : " once";

      const res = await fetch("/api/backend/admin/subscription-plans/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({
          name: importName.trim(),
          tier: importTier,
          stripePriceId: importTarget.stripePriceId,
          interval,
          displayPrice: `${priceLabel}${suffix}`,
          priceLabel,
          isActive: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to import plan.");
      }
      await load();
      setImportTarget(null);
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to import plan."));
    } finally {
      setIsImporting(false);
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/backend/admin/subscription-plans/${plan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to toggle plan status.");
      }
      await load();
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to toggle plan."));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Plans</CardTitle>
        <CardDescription>
          Create plans with monthly, yearly, or one-time pricing. Stripe products and prices are created automatically.
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={load} disabled={isLoading}>
              {isLoading ? "Loading…" : "Refresh"}
            </Button>
            <Button onClick={openCreate}>New Plan</Button>
          </div>
        </CardAction>
      </CardHeader>

      <CardPanel className="space-y-4">
        {actionError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive-foreground">
            {actionError}
          </div>
        ) : null}

        {stripeError ? (
          <div className="rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-sm text-warning-foreground">
            Stripe error: {stripeError}
          </div>
        ) : null}

        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTab value="plans">Plans</TabsTab>
            <TabsTab value="stripe">Stripe Prices</TabsTab>
          </TabsList>

          <TabsPanel value="plans">
            <PlansTable plans={plans} isLoading={isLoading} onEdit={openEdit} onToggleActive={handleToggleActive} />
          </TabsPanel>

          <TabsPanel value="stripe">
            <StripePricesTable rows={stripeRows} isLoading={isLoading} onImport={openImport} />
          </TabsPanel>
        </Tabs>
      </CardPanel>

      <PlanEditorDialog
        form={form}
        onChange={setForm}
        onSave={handleSave}
        onCancel={() => setForm(null)}
        isSaving={isSaving}
        actionError={actionError}
        allFeatures={Array.from(
          new Set([
            ...FLAT_FEATURE_CATALOG,
            ...plans.flatMap((p) => (Array.isArray(p.features) ? p.features : [])),
          ]),
        )}
      />

      <Dialog open={importTarget !== null} onOpenChange={(open) => { if (!open) setImportTarget(null); }}>
        <DialogPopup className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Stripe price as plan</DialogTitle>
            <DialogDescription>
              Creates a DB plan row linked to this existing Stripe price. No new Stripe price will be created.
            </DialogDescription>
          </DialogHeader>

          {importTarget ? (
            <DialogPanel className="space-y-4">
              {actionError ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive-foreground">
                  {actionError}
                </div>
              ) : null}

              <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
                <div className="font-medium">{importTarget.productName}</div>
                <div className="text-xs text-muted-foreground">
                  {formatStripePrice(importTarget.unitAmount, importTarget.currency, importTarget.interval, importTarget.intervalCount)}
                </div>
                <div className="font-mono text-xs text-muted-foreground break-all mt-1">
                  {importTarget.stripePriceId}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-name">Plan name</Label>
                <Input
                  id="import-name"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder="e.g. PHP Premium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-tier">Tier</Label>
                <Select
                  items={TIER_ITEMS}
                  value={importTier}
                  onValueChange={(v) => setImportTier((v ?? "PHP") as PlanTier)}
                >
                  <SelectTrigger id="import-tier">
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

              <p className="text-xs text-muted-foreground">
                You can edit features and other details from the Plans tab after import.
              </p>
            </DialogPanel>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportTarget(null)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!importName.trim() || isImporting}>
              {isImporting ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </Card>
  );
}

function PlansTable({
  plans,
  isLoading,
  onEdit,
  onToggleActive,
}: {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  onEdit: (plan: SubscriptionPlan) => void;
  onToggleActive: (plan: SubscriptionPlan) => void;
}) {
  if (isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (plans.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyTitle>No plans yet</EmptyTitle>
        <EmptyDescription>Click "New Plan" to create your first subscription tier.</EmptyDescription>
      </Empty>
    );
  }
  return (
    <Frame>
      <FramePanel className="overflow-hidden p-0">
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">
                  <div>{plan.name}</div>
                  <div className="text-xs text-muted-foreground">{plan.displayPrice}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{plan.tier}</Badge>
                </TableCell>
                <TableCell className="space-y-0.5 text-sm tabular-nums">
                  {plan.monthlyPrice ? <div>{plan.monthlyPrice}/mo</div> : null}
                  {plan.yearlyPrice ? <div>{plan.yearlyPrice}/yr</div> : null}
                  {plan.oneTimePrice ? <div>{plan.oneTimePrice} once</div> : null}
                  {!plan.monthlyPrice && !plan.yearlyPrice && !plan.oneTimePrice ? (
                    <span className="text-muted-foreground">—</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-xs">
                  {plan.discountType ? (
                    <span>
                      {plan.discountType} · {plan.discountAppliesTo ?? "all"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={plan.isActive ? "success" : "secondary"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(plan)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onToggleActive(plan)}>
                      {plan.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FramePanel>
    </Frame>
  );
}

function StripePricesTable({
  rows,
  isLoading,
  onImport,
}: {
  rows: PriceRow[];
  isLoading: boolean;
  onImport: (row: PriceRow) => void;
}) {
  if (isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading from Stripe…</div>;
  if (rows.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyTitle>No Stripe prices found</EmptyTitle>
        <EmptyDescription>Make sure Stripe is configured. Plans created here will appear automatically.</EmptyDescription>
      </Empty>
    );
  }
  return (
    <Frame>
      <FramePanel className="overflow-hidden p-0">
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Lookup Key</TableHead>
              <TableHead>Linked Plan</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.stripePriceId}>
                <TableCell className="font-medium">{row.productName}</TableCell>
                <TableCell className="tabular-nums">
                  {formatStripePrice(row.unitAmount, row.currency, row.interval, row.intervalCount)}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{row.lookupKey ?? "—"}</TableCell>
                <TableCell>
                  {row.dbPlanName ? (
                    <span>
                      {row.dbPlanName}{" "}
                      <Badge variant={row.dbPlanActive ? "success" : "secondary"} className="ml-1">
                        {row.dbPlanTier}
                      </Badge>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unlinked</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!row.dbPlanId ? (
                    <Button variant="outline" size="sm" onClick={() => onImport(row)}>
                      Import as Plan
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FramePanel>
    </Frame>
  );
}

function PlanEditorDialog({
  form,
  onChange,
  onSave,
  onCancel,
  isSaving,
  actionError,
  allFeatures,
}: {
  form: PlanFormState | null;
  onChange: (f: PlanFormState | null) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  actionError: string | null;
  allFeatures: string[];
}) {
  const isEditing = form?.id != null;
  const update = (patch: Partial<PlanFormState>) => onChange(form ? { ...form, ...patch } : form);

  const discountTypeItems = useMemo(
    () => [
      { label: "No discount", value: "none" as DiscountType },
      { label: "Percent off", value: "percent" as DiscountType },
      { label: "Fixed amount", value: "amount" as DiscountType },
    ],
    [],
  );

  const discountAppliesItems = useMemo(
    () => [
      { label: "All intervals", value: "all" as DiscountAppliesTo },
      { label: "Monthly only", value: "monthly" as DiscountAppliesTo },
      { label: "Yearly only", value: "yearly" as DiscountAppliesTo },
      { label: "One-time only", value: "one_time" as DiscountAppliesTo },
      { label: "Custom per interval", value: "custom" as DiscountAppliesTo },
    ],
    [],
  );

  return (
    <Dialog open={form !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Plan" : "New Plan"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Editing prices will create new Stripe prices and archive old ones. Existing subscribers keep their current price."
              : "Stripe products and prices are created automatically when you save."}
          </DialogDescription>
        </DialogHeader>

        {form ? (
          <DialogPanel className="space-y-5">
            {actionError ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive-foreground">
                {actionError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Name</Label>
                <Input
                  id="plan-name"
                  value={form.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="e.g. PHP Premium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-tier">Tier</Label>
                <Select
                  items={TIER_ITEMS}
                  value={form.tier}
                  onValueChange={(v) => update({ tier: (v ?? "PHP") as PlanTier })}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-display">Display price label</Label>
              <Input
                id="plan-display"
                value={form.displayPrice}
                onChange={(e) => update({ displayPrice: e.target.value })}
                placeholder="Auto-generated if blank"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="text-sm font-medium">Billing options</div>

              <BillingRow
                label="Monthly (recurring)"
                enabled={form.monthlyEnabled}
                price={form.monthlyPrice}
                onToggle={(v) => update({ monthlyEnabled: v })}
                onPriceChange={(v) => update({ monthlyPrice: v })}
                placeholder="£19.99"
              />
              <BillingRow
                label="6 months (one-time)"
                enabled={form.oneTimeEnabled}
                price={form.oneTimeAuto ? deriveMultipliedPrice(form.monthlyPrice, 6) : form.oneTimePrice}
                onToggle={(v) => update({ oneTimeEnabled: v })}
                onPriceChange={(v) => update({ oneTimePrice: v })}
                placeholder="£119.94"
                autoEnabled={form.oneTimeAuto}
                onAutoToggle={(v) => update({ oneTimeAuto: v })}
                autoHint={`Auto: monthly × 6${form.monthlyPrice.trim() ? ` = ${deriveMultipliedPrice(form.monthlyPrice, 6)}` : ""}`}
              />
              <BillingRow
                label="1 year (one-time)"
                enabled={form.yearlyEnabled}
                price={form.yearlyAuto ? deriveMultipliedPrice(form.monthlyPrice, 12) : form.yearlyPrice}
                onToggle={(v) => update({ yearlyEnabled: v })}
                onPriceChange={(v) => update({ yearlyPrice: v })}
                placeholder="£199"
                autoEnabled={form.yearlyAuto}
                onAutoToggle={(v) => update({ yearlyAuto: v })}
                autoHint={`Auto: monthly × 12${form.monthlyPrice.trim() ? ` = ${deriveMultipliedPrice(form.monthlyPrice, 12)}` : ""}`}
              />
            </div>

            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="text-sm font-medium">Discount (optional)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount-type">Type</Label>
                  <Select
                    items={discountTypeItems}
                    value={form.discountType}
                    onValueChange={(v) => update({ discountType: (v ?? "none") as DiscountType })}
                  >
                    <SelectTrigger id="discount-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {discountTypeItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>

                {form.discountType !== "none" ? (
                  <div className="space-y-2">
                    <Label htmlFor="discount-applies">Applies to</Label>
                    <Select
                      items={discountAppliesItems}
                      value={form.discountAppliesTo}
                      onValueChange={(v) => update({ discountAppliesTo: (v ?? "all") as DiscountAppliesTo })}
                    >
                      <SelectTrigger id="discount-applies">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {discountAppliesItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                ) : null}
              </div>

              {form.discountType !== "none" && form.discountAppliesTo !== "custom" ? (
                <div className="space-y-2">
                  <Label htmlFor="discount-value">
                    Value {form.discountType === "percent" ? "(%)" : "(amount, e.g. £15)"}
                  </Label>
                  <Input
                    id="discount-value"
                    value={form.discountValue}
                    onChange={(e) => update({ discountValue: e.target.value })}
                    placeholder={form.discountType === "percent" ? "10" : "£15"}
                  />
                </div>
              ) : null}

              {form.discountType !== "none" && form.discountAppliesTo === "custom" ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="discount-monthly">Monthly</Label>
                    <Input
                      id="discount-monthly"
                      value={form.discountValueMonthly}
                      onChange={(e) => update({ discountValueMonthly: e.target.value })}
                      placeholder={form.discountType === "percent" ? "10" : "£5"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount-yearly">Yearly</Label>
                    <Input
                      id="discount-yearly"
                      value={form.discountValueYearly}
                      onChange={(e) => update({ discountValueYearly: e.target.value })}
                      placeholder={form.discountType === "percent" ? "20" : "£40"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount-onetime">One-time</Label>
                    <Input
                      id="discount-onetime"
                      value={form.discountValueOneTime}
                      onChange={(e) => update({ discountValueOneTime: e.target.value })}
                      placeholder={form.discountType === "percent" ? "15" : "£75"}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <FeaturesEditor
              features={form.features}
              allFeatures={allFeatures}
              onChange={(features) => update({ features })}
            />

            {form.id != null ? (
              <InviteUsersSection planId={form.id} />
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                💡 Save this plan first, then reopen it to invite users.
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="plan-active"
                checked={form.isActive}
                onCheckedChange={(v) => update({ isActive: Boolean(v) })}
              />
              <Label htmlFor="plan-active">Active</Label>
            </div>
          </DialogPanel>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave} disabled={!form?.name.trim() || isSaving}>
            {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create plan"}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function FeaturesEditor({
  features,
  allFeatures,
  onChange,
}: {
  features: string[];
  allFeatures: string[];
  onChange: (next: string[]) => void;
}) {
  const selected = useMemo(() => new Set(features.map((f) => f.trim())), [features]);

  // Anything in `allFeatures` that isn't in the curated catalog → render under "Custom".
  const catalogSet = useMemo(() => new Set(FEATURE_CATALOG.flatMap((g) => g.features)), []);
  const customOptions = useMemo(() => {
    const out = new Set<string>();
    for (const f of allFeatures) {
      const v = f.trim();
      if (v && !catalogSet.has(v)) out.add(v);
    }
    for (const f of features) {
      const v = f.trim();
      if (v && !catalogSet.has(v)) out.add(v);
    }
    return Array.from(out).sort((a, b) => a.localeCompare(b));
  }, [allFeatures, features, catalogSet]);

  const toggle = (feature: string, checked: boolean) => {
    if (checked) {
      if (!selected.has(feature)) onChange([...features, feature]);
    } else {
      onChange(features.filter((f) => f !== feature));
    }
  };

  const renderGroup = (label: string, feats: string[]) => (
    <div key={label} className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-[1.3px] text-muted-foreground">
        {label}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {feats.map((feature) => {
          const id = `feat-${label}-${feature.replace(/\s+/g, "-")}`;
          const checked = selected.has(feature);
          return (
            <div key={feature} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(v) => toggle(feature, Boolean(v))}
              />
              <Label htmlFor={id} className="text-sm font-normal">
                {feature}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );

  const selectedCount = features.length;

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">What's included</div>
          <p className="text-xs text-muted-foreground">
            Tick the features this plan includes. They appear as the bullet list during onboarding.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">{selectedCount} selected</div>
      </div>

      <div className="space-y-4">
        {FEATURE_CATALOG.map((group) => renderGroup(group.group, group.features))}
        {customOptions.length > 0 ? renderGroup("Custom", customOptions) : null}
      </div>
    </div>
  );
}

function InviteUsersSection({ planId }: { planId: number }) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [recent, setRecent] = useState<Array<{ email: string; status: "sent" | "error"; message?: string }>>([]);

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/backend/admin/subscription-plans/${planId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to send invite.");
      }
      setRecent((prev) => [{ email: trimmed, status: "sent" as const }, ...prev].slice(0, 5));
      setEmail("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send invite.";
      setRecent((prev) => [{ email: trimmed, status: "error" as const, message }, ...prev].slice(0, 5));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div>
        <div className="text-sm font-medium">Invite users (optional)</div>
        <p className="text-xs text-muted-foreground">
          Email an invite link. The recipient completes a short onboarding form on a public page and pays in one flow — no account setup needed first.
        </p>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="user@example.com"
          />
        </div>
        <Button onClick={handleSend} disabled={!email.trim() || isSending}>
          {isSending ? "Sending…" : "Send invite"}
        </Button>
      </div>

      {recent.length > 0 ? (
        <div className="space-y-1.5 pt-2 border-t border-border/40">
          {recent.map((r, idx) => (
            <div
              key={`${r.email}-${idx}`}
              className={`text-xs ${r.status === "sent" ? "text-success" : "text-destructive"}`}
            >
              {r.status === "sent" ? "✓" : "✗"} {r.email}
              {r.message ? <span className="text-muted-foreground"> — {r.message}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BillingRow({
  label,
  enabled,
  price,
  onToggle,
  onPriceChange,
  placeholder,
  autoEnabled,
  onAutoToggle,
  autoHint,
}: {
  label: string;
  enabled: boolean;
  price: string;
  onToggle: (v: boolean) => void;
  onPriceChange: (v: string) => void;
  placeholder: string;
  autoEnabled?: boolean;
  onAutoToggle?: (v: boolean) => void;
  autoHint?: string;
}) {
  const supportsAuto = typeof onAutoToggle === "function";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 w-32">
          <Checkbox
            id={`bill-${label}`}
            checked={enabled}
            onCheckedChange={(v) => onToggle(Boolean(v))}
          />
          <Label htmlFor={`bill-${label}`}>{label}</Label>
        </div>
        <Input
          value={price}
          disabled={!enabled || autoEnabled}
          onChange={(e) => onPriceChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        {supportsAuto ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <Checkbox
              id={`auto-${label}`}
              checked={Boolean(autoEnabled)}
              disabled={!enabled}
              onCheckedChange={(v) => onAutoToggle!(Boolean(v))}
            />
            <Label htmlFor={`auto-${label}`} className="text-xs font-normal">
              Auto
            </Label>
          </div>
        ) : null}
      </div>
      {supportsAuto && autoEnabled && autoHint ? (
        <div className="text-xs text-muted-foreground pl-32 ml-3">{autoHint}</div>
      ) : null}
    </div>
  );
}
