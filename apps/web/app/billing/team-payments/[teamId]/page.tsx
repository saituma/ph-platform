"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, Users } from "lucide-react";

import { AdminShell } from "../../../../components/admin/shell";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import { getCsrfToken } from "../../../../components/admin/billing/billing-admin-utils";

type TeamRequest = {
  requestId: number;
  teamId: number;
  teamName: string;
  status?: string | null;
  paymentStatus?: string | null;
  allPaymentsComplete?: boolean | null;
  paymentMode?: "coach_pays_all" | "per_player_all" | "per_player_selected" | null;
  coachPaysSeats?: number | null;
  planBillingCycle?: string | null;
  planName?: string | null;
  paymentAmountCents?: number | null;
  paymentCurrency?: string | null;
  managerAmountCents?: number | null;
  playerAmountCents?: number | null;
  totalAmountCents?: number | null;
  paidAmountCents?: number | null;
  remainingAmountCents?: number | null;
  createdAt?: string | null;
};

type InviteItem = {
  id: number;
  playerName?: string | null;
  playerEmail: string;
  status?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  stripePaymentLinkUrl?: string | null;
  emailSentAt?: string | null;
  emailLastError?: string | null;
  updatedAt?: string | null;
};

function money(cents?: number | null, currency?: string | null) {
  if (cents == null) return "—";
  const cur = (currency || "gbp").toUpperCase();
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${cur}`;
  }
}

function modeBadge(status?: string | null) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") {
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approved</Badge>;
  }
  if (s === "rejected") {
    return <Badge variant="outline" className="text-rose-600 border-rose-500/20 bg-rose-500/10">Rejected</Badge>;
  }
  if (s === "pending_approval") {
    return <Badge variant="outline" className="text-blue-600 border-blue-500/20 bg-blue-500/10">Pending Approval</Badge>;
  }
  return <Badge variant="outline" className="text-amber-600 border-amber-500/20 bg-amber-500/10">Pending</Badge>;
}

export default function TeamPaymentStatusPage() {
  const params = useParams<{ teamId: string }>();
  const [teamId, setTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<number | null>(null);
  const [sponsoringInviteId, setSponsoringInviteId] = useState<number | null>(null);
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [invites, setInvites] = useState<InviteItem[]>([]);

  useEffect(() => {
    const raw = params?.teamId;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const id = Number(value);
    if (!Number.isFinite(id)) {
      setError("Invalid team id.");
      setLoading(false);
      return;
    }
    setTeamId(id);
  }, [params]);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backend/admin/team-subscription-requests");
      const data = await res.json();
      const all = Array.isArray(data?.requests) ? (data.requests as TeamRequest[]) : [];
      const mine = all.filter((r) => Number(r.teamId) === teamId);
      setRequests(mine);
      if (mine[0]?.requestId) {
        const invRes = await fetch(
          `/api/backend/admin/team-subscription-requests/${mine[0].requestId}/invites`,
        );
        const invData = await invRes.json();
        setInvites(Array.isArray(invData?.invites) ? (invData.invites as InviteItem[]) : []);
      } else {
        setInvites([]);
      }
    } catch {
      setError("Failed to load team payment status.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const latest = requests[0] ?? null;
  const paidCount = useMemo(
    () => invites.filter((i) => String(i.status || "").toLowerCase() === "paid").length,
    [invites],
  );
  const managerPayment = useMemo(() => {
    if (!latest) return { label: "—", variant: "outline" as const };
    const mode = latest.paymentMode ?? "coach_pays_all";
    const coachNeedsPayment =
      mode === "coach_pays_all" || (mode === "per_player_selected" && Number(latest.coachPaysSeats ?? 0) > 0);
    if (!coachNeedsPayment) {
      return { label: "Not required", variant: "outline" as const };
    }
    const isPaid = ["paid", "no_payment_required"].includes(String(latest.paymentStatus ?? "").toLowerCase());
    if (isPaid) {
      return { label: "Paid", variant: "success" as const };
    }
    return { label: "Unpaid", variant: "warning" as const };
  }, [latest]);
  const canApprove = useMemo(() => {
    if (!latest) return false;
    const s = String(latest.status ?? "").toLowerCase();
    return s !== "approved" && s !== "rejected";
  }, [latest]);

  async function handleApproveTeam() {
    if (!latest?.requestId) return;
    setApproveLoading(true);
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/backend/admin/team-subscription-requests/${latest.requestId}/approve`, {
        method: "POST",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to approve team request.");
      }
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to approve team request.";
      setActionError(message);
    } finally {
      setApproveLoading(false);
    }
  }

  async function handleResendInvite(inviteId: number) {
    if (!latest?.requestId) return;
    setResendingInviteId(inviteId);
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(
        `/api/backend/admin/team-subscription-requests/${latest.requestId}/invites/${inviteId}/resend`,
        {
          method: "POST",
          headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to resend invite email.");
      }
      if (Array.isArray(payload?.invites)) {
        setInvites(payload.invites as InviteItem[]);
      }
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to resend invite email.";
      setActionError(message);
    } finally {
      setResendingInviteId(null);
    }
  }

  async function handleSponsorInvite(inviteId: number) {
    if (!latest?.requestId) return;
    setSponsoringInviteId(inviteId);
    setActionError(null);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(
        `/api/backend/admin/team-subscription-requests/${latest.requestId}/invites/${inviteId}/sponsor`,
        {
          method: "POST",
          headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to sponsor player invite.");
      }
      if (Array.isArray(payload?.invites)) {
        setInvites(payload.invites as InviteItem[]);
      }
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to sponsor player invite.";
      setActionError(message);
    } finally {
      setSponsoringInviteId(null);
    }
  }

  return (
    <AdminShell
      title="Team Payment Status"
      subtitle="Track payment status for this team request and player invite payments."
      actions={
        <Button render={<Link href="/billing/team-payments" />} variant="outline">
          <ArrowLeft className="h-4 w-4" />
          Back to Team Payments
        </Button>
      }
    >
      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading status...</Card>
      ) : error ? (
        <Card className="p-6 text-sm text-destructive">{error}</Card>
      ) : !latest ? (
        <Card className="p-6 text-sm text-muted-foreground">No payment request found for this team.</Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Team</p>
              <p className="mt-1 font-medium">{latest.teamName}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Request Status</p>
              <div className="mt-2">{modeBadge(latest.status)}</div>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Payment Status</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {latest.paymentStatus || "pending"}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Team Total</p>
              <p className="mt-1 font-medium">
                {money(latest.totalAmountCents ?? latest.paymentAmountCents, latest.paymentCurrency)}
              </p>
            </Card>
          </div>

          <Card className="p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Manager Payment</p>
                <div className="mt-2">
                  <Badge variant={managerPayment.variant}>{managerPayment.label}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Manager Amount</p>
                <p className="mt-1 font-medium">{money(latest.managerAmountCents ?? latest.paymentAmountCents, latest.paymentCurrency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Players Amount</p>
                <p className="mt-1 font-medium">{money(latest.playerAmountCents, latest.paymentCurrency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Still To Pay</p>
                <p className="mt-1 font-medium">{money(latest.remainingAmountCents, latest.paymentCurrency)}</p>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-medium">Player Payment Invites</p>
                <p className="text-xs text-muted-foreground">
                  Paid: {paidCount} / {invites.length}
                </p>
              </div>
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Cycle: {latest.planBillingCycle || "monthly"}
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                      No player invites for this request.
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.playerName || "—"}</TableCell>
                      <TableCell>{invite.playerEmail}</TableCell>
                      <TableCell>{money(invite.amountCents, invite.currency || latest.paymentCurrency)}</TableCell>
                      <TableCell>
                        {String(invite.status || "").toLowerCase() === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                            <Clock3 className="h-3.5 w-3.5" /> {invite.status || "pending"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {invite.emailSentAt ? (
                          <span className="text-emerald-600">Sent</span>
                        ) : invite.emailLastError ? (
                          <span className="text-rose-600">Failed</span>
                        ) : (
                          <span className="text-muted-foreground">Not sent</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invite.updatedAt ? format(new Date(invite.updatedAt), "MMM d, yyyy HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {invite.stripePaymentLinkUrl ? (
                            <a
                              className="text-xs underline text-foreground"
                              href={invite.stripePaymentLinkUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {String(invite.status || "").toLowerCase() !== "paid" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResendInvite(invite.id)}
                                disabled={resendingInviteId === invite.id || sponsoringInviteId === invite.id}
                              >
                                {resendingInviteId === invite.id ? "Sending..." : "Send again"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSponsorInvite(invite.id)}
                                disabled={resendingInviteId === invite.id || sponsoringInviteId === invite.id}
                              >
                                {sponsoringInviteId === invite.id ? "Sponsoring..." : "Sponsor"}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          <Card className="p-4">
            {actionError ? (
              <p className="mb-3 text-sm text-destructive">{actionError}</p>
            ) : null}
            <div className="flex justify-end">
              <Button onClick={handleApproveTeam} disabled={!canApprove || approveLoading}>
                {approveLoading ? "Approving..." : "Approve Team"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
