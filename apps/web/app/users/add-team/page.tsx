"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Copy, Check, Eye, EyeOff } from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "../../../components/ui/select";

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
  { label: "Stripe (Pay Immediately)", value: "pay_now" },
  { label: "Stripe (Email Link to Admin)", value: "email_link" },
  { label: "Cash / Manual (Offline Payment)", value: "cash" },
];

const BILLING_CYCLE_ITEMS = [
  { label: "Monthly Recurring", value: "monthly" },
  { label: "6 Months Upfront", value: "6months" },
  { label: "Yearly Upfront (Best Value)", value: "yearly" },
];

type ProgramTier = "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro";

const TIER_ITEMS: { label: string; value: ProgramTier; description: string }[] = [
  { label: "PHP", value: "PHP", description: "Performance Health Programme" },
  { label: "PHP Premium", value: "PHP_Premium", description: "Enhanced training & support" },
  { label: "PHP Premium Plus", value: "PHP_Premium_Plus", description: "Full access with extras" },
  { label: "PHP Pro", value: "PHP_Pro", description: "Elite programme" },
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
  const [paymentMethod, setPaymentMethod] = useState<"pay_now" | "email_link" | "cash">("pay_now");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "6months" | "yearly">("monthly");

  // Sponsored players
  const [hasSponsoredPlayers, setHasSponsoredPlayers] = useState(false);
  const [sponsoredPlayerCount, setSponsoredPlayerCount] = useState(1);
  const [sponsoredTier, setSponsoredTier] = useState<ProgramTier>("PHP");

  // Misc
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-derive slug from team name unless admin has manually edited it
  useEffect(() => {
    if (!slugEdited) setEmailSlug(slugify(teamName));
  }, [teamName, slugEdited]);

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
    if (!cleanPassword || cleanPassword.length < 8) return setError("Manager password must be at least 8 characters.");

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

  const canSubmit = teamName.trim() && emailSlug.trim() && managerEmail.trim() && managerPassword.trim().length >= 8 && tier && !isSubmitting;

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
                  <Input id="minAge" type="number" value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="e.g. 12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAge">Max Age</Label>
                  <Input id="maxAge" type="number" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="e.g. 14" />
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
                onValueChange={(v) => setPaymentMethod((v ?? "pay_now") as typeof paymentMethod)}
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
                    : paymentMethod === "email_link"
                    ? "* A Stripe payment link will be emailed to the manager."
                    : "* You will be redirected to Stripe to pay now."}
                </p>
              </div>
            )}
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
              : paymentMethod === "email_link"
              ? "Create Team & Email Link"
              : "Register Team & Pay"}
          </Button>
        </div>
      </form>
    </AdminShell>
  );
}
