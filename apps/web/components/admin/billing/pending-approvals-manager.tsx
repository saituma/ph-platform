"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardPanel } from "../../ui/card";
import { Empty, EmptyTitle, EmptyDescription } from "../../ui/empty";
import { Frame, FramePanel } from "../../ui/frame";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Tabs, TabsList, TabsTab, TabsPanel } from "../../ui/tabs";
import { getCsrfToken } from "./billing-admin-utils";

type ApprovalRequest = {
  requestId: number;
  userName?: string | null;
  userEmail?: string | null;
  planName?: string | null;
  displayPrice?: string | null;
  billingInterval?: string | null;
  status?: string | null;
};

type TeamApprovalRequest = {
  requestId: number;
  status?: string | null;
  paymentStatus?: string | null;
  planBillingCycle?: string | null;
  adminName?: string | null;
  adminEmail?: string | null;
  teamName?: string | null;
  maxAthletes?: number | null;
  planName?: string | null;
  planTier?: string | null;
  planDisplayPrice?: string | null;
  planBillingInterval?: string | null;
  paymentAmountCents?: number | null;
  paymentCurrency?: string | null;
};

type ApiErrorLike = {
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const e = error as ApiErrorLike;
    if (typeof e.message === "string") return e.message;
  }
  return fallback;
}

function formatMoneyFromCents(
  amountCents: number | null | undefined,
  currency: string | null | undefined
) {
  if (amountCents == null) return null;
  const cur = (currency || "gbp").toUpperCase();
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur }).format(
      amountCents / 100
    );
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${cur}`;
  }
}

function statusBadgeVariant(status: string | null | undefined) {
  switch (status?.toLowerCase()) {
    case "approved":
      return "success" as const;
    case "rejected":
    case "declined":
      return "error" as const;
    case "pending":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

export function PendingApprovalsManager() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [teamRequests, setTeamRequests] = useState<TeamApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approvalSearch, setApprovalSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"guardians" | "teams">("guardians");

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [requestsRes, teamRequestsRes] = await Promise.all([
        fetch("/api/backend/admin/subscription-requests").then((res) => res.json()),
        fetch("/api/backend/admin/team-subscription-requests").then((res) => res.json()),
      ]);
      setRequests(Array.isArray(requestsRes?.requests) ? requestsRes.requests : []);
      setTeamRequests(
        Array.isArray(teamRequestsRes?.requests) ? teamRequestsRes.requests : []
      );
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to load approval requests."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleApprove = async (requestId: number) => {
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(
        `/api/backend/admin/subscription-requests/${requestId}/approve`,
        {
          method: "POST",
          headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
        }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to approve request.");
      }
      await loadRequests();
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to approve request."));
    }
  };

  const handleReject = async (requestId: number) => {
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(
        `/api/backend/admin/subscription-requests/${requestId}/reject`,
        {
          method: "POST",
          headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
        }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to reject request.");
      }
      await loadRequests();
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to reject request."));
    }
  };

  const handleSyncPayment = async (requestId: number) => {
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(
        `/api/backend/admin/subscription-requests/${requestId}/sync-payment`,
        {
          method: "POST",
          headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
        }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to sync payment.");
      }
      await loadRequests();
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to sync payment."));
    }
  };

  const handleApproveTeam = async (requestId: number) => {
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(
        `/api/backend/admin/team-subscription-requests/${requestId}/approve`,
        {
          method: "POST",
          headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
        }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to approve team request.");
      }
      await loadRequests();
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to approve team request."));
    }
  };

  const handleRejectTeam = async (requestId: number) => {
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(
        `/api/backend/admin/team-subscription-requests/${requestId}/reject`,
        {
          method: "POST",
          headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
        }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to reject team request.");
      }
      await loadRequests();
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to reject team request."));
    }
  };

  const handleSyncTeamPayment = async (requestId: number) => {
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(
        `/api/backend/admin/team-subscription-requests/${requestId}/sync-payment`,
        {
          method: "POST",
          headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
        }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to sync payment.");
      }
      await loadRequests();
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to sync team payment."));
    }
  };

  const filteredRequests = useMemo(() => {
    // Dedupe by (userId, planId): when the same user has multiple checkout attempts for the
    // same plan, keep the most advanced one (approved > pending_approval > pending_payment > rejected).
    const rank: Record<string, number> = {
      approved: 4,
      pending_approval: 3,
      pending_payment: 2,
      rejected: 1,
    };
    const score = (s: string | null | undefined) => rank[String(s ?? "").toLowerCase()] ?? 0;
    const best = new Map<string, (typeof requests)[number]>();
    for (const r of requests) {
      const key = `${(r as any).userId ?? "?"}::${(r as any).planId ?? "?"}`;
      const cur = best.get(key);
      if (!cur || score(r.status) > score(cur.status)) best.set(key, r);
    }
    const deduped = Array.from(best.values());
    return deduped.filter((request) =>
      String(request?.userName ?? "")
        .toLowerCase()
        .includes(approvalSearch.trim().toLowerCase()),
    );
  }, [approvalSearch, requests]);

  const filteredTeamRequests = useMemo(() => {
    const query = teamSearch.trim().toLowerCase();
    const matches = (r: TeamApprovalRequest) => {
      const hay = `${r.teamName ?? ""} ${r.adminName ?? ""} ${r.adminEmail ?? ""}`.toLowerCase();
      return query ? hay.includes(query) : true;
    };
    return teamRequests.filter(matches);
  }, [teamRequests, teamSearch]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
        <CardDescription>
          Review subscription change requests and approve the right plan access.
        </CardDescription>
        <CardAction>
          <Button variant="outline" onClick={loadRequests}>
            Refresh
          </Button>
        </CardAction>
      </CardHeader>

      <CardPanel className="space-y-6">
        {actionError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive-foreground">
            {actionError}
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "guardians" | "teams")}>
          <TabsList>
            <TabsTab value="guardians">
              Guardians{" "}
              <Badge variant="secondary" size="sm">
                {requests.length}
              </Badge>
            </TabsTab>
            <TabsTab value="teams">
              Teams{" "}
              <Badge variant="secondary" size="sm">
                {teamRequests.length}
              </Badge>
            </TabsTab>
          </TabsList>

          <TabsPanel value="guardians" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="guardian-approval-search">Search guardian</Label>
              <Input
                id="guardian-approval-search"
                value={approvalSearch}
                onChange={(event) => setApprovalSearch(event.target.value)}
                placeholder="Search by guardian name"
                className="max-w-sm"
              />
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading requests...
              </div>
            ) : filteredRequests.length === 0 ? (
              <Empty className="py-10">
                <EmptyTitle>No approvals</EmptyTitle>
                <EmptyDescription>
                  {approvalSearch.trim()
                    ? "No approvals match that guardian name."
                    : "No requests awaiting approval."}
                </EmptyDescription>
              </Empty>
            ) : (
              <Frame>
                <FramePanel className="p-0 overflow-hidden">
                  <Table variant="card">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guardian</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow key={request.requestId}>
                          <TableCell>
                            <div className="font-medium">{request.userName}</div>
                            <div className="text-xs text-muted-foreground">
                              {request.userEmail}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{request.planName}</div>
                            <div className="text-xs text-muted-foreground">
                              {request.displayPrice} • {request.billingInterval}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(request.status)}>
                              {request.status ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {request.status === "approved" ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled
                                  className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400"
                                >
                                  ✓ Approved
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(request.requestId)}
                                >
                                  Approve
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSyncPayment(request.requestId)}
                              >
                                Sync
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(request.requestId)}
                                disabled={request.status === "approved"}
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </FramePanel>
              </Frame>
            )}
          </TabsPanel>

          <TabsPanel value="teams" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="team-approval-search">Search team</Label>
              <Input
                id="team-approval-search"
                value={teamSearch}
                onChange={(event) => setTeamSearch(event.target.value)}
                placeholder="Search by team or admin"
                className="max-w-sm"
              />
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading requests...
              </div>
            ) : filteredTeamRequests.length === 0 ? (
              <Empty className="py-10">
                <EmptyTitle>No team approvals</EmptyTitle>
                <EmptyDescription>
                  {teamSearch.trim()
                    ? "No team approvals match that search."
                    : "No team requests found."}
                </EmptyDescription>
              </Empty>
            ) : (
              <Frame>
                <FramePanel className="p-0 overflow-hidden">
                  <Table variant="card">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeamRequests.map((request) => {
                        const amount =
                          formatMoneyFromCents(
                            request.paymentAmountCents,
                            request.paymentCurrency
                          ) ??
                          request.planDisplayPrice ??
                          null;
                        const interval =
                          String(
                            request.planBillingCycle ?? request.planBillingInterval ?? ""
                          )
                            .replace(/_/g, " ")
                            .trim() || null;
                        const status = request.status ?? request.paymentStatus ?? null;
                        return (
                          <TableRow key={`team-${request.requestId}`}>
                            <TableCell>
                              <div className="font-medium">
                                {request.teamName ?? "—"}{" "}
                                {request.maxAthletes ? (
                                  <span className="text-xs text-muted-foreground">
                                    ({request.maxAthletes} athletes)
                                  </span>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{request.adminName ?? "—"}</div>
                              <div className="text-xs text-muted-foreground">
                                {request.adminEmail ?? ""}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {request.planName ?? request.planTier ?? "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {amount ? amount : "—"}
                                {interval ? ` • ${interval}` : ""}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusBadgeVariant(status)}>
                                {status ?? "—"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {status === "approved" ? (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled
                                    className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400"
                                  >
                                    ✓ Approved
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveTeam(request.requestId)}
                                  >
                                    Approve
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleSyncTeamPayment(request.requestId)}
                                >
                                  Sync
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectTeam(request.requestId)}
                                  disabled={status === "approved"}
                                >
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </FramePanel>
              </Frame>
            )}
          </TabsPanel>
        </Tabs>
      </CardPanel>
    </Card>
  );
}
