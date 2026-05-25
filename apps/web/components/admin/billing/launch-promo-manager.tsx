"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Download, Percent, Plus, Trash2, Users } from "lucide-react";

import { getCsrfToken } from "./billing-admin-utils";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { Empty, EmptyTitle, EmptyDescription } from "../../ui/empty";
import { Frame, FramePanel } from "../../ui/frame";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Skeleton } from "../../ui/skeleton";
import { Spinner } from "../../ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Textarea } from "../../ui/textarea";

type Campaign = {
  id: number;
  name: string;
  discountPercent: number;
  expiresAt: string | null;
  createdAt: string;
  totalCodes: number;
  redeemedCount: number;
};

type PromoCode = {
  id: number;
  email: string;
  code: string;
  redeemedAt: string | null;
  createdAt: string;
};

export function LaunchPromoManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignCodes, setCampaignCodes] = useState<PromoCode[]>([]);
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({ name: "", discountPercent: "20", emails: "" });

  const nextBillingDate = (() => {
    const now = new Date();
    const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 5));
    if (anchor <= now) anchor.setUTCMonth(anchor.getUTCMonth() + 1);
    return anchor.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  })();
  const [formError, setFormError] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/backend/admin/launch-promo/campaigns", {
        headers: { "x-csrf-token": getCsrfToken() },
      });
      const data = await res.json();
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
    } catch {
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const loadCodes = useCallback(async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsLoadingCodes(true);
    try {
      const res = await fetch(`/api/backend/admin/launch-promo/campaigns/${campaign.id}/codes`, {
        headers: { "x-csrf-token": getCsrfToken() },
      });
      const data = await res.json();
      setCampaignCodes(Array.isArray(data.codes) ? data.codes : []);
    } catch {
      setCampaignCodes([]);
    } finally {
      setIsLoadingCodes(false);
    }
  }, []);

  const handleCreate = async () => {
    setFormError(null);
    const percent = parseInt(form.discountPercent, 10);
    if (!form.name.trim()) { setFormError("Campaign name is required"); return; }
    if (isNaN(percent) || percent < 1 || percent > 100) { setFormError("Discount must be between 1–100%"); return; }

    const emails = form.emails
      .split(/[\n,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) { setFormError("Enter at least one valid email address"); return; }
    if (emails.length > 500) { setFormError("Maximum 500 emails per campaign"); return; }

    setIsCreating(true);
    try {
      const res = await fetch("/api/backend/admin/launch-promo/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
        body: JSON.stringify({
          name: form.name.trim(),
          discountPercent: percent,
          emails,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to create campaign"); return; }

      setShowCreateDialog(false);
      setForm({ name: "", discountPercent: "20", emails: "" });
      await loadCampaigns();
    } catch {
      setFormError("Network error — please try again");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/backend/admin/launch-promo/campaigns/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "x-csrf-token": getCsrfToken() },
      });
      setDeleteTarget(null);
      if (selectedCampaign?.id === deleteTarget.id) { setSelectedCampaign(null); setCampaignCodes([]); }
      await loadCampaigns();
    } finally {
      setIsDeleting(false);
    }
  };

  const copyAllCodes = () => {
    const text = campaignCodes.map((c) => `${c.email}\t${c.code}`).join("\n");
    void navigator.clipboard.writeText(text);
  };

  const downloadCsv = () => {
    const rows = ["Email,Code,Redeemed"];
    campaignCodes.forEach((c) => {
      rows.push(`${c.email},${c.code},${c.redeemedAt ? "Yes" : "No"}`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedCampaign?.name ?? "promo-codes"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Each athlete gets a unique one-time code. They enter it at Stripe checkout to get their discount.
        </p>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Campaign list */}
        <Frame>
          <FramePanel className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : campaigns.length === 0 ? (
              <Empty className="py-12">
                <EmptyTitle>No campaigns yet</EmptyTitle>
                <EmptyDescription>Create your first launch discount campaign to get started.</EmptyDescription>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Codes</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer ${selectedCampaign?.id === c.id ? "bg-muted" : ""}`}
                      onClick={() => void loadCodes(c)}
                    >
                      <TableCell>
                        <div className="font-medium text-sm">{c.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString()}
                          {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString()}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.discountPercent}% off</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{c.redeemedCount}/{c.totalCodes}</span>
                        <span className="text-xs text-muted-foreground ml-1">used</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </FramePanel>
        </Frame>

        {/* Codes table */}
        <Frame>
          <FramePanel className="p-0">
            {!selectedCampaign ? (
              <Empty className="py-12">
                <EmptyTitle>Select a campaign</EmptyTitle>
                <EmptyDescription>Click a campaign on the left to view its promo codes.</EmptyDescription>
              </Empty>
            ) : isLoadingCodes ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div>
                    <p className="text-sm font-medium">{selectedCampaign.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {campaignCodes.length} codes · {selectedCampaign.discountPercent}% off
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyAllCodes}>
                      <Copy className="h-3.5 w-3.5" />
                      Copy all
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadCsv}>
                      <Download className="h-3.5 w-3.5" />
                      CSV
                    </Button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaignCodes.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm">{c.email}</TableCell>
                          <TableCell>
                            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{c.code}</code>
                          </TableCell>
                          <TableCell>
                            {c.redeemedAt ? (
                              <Badge variant="secondary">Used</Badge>
                            ) : (
                              <Badge variant="outline">Unused</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </FramePanel>
        </Frame>
      </div>

      {/* Create campaign dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogPopup className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Launch Campaign</DialogTitle>
            <DialogDescription>
              Generate a unique one-time promo code for each email address.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-name">Campaign name</Label>
              <Input
                id="campaign-name"
                placeholder="e.g. Launch 2026 — Founding Members"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discount-pct">Discount percentage</Label>
              <div className="relative">
                <Input
                  id="discount-pct"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="20"
                  value={form.discountPercent}
                  onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
                  className="pr-8"
                />
                <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
              Codes automatically expire on <strong>{nextBillingDate}</strong> — the next billing date. Any unused codes after that date will be void.
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emails">
                Email addresses
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">(one per line or comma-separated, max 500)</span>
              </Label>
              <Textarea
                id="emails"
                placeholder={"john@example.com\njane@example.com\n..."}
                rows={6}
                value={form.emails}
                onChange={(e) => setForm((f) => ({ ...f, emails: e.target.value }))}
                className="font-mono text-xs"
              />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {form.emails.split(/[\n,]+/).filter((e) => e.trim().includes("@")).length} valid emails detected
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </DialogPanel>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => void handleCreate()} disabled={isCreating}>
              {isCreating ? <><Spinner className="h-4 w-4" /> Generating codes…</> : "Generate codes"}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogPopup className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete campaign?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and invalidate all{" "}
              {deleteTarget?.totalCodes} promo codes in Stripe. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
              {isDeleting ? <><Spinner className="h-4 w-4" /> Deleting…</> : "Delete campaign"}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
