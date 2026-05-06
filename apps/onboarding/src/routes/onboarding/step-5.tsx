import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Checkbox } from "#/components/ui/checkbox";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { toast } from "sonner";
import { config } from "#/lib/config";
import { getAuthHeaders, getTokenStatus } from "#/lib/client-storage";
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
type ProgramFilter = "standard" | "weekly";

function isWeeklyPlan(plan: any): boolean {
	const name = String(plan?.name ?? "").toLowerCase();
	const tier = String(plan?.tier ?? "").toLowerCase();
	const interval = String(plan?.billingInterval ?? "").toLowerCase();
	const durationWeeks = Number(plan?.durationWeeks ?? 0);

	if (name.includes("weekly") || tier.includes("weekly") || interval.includes("week")) return true;
	// Any explicit duration-in-weeks program belongs in the Weekly bucket.
	if (Number.isFinite(durationWeeks) && durationWeeks > 0) return true;
	return false;
}

function paymentConfigScopeKey(maxAthletes: number | null | undefined) {
	const athletes = Number.isFinite(Number(maxAthletes)) ? Number(maxAthletes) : 0;
	const coachEmail = (localStorage.getItem("pending_email") || "").trim().toLowerCase();
	return `${coachEmail}::${athletes}`;
}

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
		title: "One-time",
		description: "Single payment",
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

function oneTimeDurationLabel(plan: any) {
	const weeks = Number(plan?.durationWeeks ?? 0);
	if (Number.isFinite(weeks) && weeks > 0) return `for ${weeks} week${weeks === 1 ? "" : "s"}`;
	return "one-time access";
}

function priceSuffix(cycle: BillingCycle, plan?: any) {
	if (cycle === "monthly") return "per month";
	if (cycle === "six_months") return oneTimeDurationLabel(plan);
	return "for 1 year";
}

function planBillingLabel(plan: any, selectedCycle: BillingCycle) {
	if (plan?.billingQuote?.mode === "subscription") return "per month · subscription";
	if (plan?.billingQuote?.mode === "payment") {
		const inferredOneTimeCycle: BillingCycle =
			selectedCycle === "monthly"
				? planSupportsBillingCycle(plan, "six_months")
					? "six_months"
					: "yearly"
				: selectedCycle;
		return `${priceSuffix(inferredOneTimeCycle, plan)} · one-time payment`;
	}
	if (!planSupportsBillingCycle(plan, "monthly")) {
		if (planSupportsBillingCycle(plan, "six_months")) return `${oneTimeDurationLabel(plan)} · one-time payment`;
		if (planSupportsBillingCycle(plan, "yearly")) return "for 1 year · one-time payment";
	}
	return selectedCycle === "monthly"
		? "per month · subscription"
		: `${priceSuffix(selectedCycle, plan)} · one-time payment`;
}

function firstSupportedCycleForPlan(plan: any): BillingCycle | null {
	const order: BillingCycle[] = ["monthly", "six_months", "yearly"];
	return order.find((cycle) => planSupportsBillingCycle(plan, cycle)) ?? null;
}

function planSupportsBillingCycle(plan: any, cycle: BillingCycle): boolean {
	if (plan?.supports && typeof plan.supports === "object") {
		return Boolean(plan.supports[cycle]);
	}
	if (cycle === "monthly") return Boolean(plan?.stripePriceIdMonthly || plan?.monthlyPrice);
	if (cycle === "six_months") return Boolean(plan?.stripePriceIdOneTime || plan?.oneTimePrice);
	return Boolean(plan?.stripePriceIdYearly || plan?.yearlyPrice);
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
	const navigate = useNavigate();
	const [plans, setPlans] = useState<any[]>([]);
	const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
	const [programFilter, setProgramFilter] = useState<ProgramFilter>("standard");
	const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [agreedToTerms, setAgreedToTerms] = useState(false);
	const [teamCheckout, setTeamCheckout] = useState<{
		teamId: number;
		maxAthletes: number;
		teamName?: string;
	} | null>(null);
	const [teamPaymentConfig, setTeamPaymentConfig] = useState<{
		paymentMode: "coach_pays_all" | "per_player_all" | "per_player_selected";
		coachPaysSeats: number;
		playerPayersCount: number;
	} | null>(null);
	const filteredPlans = useMemo(
		() =>
			plans.filter((plan: any) =>
				programFilter === "weekly" ? isWeeklyPlan(plan) : !isWeeklyPlan(plan),
			),
		[plans, programFilter],
	);

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
		if (programFilter === "weekly" && billingCycle !== "six_months") {
			setBillingCycle("six_months");
		}
	}, [programFilter, billingCycle]);

	useEffect(() => {
		if (!filteredPlans.length) return;
		if (selectedPlan != null) {
			const selected = filteredPlans.find((p: any) => p.id === selectedPlan);
			if (selected && planSupportsBillingCycle(selected, billingCycle)) return;
		}
		const firstSupported = filteredPlans.find((p: any) => planSupportsBillingCycle(p, billingCycle));
		if (firstSupported) setSelectedPlan(firstSupported.id);
	}, [filteredPlans, selectedPlan, billingCycle]);

	useEffect(() => {
		if (!isTeam) return;

		const hydrate = async () => {
			const status = await getTokenStatus();
			if (!status.authenticated) return;

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
					credentials: "include",
					headers: getAuthHeaders(),
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

	useEffect(() => {
		if (!isTeam) return;
		(async () => {
			let loaded = false;
			const scopedTeamSize = teamCheckout?.maxAthletes ?? null;
			const expectedScope = paymentConfigScopeKey(scopedTeamSize);

			if (teamCheckout?.teamId) {
				try {
					const res = await fetch(`${config.api.baseUrl}/api/billing/team/payment-config-draft/${teamCheckout.teamId}`, {
						credentials: "include",
						headers: getAuthHeaders(),
					});
					const data = await res.json().catch(() => ({}));
					const draft = (data as any)?.draft;
					if (res.ok && draft && String(draft?.scopeKey ?? "") === expectedScope) {
						const paymentMode =
							draft?.paymentMode === "per_player_all" || draft?.paymentMode === "per_player_selected"
								? draft.paymentMode
								: "coach_pays_all";
						const coachPaysSeats = Number.isFinite(Number(draft?.coachPaysSeats))
							? Math.max(0, Number(draft.coachPaysSeats))
							: 0;
						const playerPayers = Array.isArray(draft?.playerPayers) ? draft.playerPayers : [];
						setTeamPaymentConfig({
							paymentMode,
							coachPaysSeats,
							playerPayersCount: playerPayers.length,
						});
						loaded = true;
					}
				} catch {
					// fallback to local
				}
			}

			if (!loaded) {
				try {
					const raw = localStorage.getItem("team_payment_config");
					if (!raw) return;
					const parsed = JSON.parse(raw) as any;
					if (String(parsed?.scopeKey ?? "") !== expectedScope) return;
					const paymentMode =
						parsed?.paymentMode === "per_player_all" || parsed?.paymentMode === "per_player_selected"
							? parsed.paymentMode
							: "coach_pays_all";
					const coachPaysSeats = Number.isFinite(Number(parsed?.coachPaysSeats))
						? Math.max(0, Number(parsed.coachPaysSeats))
						: 0;
					const playerPayers = Array.isArray(parsed?.playerPayers)
						? parsed.playerPayers
						: Array.isArray(parsed?.playerEmails)
							? parsed.playerEmails
							: [];
					setTeamPaymentConfig({
						paymentMode,
						coachPaysSeats,
						playerPayersCount: playerPayers.length,
					});
				} catch {
					// ignore
				}
			}
		})();
	}, [isTeam, teamCheckout?.maxAthletes]);

	const handlePayment = async () => {
		if (selectedPlan == null) return;
		const selectedPlanData = plans.find((p) => p.id === selectedPlan);
		if (!selectedPlanData?.id) {
			toast.error("Checkout failed", { description: "Selected plan is not available." });
			return;
		}
		if (!planSupportsBillingCycle(selectedPlanData, billingCycle)) {
			toast.error("Checkout failed", { description: "Selected billing cycle is not available for this plan." });
			return;
		}
		setIsSubmitting(true);
		try {
			const baseUrl = config.api.baseUrl;
			const status = await getTokenStatus();
			if (!status.authenticated) {
				throw new Error("Your session expired. Sign in again to continue.");
			}

			let teamId: number | null = isTeam ? (teamCheckout?.teamId ?? null) : null;
			if (isTeam && (!teamId || !Number.isFinite(teamId))) {
				try {
					const res = await fetch(`${baseUrl}/api/auth/me`, {
						credentials: "include",
						headers: getAuthHeaders(),
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

			let paymentMode = "coach_pays_all";
			let coachPaysSeats = 0;
			let termsAcceptedAt = "";
			let termsVersion = "";
			let playerEmails: string[] = [];
			let playerPayers: Array<{ name: string; email: string }> = [];

				if (isTeam) {
					try {
						const expectedScope = paymentConfigScopeKey(teamCheckout?.maxAthletes ?? null);
						let loadedFromServer = false;
						if (teamId) {
							const draftRes = await fetch(`${baseUrl}/api/billing/team/payment-config-draft/${teamId}`, {
								credentials: "include",
								headers: getAuthHeaders(),
							});
							const draftData = await draftRes.json().catch(() => ({}));
							const draft = (draftData as any)?.draft;
							if (draftRes.ok && draft && String(draft?.scopeKey ?? "") === expectedScope) {
								paymentMode = draft.paymentMode || "coach_pays_all";
								coachPaysSeats = Number(draft.coachPaysSeats || 0);
								termsAcceptedAt = draft.termsAcceptedAt || "";
								termsVersion = draft.termsVersion || "";
								if (Array.isArray(draft.playerPayers)) {
									playerPayers = draft.playerPayers
										.map((p: any) => ({
											name: String(p?.name ?? "").trim(),
											email: String(p?.email ?? "").trim(),
										}))
										.filter((p: { name: string; email: string }) => p.email.length > 0);
									playerEmails = playerPayers.map((p: { name: string; email: string }) => p.email);
								}
								loadedFromServer = true;
							}
						}
						if (!loadedFromServer) {
							const configStr = localStorage.getItem("team_payment_config");
							if (configStr) {
								const config = JSON.parse(configStr);
								if (String(config?.scopeKey ?? "") !== expectedScope) {
									throw new Error("Payment setup expired. Please re-check payment mode on step 4.");
								}
								paymentMode = config.paymentMode || "coach_pays_all";
								coachPaysSeats = config.coachPaysSeats || 0;
								termsAcceptedAt = config.termsAcceptedAt || "";
								termsVersion = config.termsVersion || "";
								if (config.playerPayers && Array.isArray(config.playerPayers)) {
									playerPayers = config.playerPayers
										.map((p: any) => ({
											name: String(p?.name ?? "").trim(),
											email: String(p?.email ?? "").trim(),
										}))
										.filter((p: { name: string; email: string }) => p.email.length > 0);
									playerEmails = playerPayers.map((p: { name: string; email: string }) => p.email);
								} else if (config.playerEmails && Array.isArray(config.playerEmails)) {
									playerEmails = config.playerEmails.map((p: any) => p.email);
								}
							}
						}
					} catch {}
				}

			const response = await fetch(`${baseUrl}/api/billing/${isTeam ? "team/checkout" : "checkout"}`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					...getAuthHeaders(),
				},
				body: JSON.stringify({
					...(isTeam ? { 
						teamId,
						paymentMode,
						coachPaysSeats,
						termsAcceptedAt,
						termsVersion,
						playerEmails,
						playerPayers
					} : null),
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
			} else if (data.success) {
				// No checkout needed for coach, player invites were sent
				navigate({ to: "/onboarding/success" });
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

	const selectedPlanData = filteredPlans.find((p: any) => p.id === selectedPlan);
	const selectedDisplayPrice =
		selectedPlanData?.billingQuote?.amount ??
		selectedPlanData?.pricing?.monthly?.discounted ??
		selectedPlanData?.pricing?.badge ??
		selectedPlanData?.displayPrice ??
		"";
	const unitPrice = selectedDisplayPrice ? parseMoneyToNumber(String(selectedDisplayPrice)) : null;
	const currencySymbol = selectedDisplayPrice ? detectCurrencySymbol(String(selectedDisplayPrice)) : "£";
	const teamSize = teamCheckout?.maxAthletes ?? null;
	const coachSeatCount =
		isTeam && teamSize != null
			? teamPaymentConfig?.paymentMode === "per_player_all"
				? 0
				: teamPaymentConfig?.paymentMode === "per_player_selected"
					? Math.max(0, Math.min(teamSize, teamPaymentConfig?.coachPaysSeats ?? 0))
					: teamSize
			: null;
	const playerPaysCount =
		isTeam && teamSize != null && coachSeatCount != null ? Math.max(0, teamSize - coachSeatCount) : null;
	const estimatedTotal =
		isTeam && unitPrice != null && coachSeatCount != null ? unitPrice * coachSeatCount : null;

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

				<div className="max-w-3xl mx-auto space-y-3">
					<p className="text-center font-mono text-[10px] uppercase tracking-wider text-foreground/40">
						Program Filter
					</p>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<button
							type="button"
							onClick={() => setProgramFilter("standard")}
							className={cn(
								"border p-3 text-left transition-all",
								programFilter === "standard"
									? "border-foreground bg-foreground/[0.04]"
									: "border-foreground/[0.06] hover:border-foreground/20",
							)}
						>
							<p className="font-mono text-xs uppercase tracking-wider">Standard</p>
							<p className="text-[11px] text-muted-foreground mt-1">All non-weekly programs</p>
						</button>
						<button
							type="button"
							onClick={() => setProgramFilter("weekly")}
							className={cn(
								"border p-3 text-left transition-all",
								programFilter === "weekly"
									? "border-foreground bg-foreground/[0.04]"
									: "border-foreground/[0.06] hover:border-foreground/20",
							)}
						>
							<p className="font-mono text-xs uppercase tracking-wider">Weekly</p>
							<p className="text-[11px] text-muted-foreground mt-1">Only weekly programs</p>
						</button>
					</div>
					{filteredPlans.length === 0 ? (
						<p className="text-center text-xs text-muted-foreground">
							No {programFilter === "weekly" ? "weekly" : "standard"} plans for this billing cycle.
						</p>
					) : null}
				</div>

				{isTeam && (
					<Card className="max-w-3xl mx-auto border border-foreground/[0.06] p-6">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
								Team Pricing
							</Badge>
							<p className="text-xs text-muted-foreground">
								Total = <span className="font-medium text-foreground">plan price x coach-paid seats</span>
							</p>
						</div>
						<Separator className="my-4 bg-foreground/[0.06]" />
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
							<div className="border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3">
								<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Team</p>
								<p className="mt-1 text-sm font-medium truncate">{teamCheckout?.teamName ?? "Your team"}</p>
							</div>
							<div className="border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3">
								<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Athletes</p>
								<p className="mt-1 text-sm font-medium">{teamSize ?? "—"}</p>
							</div>
							<div className="border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3">
								<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Players Self-Pay</p>
								<p className="mt-1 text-sm font-medium">{playerPaysCount ?? "—"}</p>
							</div>
							<div className="border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3">
								<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Coach Pays</p>
								<p className="mt-1 text-sm font-medium">{coachSeatCount ?? "—"}</p>
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

				{programFilter !== "weekly" ? (
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
								const supported = plans.some((p) => planSupportsBillingCycle(p, opt.id));
								const savings =
									opt.id === "yearly" ? "Save up to 20%" : opt.id === "six_months" ? "Save up to 10%" : null;
								return (
									<button
										key={opt.id}
										type="button"
										role="radio"
										aria-checked={active}
										disabled={!supported}
										onClick={() => setBillingCycle(opt.id)}
										className={cn(
											"relative border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
											active
												? "border-foreground bg-foreground/[0.04]"
												: "border-foreground/[0.06] hover:border-foreground/20",
											!supported && "cursor-not-allowed opacity-40",
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
				) : null}

				<div
					role="radiogroup"
					aria-label="Subscription plan"
					className={cn(
						"grid gap-6 transition-opacity",
						isLoading ? "opacity-70" : "opacity-100",
						filteredPlans.length >= 4
							? "md:grid-cols-2 lg:grid-cols-4"
							: filteredPlans.length === 3
								? "md:grid-cols-3"
								: "md:grid-cols-2",
					)}
				>
					{filteredPlans.map((plan: any) => {
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

						const selectPlan = () => {
							setSelectedPlan(plan.id);
							if (planSupportsBillingCycle(plan, billingCycle)) return;
							const next = firstSupportedCycleForPlan(plan);
							if (next && next !== billingCycle) setBillingCycle(next);
						};

						return (
							<Card
								key={plan.id}
								role="radio"
								aria-checked={isSelected}
								tabIndex={0}
								onClick={selectPlan}
								onKeyDown={(e) => {
									if (e.key === " " || e.key === "Enter") {
										e.preventDefault();
										selectPlan();
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
													{planBillingLabel(plan, billingCycle)}
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

				<div className="max-w-2xl mx-auto space-y-6">
					<Card className="border border-foreground/[0.06] bg-foreground/[0.02] overflow-hidden">
						<div className="p-4 border-b border-foreground/[0.06] bg-foreground/[0.04]">
							<h3 className="font-mono text-[10px] uppercase tracking-wider text-foreground font-bold">
								PH Performance – Terms & Policies
							</h3>
						</div>
						<div className="p-6 max-h-[250px] overflow-y-auto space-y-6 text-[11px] text-muted-foreground leading-relaxed font-mono custom-scrollbar">
							<section className="space-y-2">
								<p className="text-foreground font-bold italic">Please read carefully before signing up. By completing registration and payment, you confirm that you have read, understood, and agreed to the following terms.</p>
							</section>

							<section className="space-y-4">
								<h4 className="text-foreground font-bold uppercase tracking-tight text-xs">IN-PERSON SESSIONS</h4>
								<div className="space-y-3">
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">Membership & Payments</p>
										<p>All clients are enrolled on a monthly payment plan. Payments are fixed monthly regardless of whether there are 4 or 5 sessions. Your membership covers 48 sessions per year. Your payment secures your coaching slot, not attendance. All payments are strictly non-refundable.</p>
									</div>
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">Coach Availability</p>
										<p>PH Performance operates across 48 weeks of the year. Monthly payments remain unchanged during this time.</p>
									</div>
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">Cancellations & Missed Sessions</p>
										<p>24 hours notice required for cancellations. Missed sessions: - Not carried over - Not credited - Not refunded. Make-up sessions not guaranteed. Repeated missed sessions may result in loss of place.</p>
									</div>
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">Membership Cancellation</p>
										<p>Minimum 1 month written notice required. Payments continue during notice period. No partial refunds issued.</p>
									</div>
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">Health & Responsibility</p>
										<p>Clients must disclose injuries. PH Performance not liable for undisclosed conditions or misuse.</p>
									</div>
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">Code of Conduct</p>
										<p>Respect, punctuality and effort required. Failure may result in removal.</p>
									</div>
								</div>
							</section>

							<section className="space-y-4 pt-4 border-t border-foreground/[0.06]">
								<h4 className="text-foreground font-bold uppercase tracking-tight text-xs">APP USERS</h4>
								<div className="space-y-3">
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">Subscription & Payments</p>
										<p>App memberships are billed monthly. All payments are strictly non-refundable. This includes unused programmes, lack of engagement, and cancellations. Payment provides access, not guaranteed results.</p>
									</div>
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">Access & Account Responsibility</p>
										<p>App is for personal use only. Login sharing prohibited. PH Performance may remove access without refund if misuse occurs.</p>
									</div>
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">Programme Use & Responsibility</p>
										<p>Users must follow programmes as instructed. PH Performance not liable for: - Incorrect execution Failure to follow guidance - Misuse of training programmes</p>
									</div>
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">Results Disclaimer</p>
										<p>Results are not guaranteed. They depend on effort, consistency, and lifestyle. Lack of results does not qualify for refund.</p>
									</div>
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">Health & Medical Responsibility</p>
										<p>Users must disclose injuries and confirm fitness to train. PH Performance not liable for: Undisclosed conditions - Training against medical advice</p>
									</div>
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">App Features & Availability</p>
										<p>Features may change at any time. PH Performance not liable for downtime or technical issues.</p>
									</div>
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">Communication & Support</p>
										<p>Support depends on membership tier. Response times not guaranteed.</p>
									</div>
									<div>
										<p className="text-foreground/80 font-bold underline mb-1">Termination of Access</p>
										<p>Access may be removed for misuse or breach of terms. No refunds issued.</p>
									</div>
								</div>
							</section>

							<section className="pt-4 border-t border-foreground/[0.06]">
								<p className="text-foreground font-bold">Final Agreement</p>
								<p>By signing up, you confirm agreement to all terms. This forms a binding agreement.</p>
							</section>
						</div>
					</Card>

					<div className="flex items-start space-x-3 p-2">
						<Checkbox 
							id="terms" 
							checked={agreedToTerms} 
							onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
							className="mt-1 border-foreground/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
						/>
						<div className="grid gap-1.5 leading-none">
							<Label
								htmlFor="terms"
								className="text-[11px] font-mono uppercase tracking-wider text-foreground/70 cursor-pointer select-none"
							>
								I have read and agree to the PH Performance Terms & Policies
							</Label>
							<p className="text-[10px] text-muted-foreground font-mono">
								You must agree to the terms to continue to payment.
							</p>
						</div>
					</div>
				</div>

				<div className="flex flex-col items-center gap-6 pt-4 max-w-md mx-auto">
					<Button
						onClick={handlePayment}
						disabled={isSubmitting || selectedPlan == null || isLoading || !agreedToTerms}
						className="w-full h-10 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
