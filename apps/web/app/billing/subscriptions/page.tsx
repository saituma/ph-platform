"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";

type CardInfo = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  funding: string;
};

type StripeSubRow = {
  subscriptionId: string;
  status: string;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  amountCents: number;
  currency: string;
  billingCycleAnchor: string;
  card: CardInfo | null;
  failureCode: string | null;
  failureDeclineCode: string | null;
  failureMessage: string | null;
  nextRetryAt: string | null;
  athleteId: number | null;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  active: { label: "Active", variant: "default", icon: CheckCircle2 },
  past_due: { label: "Past Due", variant: "destructive", icon: AlertCircle },
  canceled: { label: "Cancelled", variant: "secondary", icon: XCircle },
  unpaid: { label: "Unpaid", variant: "destructive", icon: XCircle },
  trialing: { label: "Trialing", variant: "outline", icon: Clock },
  incomplete: { label: "Incomplete", variant: "outline", icon: Clock },
  incomplete_expired: { label: "Expired", variant: "secondary", icon: XCircle },
  paused: { label: "Paused", variant: "secondary", icon: Clock },
};

const DECLINE_LABELS: Record<string, string> = {
  insufficient_funds: "Insufficient funds",
  card_declined: "Card declined",
  expired_card: "Card expired",
  incorrect_cvc: "Wrong CVC",
  lost_card: "Card reported lost",
  stolen_card: "Card reported stolen",
  do_not_honor: "Bank declined (do not honor)",
  fraudulent: "Flagged as fraudulent",
  generic_decline: "Generic decline",
  no_action_taken: "No action taken by bank",
  not_permitted: "Transaction not permitted",
  restricted_card: "Restricted card",
  revocation_of_authorization: "Authorization revoked",
  security_violation: "Security violation",
  service_not_allowed: "Service not allowed",
  transaction_not_allowed: "Transaction not allowed",
  try_again_later: "Try again later",
  withdrawal_count_limit_exceeded: "Withdrawal limit exceeded",
};

function cardBrandLogo(brand: string) {
  const map: Record<string, string> = {
    visa: "VISA",
    mastercard: "MC",
    amex: "AMEX",
    discover: "DISC",
    jcb: "JCB",
    unionpay: "UP",
    diners: "DC",
  };
  return map[brand.toLowerCase()] ?? brand.toUpperCase();
}

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function StripePaymentStatusPage() {
  const [rows, setRows] = useState<StripeSubRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "past_due" | "canceled">("all");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/backend/admin/stripe/payment-status").then((r) => r.json());
      setRows(Array.isArray(res?.subscriptions) ? res.subscriptions : []);
    } catch {
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  const counts = {
    all: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    past_due: rows.filter((r) => r.status === "past_due").length,
    canceled: rows.filter((r) => r.status === "canceled").length,
  };

  const totalMrr = rows
    .filter((r) => r.status === "active")
    .reduce((s, r) => s + r.amountCents, 0);

  return (
    <AdminShell
      title="Payment Status"
      subtitle="Live Stripe subscription status, card details, and failure reasons for all paying users."
    >
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-6 mb-6 p-4 rounded-xl border bg-secondary/30">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Active MRR</div>
          <div className="text-2xl font-bold">{formatAmount(totalMrr, "gbp")}</div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Active</div>
          <div className="text-2xl font-bold text-green-600">{counts.active}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Past Due</div>
          <div className="text-2xl font-bold text-red-600">{counts.past_due}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Cancelled</div>
          <div className="text-2xl font-bold text-muted-foreground">{counts.canceled}</div>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {(["all", "active", "past_due", "canceled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === f
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {f === "all" ? "All" : f === "past_due" ? "Past Due" : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Card</TableHead>
              <TableHead>Renews</TableHead>
              <TableHead>Failure</TableHead>
              <TableHead>Next Retry</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No subscriptions found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                const cfg = STATUS_CONFIG[row.status] ?? { label: row.status, variant: "outline" as const, icon: Clock };
                const Icon = cfg.icon;
                const declineLabel =
                  (row.failureDeclineCode && DECLINE_LABELS[row.failureDeclineCode]) ||
                  (row.failureCode && DECLINE_LABELS[row.failureCode]) ||
                  row.failureMessage ||
                  null;

                return (
                  <TableRow key={row.subscriptionId} className={row.status === "past_due" ? "bg-red-50/40 dark:bg-red-950/10" : ""}>
                    {/* Customer */}
                    <TableCell>
                      <div className="font-medium text-sm">{row.customerName || "—"}</div>
                      <div className="text-xs text-muted-foreground">{row.customerEmail}</div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={cfg.variant} className="gap-1 text-xs">
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="font-medium tabular-nums">
                      {formatAmount(row.amountCents, row.currency)}
                      <span className="text-xs text-muted-foreground">/mo</span>
                    </TableCell>

                    {/* Card */}
                    <TableCell>
                      {row.card ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-bold bg-secondary border">
                            {cardBrandLogo(row.card.brand)}
                          </span>
                          <div>
                            <div className="text-sm font-mono">····{row.card.last4}</div>
                            <div className={`text-xs ${
                              row.card.expYear < new Date().getFullYear() ||
                              (row.card.expYear === new Date().getFullYear() && row.card.expMonth < new Date().getMonth() + 1)
                                ? "text-red-600 font-medium"
                                : "text-muted-foreground"
                            }`}>
                              {row.card.expMonth.toString().padStart(2, "0")}/{row.card.expYear}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                          <CreditCard className="h-3 w-3" /> No card
                        </span>
                      )}
                    </TableCell>

                    {/* Renews */}
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(row.billingCycleAnchor)}
                    </TableCell>

                    {/* Failure reason */}
                    <TableCell>
                      {declineLabel ? (
                        <div>
                          <div className="text-sm text-red-600 font-medium">{declineLabel}</div>
                          {row.failureDeclineCode && (
                            <div className="text-xs text-muted-foreground font-mono">{row.failureDeclineCode}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Next retry */}
                    <TableCell className="text-sm">
                      {row.nextRetryAt ? (
                        <span className="text-amber-600 font-medium">
                          {formatDate(row.nextRetryAt)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}
