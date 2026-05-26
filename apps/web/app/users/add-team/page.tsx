"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Copy, Check, Eye, EyeOff } from "lucide-react";
import { isStrongPassword } from "@/lib/password-rules";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "../../../components/ui/select";

type AthleteProfile = {
  name: string;
  birthDate: string;
  guardianEmail: string;
};

type SubscriptionPlan = {
  tier: ProgramTier | null;
  monthlyPrice: string | null;
  yearlyPrice: string | null;
  displayPrice: string;
  isActive: boolean;
};

type ApiErrorLike = { message?: string };

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const e = error as ApiErrorLike;
    if (typeof e.message === "string") return e.message;
  }
  return fallback;
}

function getCsrfToken() {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith("csrfToken="))
      ?.split("=")[1] ?? ""
  );
}

function slugify(raw: string, maxLen = 48): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.slice(0, maxLen) || "";
}

function parsePriceToPence(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[^0-9.]/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

function formatMoneyFromPence(pence: number | null | undefined) {
  const normalized = Math.max(0, pence ?? 0);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(normalized / 100);
}

function generatePassword(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (const byte of arr) out += chars[byte % chars.length];
  return out;
}

const EMAIL_DOMAIN = "phplatform.com";

const ATHLETE_TYPE_ITEMS = [
  { label: "Youth Team (Parent Managed)", value: "youth" },
  { label: "Adult Team (Self Managed)", value: "adult" },
];

const PAYMENT_METHOD_ITEMS = [
  { label: "Stripe (Send Email)", value: "email_link" },
  { label: "Cash / Manual (Offline Payment)", value: "cash" },
];

const BILLING_CYCLE_ITEMS = [
  { label: "Monthly Recurring", value: "monthly" },
  { label: "6 Months Upfront", value: "6months" },
  { label: "Yearly Upfront (Best Value)", value: "yearly" },
];

type ProgramTier = "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro";

const TIER_ITEMS: { label: string; value: ProgramTier; description: string }[] = [
  { label: "PHP Program", value: "PHP", description: "Restricted app access" },
  { label: "PHP Premium", value: "PHP_Premium", description: "Full app access" },
  { label: "PHP Premium Plus", value: "PHP_Premium_Plus", description: "Premium access + semi-private sessions" },
  { label: "PHP Pro", value: "PHP_Pro", description: "Premium access + 1:1 sessions" },
];

export default function AddTeamPage() {
  const router = useRouter();

  // Team info
  const [teamName, setTeamName] = useState("");
  const [athleteType, setAthleteType] = useState<"youth" | "adult">("youth");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");

  // Email slug
  const [emailSlug, setEmailSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  // Manager credentials
  const [managerEmail, setManagerEmail] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);

  // Billing
  const [tier, setTier] = useState<ProgramTier>("PHP");
  const [maxAthletes, setMaxAthletes] = useState(10);
  const [paymentMethod, setPaymentMethod] = useState<"email_link" | "cash">("email_link");
  const [paymentMode, setPaymentMode] = useState<"coach_pays_all" | "per_player_all" | "per_player_selected">("coach_pays_all");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "6months" | "yearly">("monthly");

  // Sponsored players
  const [hasSponsoredPlayers, setHasSponsoredPlayers] = useState(false);
  const [sponsoredPlayerCount, setSponsoredPlayerCount] = useState(1);
  const [sponsoredTier, setSponsoredTier] = useState<ProgramTier>("PHP");

  // Athlete profiles
  const [athleteProfiles, setAthleteProfiles] = useState<AthleteProfile[]>([]);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [slotDraft, setSlotDraft] = useState<AthleteProfile>({ name: "", birthDate: "", guardianEmail: "" });
  const [selectedPayers, setSelectedPayers] = useState<Set<number>>(new Set());

  // Misc
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTierSet, setActiveTierSet] = useState<Set<ProgramTier>>(new Set());
  const [plansByTier, setPlansByTier] = useState<Partial<Record<ProgramTier, SubscriptionPlan>>>({});
  const [plansLoading, setPlansLoading] = useState(true);

  // Auto-derive slug from team name unless admin has manually edited it
  useEffect(() => {
    if (!slugEdited) setEmailSlug(slugify(teamName));
  }, [teamName, slugEdited]);

  // Sync athlete profile slots to maxAthletes
  useEffect(() => {
    setAthleteProfiles((prev) => {
      const blank = (): AthleteProfile => ({ name: "", birthDate: "", guardianEmail: "" });
      if (prev.length === maxAthletes) return prev;
      if (prev.length < maxAthletes) return [...prev, ...Array.from({ length: maxAthletes - prev.length }, blank)];
      return prev.slice(0, maxAthletes);
    });
  }, [maxAthletes]);

  useEffect(() => {
    let mounted = true;
    const loadPlans = async () => {
      try {
        const response = await fetch("/api/backend/admin/subscription-plans", {
          credentials: "include",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error ?? "Failed to load plans.");
        const plans = Array.isArray(payload?.plans) ? (payload.plans as SubscriptionPlan[]) : [];
        const active = plans
          .filter((p) => p?.isActive && typeof p?.tier === "string")
          .map((p) => p.tier as ProgramTier);
        const mapped: Partial<Record<ProgramTier, SubscriptionPlan>> = {};
        for (const plan of plans) {
          if (!plan?.tier || !plan?.isActive) continue;
          mapped[plan.tier] = plan;
        }
        if (mounted) {
          setActiveTierSet(new Set(active));
          setPlansByTier(mapped);
        }
      } catch {
        if (mounted) {
          setActiveTierSet(new Set());
          setPlansByTier({});
        }
      } finally {
        if (mounted) setPlansLoading(false);
      }
    };
    void loadPlans();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSlugChange = (val: string) => {
    setSlugEdited(true);
    setEmailSlug(slugify(val) || val.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const handleGenerate = useCallback(() => {
    const pwd = generatePassword();
    setManagerPassword(pwd);
    setShowPassword(true);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!managerPassword) return;
    await navigator.clipboard.writeText(managerPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [managerPassword]);

  const selectedTier = TIER_ITEMS.find((t) => t.value === tier);

  const emailPreview = emailSlug
    ? `{name}.${emailSlug}@${EMAIL_DOMAIN}`
    : `{name}.{team-slug}@${EMAIL_DOMAIN}`;

  const createTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const cleanName = teamName.trim();
    const cleanSlug = emailSlug.trim();
    const cleanEmail = managerEmail.trim();
    const cleanPassword = managerPassword.trim();

    if (!cleanName) return setError("Team name is required.");
    if (!cleanSlug) return setError("Athlete email slug is required.");
    if (!cleanEmail) return setError("Team manager email is required.");
    if (!cleanPassword || !isStrongPassword(cleanPassword)) return setError("Manager password must be 8+ characters with uppercase, lowercase, number, and special character.");
    if (!hasActivePlanForTier) return setError(`No active billing plan is configured for ${tier}. Activate one in Billing first.`);

    const filledProfiles = athleteProfiles.filter((p) => p.name.trim());
    const submitPayers = filledProfiles
      .map((p, i) => {
        const nameSlug = p.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const autoEmail = nameSlug && cleanSlug ? `${nameSlug}.${cleanSlug}@${EMAIL_DOMAIN}` : "";
        const pays = paymentMode === "per_player_all" || selectedPayers.has(i);
        return { name: p.name.trim(), email: (p.guardianEmail.trim() || autoEmail).toLowerCase(), selected: pays };
      })
      .filter((row) => row.email.includes("@") && row.selected);

    if (paymentMode !== "coach_pays_all" && submitPayers.length === 0) {
      return setError("Fill in at least one athlete profile with a name before creating the team.");
    }

    const coachPaysSeats = 0;

    setIsSubmitting(true);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch("/api/backend/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          teamName: cleanName,
          athleteType,
          emailSlug: cleanSlug,
          minAge: minAge ? parseInt(minAge, 10) : null,
          maxAge: maxAge ? parseInt(maxAge, 10) : null,
          managerEmail: cleanEmail,
          managerPassword: cleanPassword,
          managerName: managerName.trim() || undefined,
          tier,
          maxAthletes,
          paymentMethod,
          billingCycle,
          hasSponsoredPlayers,
          sponsoredPlayerCount: hasSponsoredPlayers ? sponsoredPlayerCount : 0,
          sponsoredTier: hasSponsoredPlayers ? sponsoredTier : undefined,
          paymentMode,
          coachPaysSeats: paymentMode === "per_player_selected" ? coachPaysSeats : 0,
          playerEmails: submitPayers.map((row) => row.email),
          playerPayers: submitPayers,
          athleteProfiles: athleteProfiles.map((p) => ({
            name: p.name.trim() || null,
            birthDate: p.birthDate || null,
            guardianEmail: p.guardianEmail.trim() || null,
          })),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Failed to create team.");

      if (payload?.checkoutUrl) { window.location.href = payload.checkoutUrl; return; }
      if (payload?.sentToEmail) { router.push("/teams?success=email_sent"); return; }
      router.push(`/teams/${encodeURIComponent(String(payload?.team ?? cleanName))}`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create team."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActivePlanForTier = activeTierSet.has(tier);
  const normalizedPayers = athleteProfiles
    .filter((p) => p.name.trim())
    .map((p) => {
      const nameSlug = p.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const autoEmail = nameSlug && emailSlug ? `${nameSlug}.${emailSlug}@${EMAIL_DOMAIN}` : "";
      return {
        name: p.name.trim(),
        email: (p.guardianEmail.trim() || autoEmail).toLowerCase(),
        selected: true,
      };
    })
    .filter((row) => row.email.includes("@"));
  const estimatedPlayerPayerCount =
    paymentMode === "coach_pays_all"
      ? maxAthletes
      : normalizedPayers.length;
  const selectedPlan = plansByTier[tier];
  const perSeatPence =
    billingCycle === "yearly"
      ? parsePriceToPence(selectedPlan?.yearlyPrice) ?? parsePriceToPence(selectedPlan?.monthlyPrice)
      : billingCycle === "6months"
        ? (() => {
            const monthly = parsePriceToPence(selectedPlan?.monthlyPrice);
            return monthly != null ? monthly * 6 : parsePriceToPence(selectedPlan?.displayPrice);
          })()
        : parsePriceToPence(selectedPlan?.monthlyPrice) ?? parsePriceToPence(selectedPlan?.displayPrice);
  const estimatedPayerTotalPence = (perSeatPence ?? 0) * Math.max(0, estimatedPlayerPayerCount);
  const estimatedTeamTotalPence = (perSeatPence ?? 0) * Math.max(0, maxAthletes);
  const canSubmit =
    teamName.trim() &&
    emailSlug.trim() &&
    managerEmail.trim() &&
    isStrongPassword(managerPassword.trim()) &&
    tier &&
    hasActivePlanForTier &&
    !isSubmitting;


  return (
    <AdminShell
      title="Add team"
      subtitle="Register a new team, set up the manager account and athlete email addresses."
      actions={
        <Button variant="outline" size="sm" render={<Link href="/users" />} className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Button>
      }
    >
      <form onSubmit={createTeam} className="mx-auto grid max-w-4xl gap-6 pb-20">
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {!plansLoading && !hasActivePlanForTier && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            No active billing plan is configured for <strong>{tier}</strong>. Activate one in Billing before creating this team.
          </div>
        )}

        {/* ── Team Information ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Team Information</CardTitle>
            <CardDescription>Basic details about the team or club.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name <span className="text-red-400">*</span></Label>
              <Input
                id="teamName"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. U14 Phoenix"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="athleteType">Team Type</Label>
              <Select
                items={ATHLETE_TYPE_ITEMS}
                value={athleteType}
                onValueChange={(v) => setAthleteType((v ?? "youth") as "youth" | "adult")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>
                  {ATHLETE_TYPE_ITEMS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>

            {athleteType === "youth" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="minAge">Min Age</Label>
                  <Input id="minAge" type="number" min={1} max={99} value={minAge} onChange={(e) => {
                    const raw = parseInt(e.target.value, 10);
                    setMinAge(Number.isFinite(raw) ? String(Math.max(1, Math.min(99, raw))) : "");
                  }} placeholder="e.g. 12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAge">Max Age</Label>
                  <Input id="maxAge" type="number" min={1} max={99} value={maxAge} onChange={(e) => {
                    const raw = parseInt(e.target.value, 10);
                    setMaxAge(Number.isFinite(raw) ? String(Math.max(1, Math.min(99, raw))) : "");
                  }} placeholder="e.g. 14" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Athlete Email Addresses ───────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Athlete Email Addresses</CardTitle>
            <CardDescription>
              Each athlete in this team gets a unique platform email in the format{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono text-foreground">
                {"{name}.{team-slug}@{EMAIL_DOMAIN}".replace("{EMAIL_DOMAIN}", EMAIL_DOMAIN)}
              </code>
              . Set the team slug below — it cannot be changed after athletes are added.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="emailSlug">Team Email Slug <span className="text-red-400">*</span></Label>
              <Input
                id="emailSlug"
                value={emailSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="e.g. u14-phoenix"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Only lowercase letters, numbers, and hyphens. Auto-filled from the team name.
              </p>
            </div>

            {emailSlug && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Athlete email preview</p>
                <p className="font-mono text-sm text-foreground">
                  <span className="text-muted-foreground">john.</span>
                  <span className="text-primary font-semibold">{emailSlug}</span>
                  <span className="text-muted-foreground">@{EMAIL_DOMAIN}</span>
                </p>
                <p className="mt-1 font-mono text-sm text-foreground">
                  <span className="text-muted-foreground">sarah.</span>
                  <span className="text-primary font-semibold">{emailSlug}</span>
                  <span className="text-muted-foreground">@{EMAIL_DOMAIN}</span>
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground italic">
                  Share the format <strong>{emailPreview}</strong> with players so they know their login email.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Team Manager ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Team Manager</CardTitle>
            <CardDescription>
              The manager signs in with these credentials to access and manage the team on the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="managerEmail">Manager Email <span className="text-red-400">*</span></Label>
              <Input
                id="managerEmail"
                type="email"
                required
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                placeholder="coach@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerName">Manager Name (Optional)</Label>
              <Input
                id="managerName"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Full name"
              />
            </div>

            <div className="col-span-full space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="managerPassword">
                  Password <span className="text-red-400">*</span>
                </Label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Generate random password
                </button>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="managerPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={managerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!managerPassword}
                  className="shrink-0 gap-1.5"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              {managerPassword && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/80">
                  Note down or copy this password now — it won't be shown again after the team is created.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Billing & Payment ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Billing & Payment</CardTitle>
            <CardDescription>Choose how and when to pay for this team.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment Method</Label>
                <Select
                  items={PAYMENT_METHOD_ITEMS}
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod((v ?? "email_link") as typeof paymentMethod)}
                >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>
                  {PAYMENT_METHOD_ITEMS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <Select
                items={BILLING_CYCLE_ITEMS}
                value={billingCycle}
                onValueChange={(v) => setBillingCycle((v ?? "monthly") as typeof billingCycle)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>
                  {BILLING_CYCLE_ITEMS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select
                items={[
                  { label: "Coach Pays All", value: "coach_pays_all" },
                  { label: "All Players Pay", value: "per_player_all" },
                  { label: "Selected Players Pay", value: "per_player_selected" },
                ]}
                value={paymentMode}
                onValueChange={(v) => setPaymentMode((v ?? "coach_pays_all") as typeof paymentMode)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>
                  <SelectItem value="coach_pays_all">Coach Pays All</SelectItem>
                  <SelectItem value="per_player_all">All Players Pay</SelectItem>
                  <SelectItem value="per_player_selected">Selected Players Pay</SelectItem>
                </SelectPopup>
              </Select>
            </div>

            {paymentMode !== "coach_pays_all" && (
              <div className="space-y-3 col-span-full">
                <Label>Players and payer list</Label>
                {(() => {
                  const filledProfiles = athleteProfiles.filter((p) => p.name.trim());
                  if (filledProfiles.length === 0) {
                    return (
                      <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                        Fill in athlete profiles in the <strong>Athlete Profiles</strong> section below — they will appear here automatically.
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {filledProfiles.map((profile, index) => {
                        const nameSlug = profile.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                        const autoEmail = nameSlug && emailSlug ? `${nameSlug}.${emailSlug}@${EMAIL_DOMAIN}` : "";
                        const payEmail = profile.guardianEmail.trim() || autoEmail;
                        const isPayer = paymentMode === "per_player_all" || selectedPayers.has(index);
                        return (
                          <div
                            key={index}
                            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${paymentMode === "per_player_selected" ? "cursor-pointer hover:border-primary/40" : ""} ${isPayer ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/10"}`}
                            onClick={() => {
                              if (paymentMode !== "per_player_selected") return;
                              setSelectedPayers((prev) => {
                                const next = new Set(prev);
                                next.has(index) ? next.delete(index) : next.add(index);
                                return next;
                              });
                            }}
                          >
                            {paymentMode === "per_player_selected" && (
                              <input
                                type="checkbox"
                                readOnly
                                checked={selectedPayers.has(index)}
                                className="h-4 w-4 accent-primary shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{payEmail || <span className="text-amber-400">No email — fill guardian email in profile</span>}</p>
                            </div>
                            {isPayer
                              ? <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Pays</span>
                              : <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Sponsored</span>
                            }
                          </div>
                        );
                      })}
                      {paymentMode === "per_player_selected" && (
                        <p className="text-[11px] text-muted-foreground">Tick who will pay — unchecked players are sponsored by the manager.</p>
                      )}
                      {paymentMode === "per_player_all" && (
                        <p className="text-[11px] text-muted-foreground">All players will receive a payment invite.</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Tier & Slots ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle suppressHydrationWarning>Tier & Slots</CardTitle>
            <CardDescription>Choose the programme tier for this team and the number of athlete slots.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Programme Tier</Label>
              <Select
                items={TIER_ITEMS}
                value={tier}
                onValueChange={(v) => setTier((v ?? "PHP") as ProgramTier)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>
                  {TIER_ITEMS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      <span className="font-medium">{i.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{i.description}</span>
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAthletes">Number of Athletes (Slots)</Label>
              <Input
                id="maxAthletes"
                type="number"
                min={1}
                max={200}
                required
                value={maxAthletes}
                onChange={(e) => setMaxAthletes(parseInt(e.target.value, 10))}
              />
            </div>

            {selectedTier && (
              <div className="col-span-full rounded-xl bg-primary/5 p-4 border border-primary/10 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tier:</span>
                  <span className="font-medium">{selectedTier.label}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Athletes:</span>
                  <span className="font-medium">{maxAthletes} slot{maxAthletes !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Billing:</span>
                  <span className="font-medium">{BILLING_CYCLE_ITEMS.find((c) => c.value === billingCycle)?.label ?? billingCycle}</span>
                </div>
                <p className="text-[10px] text-muted-foreground italic pt-1">
                  {paymentMethod === "cash"
                    ? "* Confirm cash received before proceeding. Team activates immediately."
                    : "* A Stripe payment link will be emailed to the manager."}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Estimated team total</p>
                    <p className="text-sm font-semibold text-foreground">{formatMoneyFromPence(estimatedTeamTotalPence)}</p>
                  </div>
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Estimated payer total</p>
                    <p className="text-sm font-semibold text-foreground">{formatMoneyFromPence(estimatedPayerTotalPence)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {estimatedPlayerPayerCount} payer seat{estimatedPlayerPayerCount === 1 ? "" : "s"} × {formatMoneyFromPence(perSeatPence)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Athlete Profiles ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Athlete Profiles</CardTitle>
            <CardDescription>
              Click each slot to fill in the athlete&apos;s details. Birthdate is required for age-matched training content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {athleteProfiles.map((profile, index) => {
                const filled = !!(profile.name && profile.birthDate);
                const nameSlug = profile.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                const autoEmail = nameSlug && emailSlug ? `${nameSlug}.${emailSlug}@${EMAIL_DOMAIN}` : null;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSlotDraft({ ...profile });
                      setEditingSlot(index);
                    }}
                    className={`rounded-xl border p-4 text-left transition hover:border-primary/60 hover:bg-primary/5 ${filled ? "border-emerald-500/40 bg-emerald-500/5" : "border-dashed border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Athlete #{index + 1}</p>
                        <p className="mt-1 truncate text-sm font-medium text-foreground">
                          {profile.name || <span className="italic text-muted-foreground">Not filled in</span>}
                        </p>
                        {profile.birthDate ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">DOB: {profile.birthDate}</p>
                        ) : (
                          <p className="mt-0.5 text-xs text-amber-400">Birthdate missing</p>
                        )}
                        {autoEmail ? (
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground/60">{autoEmail}</p>
                        ) : null}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${filled ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {filled ? "Done" : "Empty"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Sponsored Players ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Sponsored Players</CardTitle>
            <CardDescription>
              Are there players who can&apos;t afford this plan? The manager can sponsor them with a different tier.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-3">
              <Label htmlFor="hasSponsoredPlayers" className="flex-1">
                Are there players who can&apos;t afford this plan?
              </Label>
              <button
                id="hasSponsoredPlayers"
                type="button"
                role="switch"
                aria-checked={hasSponsoredPlayers}
                onClick={() => setHasSponsoredPlayers((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasSponsoredPlayers ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasSponsoredPlayers ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>

            {hasSponsoredPlayers && (
              <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
                <div className="space-y-2">
                  <Label>Sponsored Player Plan</Label>
                  <Select
                    items={TIER_ITEMS}
                    value={sponsoredTier}
                    onValueChange={(v) => setSponsoredTier((v ?? "PHP") as ProgramTier)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectPopup>
                      {TIER_ITEMS.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          <span className="font-medium">{i.label}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{i.description}</span>
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sponsoredPlayerCount">Number of Sponsored Players</Label>
                  <Input
                    id="sponsoredPlayerCount"
                    type="number"
                    min={1}
                    max={100}
                    value={sponsoredPlayerCount}
                    onChange={(e) => setSponsoredPlayerCount(parseInt(e.target.value, 10) || 1)}
                  />
                </div>

                <div className="col-span-full rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 space-y-1">
                  <p className="text-sm text-amber-200/80">
                    The manager will pay for <strong>{sponsoredPlayerCount}</strong> sponsored player{sponsoredPlayerCount !== 1 ? "s" : ""} on the{" "}
                    <strong>{TIER_ITEMS.find((t) => t.value === sponsoredTier)?.label ?? sponsoredTier}</strong> tier.
                  </p>
                  <p className="text-[10px] text-amber-200/60 italic">
                    Sponsored players are added later in the team management section by email. They receive limited access based on their plan tier.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="ghost" render={<Link href="/teams" />}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {isSubmitting
              ? "Processing…"
              : paymentMethod === "cash"
              ? "Confirm Cash & Activate"
              : "Create Team & Email Link"}
          </Button>
        </div>
      </form>

      {/* Athlete slot dialog */}
      <Dialog open={editingSlot !== null} onOpenChange={(open) => { if (!open) setEditingSlot(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Athlete #{(editingSlot ?? 0) + 1}</DialogTitle>
            <DialogDescription>Fill in this athlete&apos;s details. Birthdate is required for age-matched content.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Full name <span className="text-amber-400">*</span></Label>
              <Input placeholder="e.g. James Smith" value={slotDraft.name} onChange={(e) => setSlotDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Date of birth <span className="text-amber-400">*</span></Label>
              <Input type="date" value={slotDraft.birthDate} onChange={(e) => setSlotDraft((d) => ({ ...d, birthDate: e.target.value }))} />
            </div>
            {athleteType === "youth" ? (
              <div className="space-y-1.5">
                <Label>Guardian email <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input type="email" placeholder="parent@email.com" value={slotDraft.guardianEmail} onChange={(e) => setSlotDraft((d) => ({ ...d, guardianEmail: e.target.value }))} />
                <p className="text-[11px] text-muted-foreground">Parent will receive the athlete&apos;s login email and team slug.</p>
              </div>
            ) : null}
            {slotDraft.name && emailSlug ? (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Login email: <span className="font-mono text-foreground">{slotDraft.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}.{emailSlug}@{EMAIL_DOMAIN}</span>
              </div>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => setEditingSlot(null)}>Cancel</Button>
              <Button
                type="button"
                disabled={!slotDraft.name.trim() || !slotDraft.birthDate}
                onClick={() => {
                  if (editingSlot === null) return;
                  setAthleteProfiles((prev) => prev.map((p, i) => i === editingSlot ? { ...slotDraft } : p));
                  setEditingSlot(null);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
