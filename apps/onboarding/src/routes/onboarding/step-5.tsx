import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
	Check,
	CircleNotch,
	Crown,
	Star,
	TrendUp,
	ArrowRight,
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
				const response = await fetch(`${baseUrl}/api/billing/plans`);
				if (response.ok) {
					const data = await response.json();
					setPlans(data.plans || []);
					if (data.plans?.length > 0) {
						// Default to the second plan (usually Pro) or the first
						setSelectedPlan(data.plans[1]?.tier || data.plans[0].tier);
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
			const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
			const token = sessionStorage.getItem("auth_token");
			
			const response = await fetch(`${baseUrl}/api/billing/create-checkout`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					tier: selectedPlan,
					successUrl: `${window.location.origin}/onboarding/success`,
					cancelUrl: window.location.href,
				}),
			});

			const data = await response.json();
			if (data.url) {
				window.location.href = data.url;
			} else {
				throw new Error(data.error || "Failed to create checkout session");
			}
		} catch (error: any) {
			toast.error("Checkout failed", { description: error.message || "Please try again later." });
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
						Select the tier that fits your athletic goals and start your transformation today.
					</p>
				</div>

				<div className={cn(
					"grid gap-6",
					plans.length >= 4 ? "md:grid-cols-2 lg:grid-cols-4" : 
					plans.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
				)}>
					{plans.map((plan) => {
						const isSelected = selectedPlan === plan.tier;
						const displayPrice = plan.pricing?.monthly?.discounted || plan.displayPrice;
						
						const isPlus = plan.tier.includes("Plus");
						const isPremium = plan.tier.includes("Premium") && !isPlus;
						const isPro = plan.tier.includes("Pro");

						return (
							<Card 
								key={plan.id}
								onClick={() => setSelectedPlan(plan.tier)}
								className={cn(
									"relative p-8 flex flex-col h-full rounded-3xl border-2 transition-all duration-300 cursor-pointer",
									isSelected 
										? "border-primary bg-primary/[0.02] shadow-xl ring-4 ring-primary/5 scale-[1.02]" 
										: "border-border/60 bg-card/50 hover:border-primary/40"
								)}
							>
								<div className="space-y-6 flex-1">
									<div className="flex items-center justify-between">
										<div className={cn(
											"p-3 rounded-2xl",
											isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
										)}>
											{isPlus ? <Crown size={28} weight="bold" /> : 
											 isPremium ? <Trophy size={28} weight="bold" /> : 
											 isPro ? <Star size={28} weight="bold" /> : 
											 <TrendUp size={28} weight="bold" />}
										</div>
										{isSelected && (
											<Check size={20} weight="bold" className="text-primary" />
										)}
									</div>

									<div className="space-y-1">
										<h3 className="text-2xl font-black uppercase tracking-tight leading-none">{plan.name}</h3>
										<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
											{plan.tier.replace(/_/g, ' ')}
										</p>
									</div>

									<div className="flex items-baseline gap-1 py-2 border-y border-border/20">
										<span className="text-4xl font-black text-foreground">{displayPrice}</span>
										<span className="text-xs font-bold text-muted-foreground uppercase">/ mo</span>
									</div>

									<div className="space-y-4 flex-1">
										{(plan.features || [
											"Elite Training Protocols",
											"Mobile App Access",
											"Progress Tracking",
											"Coach Support"
										]).slice(0, 5).map((feature: string, i: number) => (
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
						disabled={isSubmitting || !selectedPlan}
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
					
					<div className="flex items-center gap-6 text-muted-foreground">
						<div className="flex items-center gap-2">
							<ShieldCheck size={18} className="text-primary" />
							<span className="text-[10px] font-bold uppercase tracking-widest">Secure Checkout</span>
						</div>
						<div className="flex items-center gap-2">
							<Check size={18} className="text-primary" />
							<span className="text-[10px] font-bold uppercase tracking-widest">Cancel Anytime</span>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
