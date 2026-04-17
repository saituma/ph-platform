import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
	Check,
	CircleNotch,
	Crown,
	Star,
	TrendUp,
	ArrowRight,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { toast } from "sonner";
import { env } from "#/env";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/onboarding/step-5")({
	component: OnboardingStep5,
});

const PLANS = [
	{
		id: "basic",
		name: "Essential",
		price: "29",
		description: "Perfect for youth athletes starting their performance journey.",
		features: [
			"Core Performance Training",
			"Mobile App Access",
			"Progress Tracking",
			"Basic Nutrition Guide",
		],
		accent: "primary",
		icon: TrendUp,
	},
	{
		id: "pro",
		name: "Elite Pro",
		price: "59",
		description: "Comprehensive coaching with personalized targets and analytics.",
		features: [
			"Everything in Essential",
			"Personalized Performance Goals",
			"Advanced Analytics",
			"Priority Coach Support",
			"Custom Meal Plans",
		],
		accent: "primary",
		popular: true,
		icon: Star,
	},
	{
		id: "premium",
		name: "Grandmaster",
		price: "99",
		description: "The ultimate 1-on-1 experience for serious competitors.",
		features: [
			"Everything in Elite Pro",
			"Monthly 1-on-1 Video Review",
			"Custom Recovery Protocols",
			"Elite Mental Coaching",
			"Family Account Access",
		],
		accent: "primary",
		icon: Crown,
	},
] as const;

function OnboardingStep5() {
	const [plans, setPlans] = useState<any[]>([]);
	const [selectedPlan, setSelectedPlan] = useState<string>("");
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchPlans = async () => {
			try {
				const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
				const response = await fetch(`${baseUrl}/api/onboarding/config`);
				if (!response.ok) throw new Error("Failed to fetch plans");
				const data = await response.json();
				
				// Assuming the config returns the plans/tiers
				// If not in config, we might need a separate endpoint
				// For now, let's try to get them from config or use a dedicated endpoint if available
				const plansResponse = await fetch(`${baseUrl}/api/billing/plans`);
				if (plansResponse.ok) {
					const plansData = await plansResponse.json();
					setPlans(plansData.plans || []);
					if (plansData.plans?.length > 0) {
						setSelectedPlan(plansData.plans[0].tier);
					}
				}
			} catch (error) {
				console.error("Error fetching plans:", error);
				toast.error("Error", { description: "Could not load subscription plans." });
			} finally {
				setIsLoading(false);
			}
		};

		fetchPlans();
	}, []);

	const handlePayment = async () => {
		if (!selectedPlan) return;
		setIsSubmitting(true);
		try {
			toast.success("Redirecting to Checkout", {
				description: `Preparing your subscription...`,
			});
			
			setTimeout(() => {
				setIsSubmitting(false);
			}, 2000);
		} catch (error) {
			toast.error("Checkout failed", { description: "Please try again later." });
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex h-[60vh] items-center justify-center">
				<CircleNotch className="w-10 h-10 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
			<section className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-4 text-center">
					<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
						Step 5 of 5
					</p>
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl leading-[1.1]">
						Choose Your <span className="text-primary">Plan</span>
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
						Unlock your full potential with elite performance coaching tailored to your goals.
					</p>
				</div>

				<div className={cn(
					"grid gap-8",
					plans.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : 
					plans.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
				)}>
					{plans.map((plan) => {
						const isSelected = selectedPlan === plan.tier;
						const monthlyPrice = plan.pricing?.monthly?.discounted || plan.displayPrice;
						
						return (
							<Card 
								key={plan.id}
								onClick={() => setSelectedPlan(plan.tier)}
								className={cn(
									"relative cursor-pointer transition-all duration-300 p-8 flex flex-col h-full rounded-[2.5rem] border-2",
									isSelected 
										? "border-primary bg-primary/[0.03] shadow-2xl scale-[1.02] ring-4 ring-primary/5" 
										: "border-border/60 bg-card/40 hover:border-primary/40"
								)}
							>
								<div className="space-y-6 flex-1">
									<div className="flex items-center justify-between">
										<div className={cn(
											"p-3 rounded-2xl",
											isSelected ? "bg-primary text-primary-foreground" : "bg-accent/50 text-primary"
										)}>
											{plan.tier.includes("Plus") ? <Crown size={28} weight="bold" /> : 
											 plan.tier.includes("Premium") ? <Star size={28} weight="bold" /> : 
											 <TrendUp size={28} weight="bold" />}
										</div>
										{isSelected && (
											<div className="bg-primary rounded-full p-1 shadow-md">
												<Check size={16} weight="bold" className="text-primary-foreground" />
											</div>
										)}
									</div>

									<div className="space-y-1">
										<h3 className="text-2xl font-black leading-tight">{plan.name}</h3>
										<p className="text-[10px] uppercase tracking-widest font-bold text-primary/60">
											{plan.tier.replace(/_/g, ' ')}
										</p>
									</div>

									<div className="flex items-baseline gap-1">
										<span className="text-4xl font-black text-foreground">{monthlyPrice}</span>
										<span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">/ mo</span>
									</div>

									<div className="space-y-4 pt-4">
										{/* Default features if none provided by API */}
										{(plan.features || [
											"Core Training",
											"App Access",
											"Progress Tracking",
											"Coach Support"
										]).map((feature: string, i: number) => (
											<div key={i} className="flex items-center gap-3">
												<div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
													<Check size={12} weight="bold" className="text-primary" />
												</div>
												<span className="text-sm font-medium text-foreground/80">{feature}</span>
											</div>
										))}
									</div>
								</div>
							</Card>
						);
					})}
				</div>

				<div className="flex flex-col items-center gap-6 pt-4">
					<Button
						onClick={handlePayment}
						disabled={isSubmitting || !selectedPlan}
						className="w-full max-w-md h-16 rounded-[2rem] text-xl font-bold shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
					>
						{isSubmitting ? (
							<CircleNotch className="w-8 h-8 animate-spin text-primary-foreground" />
						) : (
							<>
								Continue to Checkout
								<ArrowRight weight="bold" className="ml-3 w-6 h-6" />
							</>
						)}
					</Button>
					<p className="text-xs text-muted-foreground text-center max-w-md">
						Secure payment powered by Stripe. You can cancel your subscription at any time from your account settings.
					</p>
				</div>
			</section>
		</main>
	);
}
