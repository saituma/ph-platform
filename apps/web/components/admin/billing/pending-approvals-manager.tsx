"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
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

export function PendingApprovalsManager() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approvalSearch, setApprovalSearch] = useState("");

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const requestsRes = await fetch("/api/backend/admin/subscription-requests").then((res) => res.json());
      setRequests(Array.isArray(requestsRes?.requests) ? requestsRes.requests : []);
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
      const res = await fetch(`/api/backend/admin/subscription-requests/${requestId}/approve`, {
        method: "POST",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
      });
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
      const res = await fetch(`/api/backend/admin/subscription-requests/${requestId}/reject`, {
        method: "POST",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
      });
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
      const res = await fetch(`/api/backend/admin/subscription-requests/${requestId}/sync-payment`, {
        method: "POST",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to sync payment.");
      }
      await loadRequests();
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to sync payment."));
    }
  };

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) =>
        String(request?.userName ?? "")
          .toLowerCase()
          .includes(approvalSearch.trim().toLowerCase())
      ),
    [approvalSearch, requests]
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            Review guardian subscription change requests and approve the right plan access.
          </CardDescription>
        </div>
        <Button variant="outline" onClick={loadRequests}>
          Refresh approvals
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {actionError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {actionError}
          </div>
        ) : null}

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
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSyncPayment(request.requestId)}
                      >
                        Sync
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
  );
}
