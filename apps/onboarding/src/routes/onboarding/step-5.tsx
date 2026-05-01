import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
	Check,
	CircleNotch,
	Crown,
	Star,
	TrendUp,
	Lightning,
	ShieldCheck,
	Trophy,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Badge } from "#/components/ui/badge";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { toast } from "sonner";
import { config } from "#/lib/config";
import { cn } from "#/lib/utils";
import { featureKeyToLabel } from "#/lib/billing-features";

export const Route = createFileRoute("/onboarding/step-5")({
	head: () => ({
		meta: [
			{ title: "Choose Your Plan — PH Performance" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: OnboardingStep5,
});

type BillingCycle = "monthly" | "six_months" | "yearly";

function parseMoneyToNumber(value: string): number | null {
	const cleaned = value.replace(/[^\d.,-]/g, "");
	if (!cleaned) return null;
	const normalized = cleaned.replace(/,/g, "");
	const num = Number(normalized);
	return Number.isFinite(num) ? num : null;
}

function detectCurrencySymbol(value: string): string {
	const match = value.match(/[£$€]/);
	return match?.[0] ?? "£";
}

function formatMoney(symbol: string, amount: number): string {
	const formatted = amount.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
	return `${symbol}${formatted}`;
}

const BILLING_OPTIONS: {
	id: BillingCycle;
	title: string;
	description: string;
}[] = [
	{
		id: "monthly",
		title: "Monthly",
		description: "Recurring subscription",
	},
	{
		id: "six_months",
		title: "6 months",
		description: "One payment",
	},
	{
		id: "yearly",
		title: "1 year",
		description: "One payment",
	},
];

/** Order matches API tier ladder (see billing downgradePlan). */
const TIER_METADATA: Record<
	string,
	{ cardTitle: string; tierLine: string; icon: any; order: number; features: string[] }
> = {
	PHP: {
		cardTitle: "PHP Program",
		tierLine: "Core athlete access",
		icon: TrendUp,
		order: 1,
		features: [
			"Coach module access",
			"Messaging features",
			"Schedule & calendar",
		],
	},
	PHP_Premium: {
		cardTitle: "PHP Premium",
		tierLine: "Program + family tools",
		icon: Trophy,
		order: 2,
		features: [
			"Coach module access",
			"Messaging features",
			"Schedule & calendar",
			"Nutrition logging",
			"Parent platform",
		],
	},
	PHP_Premium_Plus: {
		cardTitle: "PHP Plus",
		tierLine: "Groups & video feedback",
		icon: Crown,
		order: 3,
		features: [
			"Coach module access",
			"Messaging features",
			"Schedule & calendar",
			"Nutrition logging",
			"Parent platform",
			"Includes semi-private sessions (small group coaching)",
			"Video upload for coach response",
		],
	},
	PHP_Pro: {
		cardTitle: "PHP Pro",
		tierLine: "Full access to everything",
		icon: Star,
		order: 4,
		features: [
			"Everything in PHP Plus — coach module, messaging, schedule",
			"Nutrition logging & parent platform",
			"Semi-private sessions (small group coaching)",
			"Video upload for coach response",
			"Full programs library & progress tracking",
			"Bookings, physio referrals & parent education",
			"Priority messaging & faster coach turnaround",
			"Advanced periodization & competition windows",
			"1:1 review blocks & bespoke progression",
			"Highest-touch pathway — unlock all app areas",
		],
	},
};

function planCardTitle(plan: { tier: string | null | undefined; name?: string | null }) {
	// Prefer the admin-set plan.name so renames in the admin portal flow through.
	const fromAdmin = String(plan.name ?? "").trim();
	if (fromAdmin) return fromAdmin;
	const meta = plan.tier ? TIER_METADATA[plan.tier] : undefined;
	if (meta?.cardTitle) return meta.cardTitle;
	return plan.tier ?? "";
}

function formatTierLine(tier: string | null | undefined) {
	if (!tier) return "";
	const meta = TIER_METADATA[tier];
	if (meta) return meta.tierLine;
	return tier.replace(/^PHP_?/i, "").replace(/_/g, " ").trim() || tier;
}

function dedupePlansByTier(plans: any[]) {
	// Collapse duplicates only when two plans share the same non-null tier (legacy + new).
	// Custom plans with `tier === null` are kept individually — keyed by plan id — so
	// admin-created plans without a tier code remain first-class.
	const score = (p: any): number => {
		if (p?.updatedAt) {
			const t = new Date(p.updatedAt).getTime();
			if (Number.isFinite(t)) return t;
		}
		return Number(p?.id ?? 0);
	};
	const best = new Map<string, any>();
	for (const p of plans) {
		const key = p.tier ? `tier:${p.tier}` : `id:${p.id}`;
		const cur = best.get(key);
		if (!cur || score(p) > score(cur)) best.set(key, p);
	}
	return [...best.values()];
}

function priceSuffix(cycle: BillingCycle) {
	if (cycle === "monthly") return "per month";
	if (cycle === "six_months") return "for 6 months";
	return "for 1 year";
}

/**
 * Resolve { original, discounted, percentOff } for a plan card.
 * Original = admin's typed-in price (pre-discount). Discounted = live Stripe price (already reduced).
 * Returns null for percentOff when no detectable discount, so the card can render without a badge.
 */
function resolvePlanPricing(plan: any, cycle: BillingCycle, displayPrice: string) {
	const origRaw =
		cycle === "yearly"
			? plan.yearlyPrice
			: cycle === "six_months"
				? plan.oneTimePrice
				: plan.monthlyPrice;
	const original = String(origRaw ?? "").trim() || null;
	const discounted = String(displayPrice ?? "").trim() || null;

	const a = parseMoneyToNumber(original ?? "");
	const b = parseMoneyToNumber(discounted ?? "");
	let percentOff: number | null = null;
	let displayOriginal = original;
	let displayDiscounted = discounted;

	if (a && b && b < a) {
		percentOff = Math.round(((a - b) / a) * 100);
		if (percentOff <= 0) percentOff = null;
	}

	// Helper that maps the cycle to the rule's `appliesTo` field.
	const ruleApplies = (rule: any): boolean => {
		const at = String(rule?.appliesTo ?? "").toLowerCase();
		if (!at) return false;
		if (at === "all" || at === "both") return true;
		if (cycle === "monthly" && at === "monthly") return true;
		if (cycle === "yearly" && at === "yearly") return true;
		if (cycle === "six_months" && (at === "six_months" || at === "one_time")) return true;
		return false;
	};

	// When admin uses the new array `discounts`, stack every applicable rule into a combined percent.
	if (!percentOff && Array.isArray(plan?.discounts) && plan.discounts.length > 0) {
		const applicable = plan.discounts.filter(ruleApplies);
		let remaining = 1;
		for (const rule of applicable) {
			if (rule.type !== "percent") continue;
			const v = Number(String(rule.value ?? "").replace(/[^\d.]/g, ""));
			if (Number.isFinite(v) && v > 0 && v < 100) remaining *= 1 - v / 100;
		}
		const stackedPercent = Math.round((1 - remaining) * 100);
		if (stackedPercent > 0 && stackedPercent < 100) {
			percentOff = stackedPercent;
			if (a) {
				const symbol = detectCurrencySymbol(original ?? discounted ?? "");
				const implied = a * remaining;
				displayDiscounted = formatMoney(symbol, Math.round(implied * 100) / 100);
				displayOriginal = original;
			}
		}
	}

	// Legacy fallback: single discountType/Value triple.
	if (!percentOff && plan?.discountType === "percent" && plan?.discountValue) {
		const v = Number(String(plan.discountValue).replace(/[^\d.]/g, ""));
		if (Number.isFinite(v) && v > 0 && v < 100) {
			percentOff = Math.round(v);
			if (a) {
				const symbol = detectCurrencySymbol(original ?? discounted ?? "");
				const implied = a * (1 - v / 100);
				displayDiscounted = formatMoney(symbol, Math.round(implied * 100) / 100);
				displayOriginal = original;
			}
		}
	}

	const showOriginal = percentOff != null && displayOriginal && displayOriginal !== displayDiscounted;
	return { original: displayOriginal, discounted: displayDiscounted, percentOff, showOriginal };
}

function OnboardingStep5() {
	const [plans, setPlans] = useState<any[]>([]);
	const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
	const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [teamCheckout, setTeamCheckout] = useState<{
		teamId: number;
		maxAthletes: number;
		teamName?: string;
	} | null>(null);

	const isTeam = typeof window !== "undefined" && localStorage.getItem("user_type") === "team";

	const loadPlans = useCallback(async () => {
		setIsLoading(true);
		try {
			const baseUrl = config.api.baseUrl;
			const params = new URLSearchParams({ billingCycle });
			// Bypass any HTTP cache so admin edits show up immediately on refresh.
			const response = await fetch(`${baseUrl}/api/billing/plans?${params.toString()}`, {
				cache: "no-store",
				headers: { "Cache-Control": "no-cache" },
			});
			if (response.ok) {
				const data = await response.json();
				const activePlans = dedupePlansByTier(
					(data.plans || []).filter((p: any) => p.isActive),
				).sort((a: any, b: any) => {
					const orderA = TIER_METADATA[a.tier]?.order ?? 99;
					const orderB = TIER_METADATA[b.tier]?.order ?? 99;
					return orderA - orderB;
				});

				setPlans(activePlans);
				if (activePlans.length > 0) {
					setSelectedPlan((prev) => {
						if (prev != null && activePlans.some((p: any) => p.id === prev)) return prev;
						const preferred =
							activePlans.find((p: any) => p.tier === "PHP_Premium") ?? activePlans[0];
						return preferred.id ?? null;
					});
				}
			} else {
				const err = await response.json().catch(() => ({}));
				throw new Error(err?.error || `Plans request failed (${response.status})`);
			}
		} catch (error) {
			console.error("Error fetching plans:", error);
			toast.error("Error", { description: "Could not load subscription plans." });
		} finally {
			setIsLoading(false);
		}
	}, [billingCycle]);

	useEffect(() => {
		void loadPlans();
	}, [loadPlans]);

	useEffect(() => {
		if (!isTeam) return;
		const token = localStorage.getItem("auth_token");
		if (!token) return;

		const hydrate = async () => {
			const raw = localStorage.getItem("team_onboarding_basic");
			if (raw) {
				try {
					const parsed = JSON.parse(raw) as any;
					const teamId = Number(parsed?.teamId ?? null);
					const maxAthletes = Number(parsed?.maxAthletes ?? null);
					if (Number.isFinite(teamId) && Number.isFinite(maxAthletes) && maxAthletes > 0) {
						setTeamCheckout({
							teamId,
							maxAthletes,
							teamName: typeof parsed?.teamName === "string" ? parsed.teamName : undefined,
						});
						return;
					}
				} catch {
					// ignore
				}
			}

			try {
				const baseUrl = config.api.baseUrl;
				const res = await fetch(`${baseUrl}/api/auth/me`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok) return;
				const team = (data as any)?.user?.team;
				const teamId = Number(team?.id ?? null);
				const maxAthletes = Number(team?.maxAthletes ?? null);
				if (Number.isFinite(teamId) && Number.isFinite(maxAthletes) && maxAthletes > 0) {
					const payload = {
						teamId,
						maxAthletes,
						teamName: typeof team?.name === "string" ? team.name : undefined,
						minAge: team?.minAge ?? null,
						maxAge: team?.maxAge ?? null,
					};
					localStorage.setItem("team_onboarding_basic", JSON.stringify(payload));
					setTeamCheckout(payload);
				}
			} catch {
				// ignore
			}
		};

		void hydrate();
	}, [isTeam]);

	const handlePayment = async () => {
		if (selectedPlan == null) return;
		const selectedPlanData = plans.find((p) => p.id === selectedPlan);
		if (!selectedPlanData?.id) {
			toast.error("Checkout failed", { description: "Selected plan is not available." });
			return;
		}
		setIsSubmitting(true);
		try {
			const baseUrl = config.api.baseUrl;
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Your session expired. Sign in again to continue.");
			}

			let teamId: number | null = isTeam ? (teamCheckout?.teamId ?? null) : null;
			if (isTeam && (!teamId || !Number.isFinite(teamId))) {
				try {
					const res = await fetch(`${baseUrl}/api/auth/me`, {
						headers: { Authorization: `Bearer ${token}` },
					});
					const data = await res.json().catch(() => ({}));
					if (res.ok) {
						const maybe = Number((data as any)?.user?.team?.id ?? null);
						if (Number.isFinite(maybe)) teamId = maybe;
					}
				} catch {
					// ignore
				}
			}

			if (isTeam && !teamId) {
				throw new Error("Missing team id. Please go back and re-submit your team details.");
			}

			const response = await fetch(`${baseUrl}/api/billing/${isTeam ? "team/checkout" : "checkout"}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					...(isTeam ? { teamId } : null),
					planId: selectedPlanData.id,
					billingCycle,
				}),
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || data.message || "Failed to create checkout session");
			}
			if (data.checkoutUrl) {
				window.location.href = data.checkoutUrl;
			} else {
				throw new Error(data.error || "Failed to create checkout session");
			}
		} catch (error: any) {
			toast.error("Checkout failed", { description: error.message || "Please try again later." });
			setIsSubmitting(false);
		}
	};

	if (isLoading && plans.length === 0) {
		return (
			<main className="mx-auto max-w-7xl px-4 py-8 sm:py-16 sm:px-6 lg:px-8">
				<div className="space-y-12">
					<div className="space-y-4 text-center max-w-2xl mx-auto">
						<Skeleton className="h-3 w-24 mx-auto" />
						<Skeleton className="h-12 w-80 mx-auto" />
						<Skeleton className="h-5 w-96 mx-auto" />
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-20 w-full" />
					</div>
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
						{[0, 1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-[480px] w-full" />
						))}
					</div>
				</div>
			</main>
		);
	}

	if (!plans.length && !isLoading) {
		return (
			<main className="mx-auto max-w-lg px-4 py-16 text-center">
				<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Plans</p>
				<h1 className="mt-2 text-2xl font-medium tracking-tight text-foreground">No plans available</h1>
				<p className="mt-2 text-sm text-muted-foreground leading-relaxed">
					Subscription plans are not configured yet. Please try again later or contact support.
				</p>
			</main>
		);
	}

	const selectedPlanData = plans.find((p) => p.id === selectedPlan);
	const selectedDisplayPrice =
		selectedPlanData?.billingQuote?.amount ??
		selectedPlanData?.pricing?.monthly?.discounted ??
		selectedPlanData?.pricing?.badge ??
		selectedPlanData?.displayPrice ??
		"";
	const unitPrice = selectedDisplayPrice ? parseMoneyToNumber(String(selectedDisplayPrice)) : null;
	const currencySymbol = selectedDisplayPrice ? detectCurrencySymbol(String(selectedDisplayPrice)) : "£";
	const teamSize = teamCheckout?.maxAthletes ?? null;
	const estimatedTotal =
		isTeam && unitPrice != null && teamSize != null ? unitPrice * teamSize : null;

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:py-16 sm:px-6 lg:px-8">
			<section className="space-y-12 animate-in fade-in duration-700">
				<div className="space-y-4 text-center max-w-2xl mx-auto">
					<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
						Final Step
					</p>
					<h1 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground">
						Choose Your Plan
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed">
						Pick how you want to pay, then select the tier that fits your goals.
					</p>
				</div>

				{isTeam && (
					<Card className="max-w-3xl mx-auto border border-foreground/[0.06] p-6">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
								Team Pricing
							</Badge>
							<p className="text-xs text-muted-foreground">
								Total = <span className="font-medium text-foreground">plan price x athletes</span>
							</p>
						</div>
						<Separator className="my-4 bg-foreground/[0.06]" />
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<div className="border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3">
								<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Team</p>
								<p className="mt-1 text-sm font-medium truncate">{teamCheckout?.teamName ?? "Your team"}</p>
							</div>
							<div className="border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3">
								<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Athletes</p>
								<p className="mt-1 text-sm font-medium">{teamSize ?? "—"}</p>
							</div>
							<div className="border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3">
								<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Estimated</p>
								<p className="mt-1 text-sm font-medium">
									{estimatedTotal == null ? "—" : formatMoney(currencySymbol, estimatedTotal)}
								</p>
							</div>
						</div>
						{!teamCheckout?.teamId && (
							<p className="mt-4 text-xs font-semibold text-destructive">
								Missing team id. Go back to Step 2 and re-submit team details.
							</p>
						)}
					</Card>
				)}

				<div className="max-w-3xl mx-auto space-y-3">
					<p className="text-center font-mono text-[10px] uppercase tracking-wider text-foreground/40">
						Billing
					</p>
					<div
						role="radiogroup"
						aria-label="Billing cycle"
						className="grid grid-cols-1 sm:grid-cols-3 gap-3"
					>
						{BILLING_OPTIONS.map((opt) => {
							const active = billingCycle === opt.id;
							const savings =
								opt.id === "yearly" ? "Save up to 20%" : opt.id === "six_months" ? "Save up to 10%" : null;
							return (
								<button
									key={opt.id}
									type="button"
									role="radio"
									aria-checked={active}
									onClick={() => setBillingCycle(opt.id)}
									className={cn(
										"relative border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
										active
											? "border-foreground bg-foreground/[0.04]"
											: "border-foreground/[0.06] hover:border-foreground/20",
									)}
								>
									<div className="flex items-center justify-between">
										<p className="font-mono text-xs uppercase tracking-wider">{opt.title}</p>
										{savings && (
											<Badge variant="default" className="font-mono text-[9px] uppercase tracking-wider">
												{savings}
											</Badge>
										)}
									</div>
									<p className="text-[11px] text-muted-foreground mt-1">
										{opt.description}
									</p>
								</button>
							);
						})}
					</div>
				</div>

				<div
					role="radiogroup"
					aria-label="Subscription plan"
					className={cn(
						"grid gap-6 transition-opacity",
						isLoading ? "opacity-50 pointer-events-none" : "opacity-100",
						plans.length >= 4 ? "md:grid-cols-2 lg:grid-cols-4" : plans.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2",
					)}
				>
					{plans.map((plan) => {
						const isSelected = selectedPlan === plan.id;
						const isPopular = plan.tier === "PHP_Premium_Plus";
						const displayPrice =
							billingCycle === "yearly"
								? (plan.billingQuote?.amount ?? plan.yearlyPrice ?? plan.pricing?.yearly?.discounted ?? plan.displayPrice ?? "—")
								: billingCycle === "six_months"
									? (plan.billingQuote?.amount ?? plan.oneTimePrice ?? plan.displayPrice ?? "—")
									: (plan.billingQuote?.amount ??
										plan.pricing?.monthly?.discounted ??
										plan.pricing?.badge ??
										plan.monthlyPrice ??
										plan.displayPrice ??
										"—");
						const meta = TIER_METADATA[plan.tier] ?? {
							cardTitle: String(plan.name || "Plan").trim() || "Plan",
							tierLine: plan.tier,
							icon: TrendUp,
							order: 99,
							features: [
								"Elite Training Protocols",
								"Mobile App Access",
								"Progress Tracking",
								"Coach Support",
							],
						};
						const Icon = meta.icon;
						const title = planCardTitle(plan);
						// Prefer admin-curated features from the DB plan; fall back to the hardcoded
						// per-tier defaults only if the admin hasn't set any.
						const featureList =
							Array.isArray(plan.features) && plan.features.length > 0
								? plan.features
								: (TIER_METADATA[plan.tier]?.features ?? meta.features);

						return (
							<Card
								key={plan.id}
								role="radio"
								aria-checked={isSelected}
								tabIndex={0}
								onClick={() => setSelectedPlan(plan.id)}
								onKeyDown={(e) => {
									if (e.key === " " || e.key === "Enter") {
										e.preventDefault();
										setSelectedPlan(plan.id);
									}
								}}
								className={cn(
									"relative p-5 sm:p-7 flex flex-col h-full border transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
									isSelected
										? "border-foreground"
										: "border-foreground/[0.06] hover:border-foreground/20",
								)}
							>
								{isPopular && (
									<div className="absolute -top-3 left-1/2 -translate-x-1/2">
										<Badge
											variant="default"
											className="font-mono text-[9px] uppercase tracking-wider px-3 py-1"
										>
											Most Popular
										</Badge>
									</div>
								)}
								<div className="space-y-5 flex-1">
									<div className="flex items-center justify-between">
										<div
											className={cn(
												"p-3 transition-colors",
												isSelected ? "bg-foreground/10 text-foreground/60" : "bg-foreground/10 text-foreground/60",
											)}
										>
											<Icon size={28} weight="bold" />
										</div>
										<div
											className={cn(
												"flex items-center justify-center w-7 h-7 border-2 transition-all",
												isSelected
													? "bg-foreground border-foreground text-background"
													: "border-foreground/[0.06] text-transparent",
											)}
											aria-hidden
										>
											<Check size={14} weight="bold" />
										</div>
									</div>

									<div className="space-y-1">
										<h3 className="text-lg font-medium tracking-tight leading-none">{title}</h3>
										<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
											{formatTierLine(plan.tier)}
										</p>
									</div>

									<Separator />

									{(() => {
										const pricing = resolvePlanPricing(plan, billingCycle, displayPrice);
										return (
											<div className="flex flex-col gap-1.5">
												<div className="flex items-baseline gap-2 flex-wrap">
													<span className="text-3xl font-medium tracking-tight text-foreground">
														{pricing.discounted ?? "—"}
													</span>
													{pricing.showOriginal ? (
														<span
															className="text-base text-muted-foreground/70 line-through decoration-2 decoration-rose-400/70"
															aria-label={`Original price ${pricing.original}`}
														>
															{pricing.original}
														</span>
													) : null}
													{pricing.percentOff ? (
														<Badge
															variant="secondary"
															className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5"
														>
															Save {pricing.percentOff}%
														</Badge>
													) : null}
												</div>
												<span className="font-mono text-[10px] text-foreground/40 uppercase tracking-wider">
													{priceSuffix(billingCycle)}
													{billingCycle === "monthly" ? " · subscription" : " · one-time"}
												</span>
											</div>
										);
									})()}

									<Separator />

									<ul className="space-y-3 flex-1">
										{featureList.map((feature: string, i: number) => (
											<li key={i} className="flex items-start gap-3">
												<div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
													<Check size={10} weight="bold" className="text-foreground/40" />
												</div>
												<span className="text-sm text-foreground/70 leading-snug">
													{featureKeyToLabel(feature)}
												</span>
											</li>
										))}
									</ul>
								</div>
							</Card>
						);
					})}
				</div>

				<div className="flex flex-col items-center gap-6 pt-4 max-w-md mx-auto">
					<Button
						onClick={handlePayment}
						disabled={isSubmitting || selectedPlan == null || isLoading}
						className="w-full h-10 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
					>
						{isSubmitting ? (
							<CircleNotch className="w-5 h-5 animate-spin" />
						) : (
							<>
								Continue to Payment
								<Lightning weight="fill" className="w-4 h-4" />
							</>
						)}
					</Button>

					<div className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground">
						<div className="flex items-center gap-2">
							<ShieldCheck size={18} className="text-foreground/40" />
							<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Secure Checkout</span>
						</div>
						{billingCycle === "monthly" ? (
							<div className="flex items-center gap-2">
								<Check size={18} className="text-foreground/40" />
								<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Cancel Anytime</span>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<Check size={18} className="text-foreground/40" />
								<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Single payment</span>
							</div>
						)}
					</div>
				</div>
			</section>
		</main>
	);
}
