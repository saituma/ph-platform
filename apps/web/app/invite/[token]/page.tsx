"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const csrfCookieName = "csrfToken";
const getCsrf = () =>
  typeof document === "undefined"
    ? ""
    : document.cookie
        .split(";")
        .map((p) => p.trim())
        .find((p) => p.startsWith(`${csrfCookieName}=`))
        ?.split("=")[1] ?? "";

type PlanSummary = {
  id: number;
  name: string;
  tier: string;
  displayPrice: string;
  monthlyPrice: string | null;
  yearlyPrice: string | null;
  oneTimePrice: string | null;
  features: string[];
  supports: { monthly: boolean; yearly: boolean; six_months: boolean };
};

type InviteSummary = {
  email: string;
  invitedByName: string | null;
  plan: PlanSummary;
};

type Cycle = "monthly" | "six_months" | "yearly";

const formatTier = (tier: string) => tier.replace(/_/g, " ");

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [summary, setSummary] = useState<InviteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [trainingPerWeek, setTrainingPerWeek] = useState("3");
  const [performanceGoals, setPerformanceGoals] = useState("");
  const [injuries, setInjuries] = useState("");
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch(`/api/backend/public/plan-invites/${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.error ?? "Invalid invite.");
        setSummary(data);
        const s = data.plan.supports;
        setCycle(s.monthly ? "monthly" : s.six_months ? "six_months" : s.yearly ? "yearly" : "monthly");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load invite.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const cycleOptions = useMemo(() => {
    if (!summary) return [] as Array<{ value: Cycle; label: string; price: string | null }>;
    const out: Array<{ value: Cycle; label: string; price: string | null }> = [];
    if (summary.plan.supports.monthly) out.push({ value: "monthly", label: "Monthly (recurring)", price: summary.plan.monthlyPrice });
    if (summary.plan.supports.six_months) out.push({ value: "six_months", label: "6 months (one-time)", price: summary.plan.oneTimePrice });
    if (summary.plan.supports.yearly) out.push({ value: "yearly", label: "1 year (one-time)", price: summary.plan.yearlyPrice });
    return out;
  }, [summary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary || submitting) return;
    setSubmitError(null);
    if (!fullName.trim()) {
      setSubmitError("Full name is required.");
      return;
    }
    if (!birthDate) {
      setSubmitError("Date of birth is required.");
      return;
    }
    setSubmitting(true);
    try {
      const csrf = getCsrf();
      const res = await fetch(`/api/backend/public/plan-invites/${encodeURIComponent(token)}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          birthDate,
          phone: phone.trim() || undefined,
          trainingPerWeek: Number(trainingPerWeek) || 3,
          performanceGoals: performanceGoals.trim() || undefined,
          injuries: injuries.trim() || undefined,
          billingCycle: cycle,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.checkoutUrl) {
        throw new Error(data?.error ?? "Could not start checkout.");
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not start checkout.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
        <div className="text-sm text-emerald-800/70">Loading your invite…</div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-white px-6">
        <div className="max-w-md text-center space-y-3">
          <div className="text-2xl font-bold text-rose-700">Invite unavailable</div>
          <p className="text-rose-700/80 text-sm">{error ?? "This invite link is invalid or has expired."}</p>
        </div>
      </div>
    );
  }

  const plan = summary.plan;
  const heading = summary.invitedByName
    ? `${summary.invitedByName} invited you to ${plan.name}`
    : `You've been invited to ${plan.name}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-6 sm:p-8">
          <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-emerald-700">
            Plan invitation
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">{heading}</h1>
          <p className="mt-2 text-sm text-slate-600">
            For <span className="font-semibold">{summary.email}</span>. Complete the short form below and pay securely via
            Stripe — your access activates immediately after payment.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-100/70 text-emerald-800 px-3 py-1.5 text-xs font-semibold">
            <span>{formatTier(plan.tier)}</span>
            <span className="text-emerald-700/50">·</span>
            <span>{plan.displayPrice}</span>
          </div>

          {plan.features.length > 0 ? (
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-slate-700">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8 space-y-5"
        >
          <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-slate-500">About you</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full name" required>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                placeholder="Jane Doe"
              />
            </Field>
            <Field label="Date of birth" required>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Phone (optional)">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="+44 …"
              />
            </Field>
            <Field label="Training days / week">
              <input
                type="number"
                min={1}
                max={14}
                value={trainingPerWeek}
                onChange={(e) => setTrainingPerWeek(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Performance goals (optional)" className="sm:col-span-2">
              <textarea
                rows={3}
                value={performanceGoals}
                onChange={(e) => setPerformanceGoals(e.target.value)}
                className={inputClass}
                placeholder="What do you want to achieve?"
              />
            </Field>
            <Field label="Injuries / notes (optional)" className="sm:col-span-2">
              <textarea
                rows={2}
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                className={inputClass}
                placeholder="Any current injuries the coach should know about?"
              />
            </Field>
          </div>

          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-slate-500">Billing</div>
            <div className="grid grid-cols-1 gap-2">
              {cycleOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center justify-between gap-4 rounded-2xl border-2 px-4 py-3 cursor-pointer transition-colors ${
                    cycle === opt.value ? "border-emerald-500 bg-emerald-50/60" : "border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="cycle"
                      checked={cycle === opt.value}
                      onChange={() => setCycle(opt.value)}
                      className="accent-emerald-600"
                    />
                    <span className="text-sm font-semibold text-slate-900">{opt.label}</span>
                  </div>
                  {opt.price ? (
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{opt.price}</span>
                  ) : null}
                </label>
              ))}
            </div>
          </div>

          {submitError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {submitError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 text-sm transition-colors"
          >
            {submitting ? "Redirecting to Stripe…" : "Continue to payment"}
          </button>

          <p className="text-[11px] text-slate-500 text-center">
            Payments are processed by Stripe. Your account is created when you pay. You'll receive your mobile login by email.
          </p>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500";

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1.5 ${className ?? ""}`}>
      <span className="text-xs font-semibold text-slate-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
