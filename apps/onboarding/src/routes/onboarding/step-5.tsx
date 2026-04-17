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
import { env } from "#/env";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/onboarding/step-5")({
	component: OnboardingStep5,
});

type BillingCycle = "monthly" | "six_months" | "yearly";

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
		title: "6 months upfront",
		description: "One payment",
	},
	{
		id: "yearly",
		title: "Yearly upfront",
		description: "One payment",
	},
];

/** Order matches API tier ladder (see billing downgradePlan). */
const TIER_METADATA: Record<string, { cardTitle: string; tierLine: string; icon: any; order: number }> = {
	PHP: { cardTitle: "Foundation", tierLine: "Entry program", icon: TrendUp, order: 1 },
	PHP_Premium: { cardTitle: "Premium", tierLine: "PHP Premium", icon: Trophy, order: 2 },
	PHP_Premium_Plus: { cardTitle: "Plus", tierLine: "PHP Premium Plus", icon: Crown, order: 3 },
	PHP_Pro: { cardTitle: "PHP Pro", tierLine: "Top tier coaching", icon: Star, order: 4 },
};

/** Legacy DB labels from migration 0051 — prefer structured card titles. */
const LEGACY_NAMES = /^php program$/i;

function planCardTitle(plan: { name?: string | null; tier: string }) {
	const meta = TIER_METADATA[plan.tier];
	const raw = String(plan.name ?? "").trim();
	if (raw && !LEGACY_NAMES.test(raw)) return raw;
	return meta?.cardTitle ?? raw || plan.tier;
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
	return "per year";
}

function OnboardingStep5() {
	const [plans, setPlans] = useState<any[]>([]);
	const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
	const [selectedPlan, setSelectedPlan] = useState<string>("");
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const loadPlans = useCallback(async () => {
		setIsLoading(true);
		try {
			const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
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

	const handlePayment = async () => {
		if (!selectedPlan) return;
		const selectedPlanData = plans.find((p) => p.tier === selectedPlan);
		if (!selectedPlanData?.id) {
			toast.error("Checkout failed", { description: "Selected plan is not available." });
			return;
		}
		setIsSubmitting(true);
		try {
			const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
			const token = sessionStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Your session expired. Sign in again to continue.");
			}

			const response = await fetch(`${baseUrl}/api/billing/checkout`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
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

	return (
		<main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
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
							plan.billingQuote?.amount ??
							plan.pricing?.monthly?.discounted ??
							plan.pricing?.badge ??
							plan.displayPrice ??
							"—";
						const meta = TIER_METADATA[plan.tier] ?? {
							cardTitle: String(plan.name || "Plan").trim() || "Plan",
							tierLine: plan.tier,
							icon: TrendUp,
							order: 99,
						};
						const Icon = meta.icon;
						const title = planCardTitle(plan);

						return (
							<Card
								key={plan.id}
								onClick={() => setSelectedPlan(plan.tier)}
								className={cn(
									"relative p-8 flex flex-col h-full rounded-3xl border-2 transition-all duration-300 cursor-pointer",
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
										{(plan.features || [
											"Elite Training Protocols",
											"Mobile App Access",
											"Progress Tracking",
											"Coach Support",
										])
											.slice(0, 5)
											.map((feature: string, i: number) => (
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
