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
import { toast } from "sonner";
import { config } from "#/lib/config";
import { cn } from "#/lib/utils";

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

function planCardTitle(plan: { tier: string }) {
	const meta = TIER_METADATA[plan.tier];
	if (meta?.cardTitle) return meta.cardTitle;
	return plan.tier;
}

function formatTierLine(tier: string) {
	const meta = TIER_METADATA[tier];
	if (meta) return meta.tierLine;
	return tier.replace(/^PHP_?/i, "").replace(/_/g, " ").trim() || tier;
}

function dedupePlansByTier(plans: any[]) {
	const best = new Map<string, any>();
	for (const p of plans) {
		const tier = p.tier as string;
		const cur = best.get(tier);
		if (!cur || Number(p.id) > Number(cur.id)) best.set(tier, p);
	}
	return [...best.values()];
}

function priceSuffix(cycle: BillingCycle) {
	if (cycle === "monthly") return "per month";
	if (cycle === "six_months") return "for 6 months";
	return "for 1 year";
}

function OnboardingStep5() {
	const [plans, setPlans] = useState<any[]>([]);
	const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
	const [selectedPlan, setSelectedPlan] = useState<string>("");
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
			const response = await fetch(`${baseUrl}/api/billing/plans?${params.toString()}`);
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
						if (prev && activePlans.some((p: any) => p.tier === prev)) return prev;
						const preferred =
							activePlans.find((p: any) => p.tier === "PHP_Premium") ?? activePlans[0];
						return preferred.tier;
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
		if (!selectedPlan) return;
		const selectedPlanData = plans.find((p) => p.tier === selectedPlan);
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
			<div className="flex h-[60vh] items-center justify-center">
				<CircleNotch className="w-10 h-10 animate-spin text-primary" />
			</div>
		);
	}

	if (!plans.length && !isLoading) {
		return (
			<main className="mx-auto max-w-lg px-4 py-16 text-center">
				<p className="text-sm font-bold uppercase tracking-widest text-primary">Plans</p>
				<h1 className="mt-2 text-2xl font-black tracking-tight">No plans available</h1>
				<p className="mt-2 text-muted-foreground">
					Subscription plans are not configured yet. Please try again later or contact support.
				</p>
			</main>
		);
	}

	const selectedPlanData = plans.find((p) => p.tier === selectedPlan);
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
					<p className="text-sm font-bold uppercase tracking-widest text-primary">
						Final Step
					</p>
					<h1 className="text-4xl font-black tracking-tight text-foreground sm:text-6xl uppercase italic">
						Choose Your <span className="text-primary">Plan</span>
					</h1>
					<p className="text-lg text-muted-foreground font-medium">
						Pick how you want to pay, then select the tier that fits your goals.
					</p>
				</div>

				{isTeam && (
					<div className="max-w-3xl mx-auto rounded-3xl border border-primary/20 bg-primary/5 p-6">
						<p className="text-xs font-black uppercase tracking-widest text-primary">Team Pricing</p>
						<p className="mt-2 text-sm text-muted-foreground font-medium">
							Total is calculated as <span className="font-black text-foreground">plan price × athletes</span>.
						</p>
						<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
							<div className="rounded-2xl border border-border/60 bg-background/50 px-4 py-3">
								<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Team</p>
								<p className="mt-1 text-sm font-bold">{teamCheckout?.teamName ?? "Your team"}</p>
							</div>
							<div className="rounded-2xl border border-border/60 bg-background/50 px-4 py-3">
								<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Athletes</p>
								<p className="mt-1 text-sm font-bold">{teamSize ?? "—"}</p>
							</div>
							<div className="rounded-2xl border border-border/60 bg-background/50 px-4 py-3">
								<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estimated Total</p>
								<p className="mt-1 text-sm font-bold">
									{estimatedTotal == null ? "Select a plan" : formatMoney(currencySymbol, estimatedTotal)}
								</p>
							</div>
						</div>
						{!teamCheckout?.teamId && (
							<p className="mt-3 text-xs font-semibold text-destructive">
								Missing team id. Go back to Step 2 and re-submit team details.
							</p>
						)}
					</div>
				)}

				<div className="max-w-3xl mx-auto space-y-3">
					<p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
						Billing
					</p>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						{BILLING_OPTIONS.map((opt) => {
							const active = billingCycle === opt.id;
							return (
								<button
									key={opt.id}
									type="button"
									onClick={() => setBillingCycle(opt.id)}
									className={cn(
										"rounded-2xl border-2 p-4 text-left transition-all",
										active
											? "border-primary bg-primary/[0.06] shadow-md ring-2 ring-primary/10"
											: "border-border/60 bg-card/40 hover:border-primary/30",
									)}
								>
									<p className="text-sm font-black uppercase tracking-tight">{opt.title}</p>
									<p className="text-[11px] font-semibold text-muted-foreground mt-1">
										{opt.description}
									</p>
								</button>
							);
						})}
					</div>
				</div>

				{isLoading ? (
					<div className="flex justify-center py-8">
						<CircleNotch className="w-8 h-8 animate-spin text-primary" />
					</div>
				) : null}

				<div
					className={cn(
						"grid gap-6 transition-opacity",
						isLoading ? "opacity-50 pointer-events-none" : "opacity-100",
						plans.length >= 4 ? "md:grid-cols-2 lg:grid-cols-4" : plans.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2",
					)}
				>
					{plans.map((plan) => {
						const isSelected = selectedPlan === plan.tier;
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
								onClick={() => setSelectedPlan(plan.tier)}
								className={cn(
									"relative p-5 sm:p-8 flex flex-col h-full rounded-3xl border-2 transition-all duration-300 cursor-pointer",
									isSelected
										? "border-primary bg-primary/[0.02] shadow-xl ring-4 ring-primary/5 scale-[1.02]"
										: "border-border/60 bg-card/50 hover:border-primary/40",
								)}
							>
								<div className="space-y-6 flex-1">
									<div className="flex items-center justify-between">
										<div
											className={cn(
												"p-3 rounded-2xl",
												isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
											)}
										>
											<Icon size={28} weight="bold" />
										</div>
										{isSelected && <Check size={20} weight="bold" className="text-primary" />}
									</div>

									<div className="space-y-1">
										<h3 className="text-2xl font-black uppercase tracking-tight leading-none">{title}</h3>
										<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
											{formatTierLine(plan.tier)}
										</p>
									</div>

									<div className="flex flex-col gap-1 py-2 border-y border-border/20">
										<div className="flex items-baseline gap-2 flex-wrap">
											<span className="text-4xl font-black text-foreground">{displayPrice}</span>
										</div>
										<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
											{priceSuffix(billingCycle)}
											{billingCycle === "monthly" ? " · subscription" : " · one-time"}
										</span>
									</div>

									<div className="space-y-4 flex-1">
										{featureList.map((feature: string, i: number) => (
											<div key={i} className="flex items-start gap-3">
												<Check size={14} weight="bold" className="text-primary mt-0.5 shrink-0" />
												<span className="text-[13px] font-bold text-foreground/80 leading-tight">
													{feature}
												</span>
											</div>
										))}
									</div>
								</div>
							</Card>
						);
					})}
				</div>

				<div className="flex flex-col items-center gap-6 pt-4 max-w-md mx-auto">
					<Button
						onClick={handlePayment}
						disabled={isSubmitting || !selectedPlan || isLoading}
						className="w-full h-16 rounded-2xl text-xl font-black uppercase italic shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
					>
						{isSubmitting ? (
							<CircleNotch className="w-8 h-8 animate-spin text-primary-foreground" />
						) : (
							<>
								Continue to Payment
								<Lightning weight="fill" className="w-6 h-6" />
							</>
						)}
					</Button>

					<div className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground">
						<div className="flex items-center gap-2">
							<ShieldCheck size={18} className="text-primary" />
							<span className="text-[10px] font-bold uppercase tracking-widest">Secure Checkout</span>
						</div>
						{billingCycle === "monthly" ? (
							<div className="flex items-center gap-2">
								<Check size={18} className="text-primary" />
								<span className="text-[10px] font-bold uppercase tracking-widest">Cancel Anytime</span>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<Check size={18} className="text-primary" />
								<span className="text-[10px] font-bold uppercase tracking-widest">Single payment</span>
							</div>
						)}
					</div>
				</div>
			</section>
		</main>
	);
}
