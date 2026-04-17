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
	Flame,
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
			toast.success("Redirecting to Checkout", {
				description: `Preparing your ${selectedPlan.replace(/_/g, ' ')} subscription...`,
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
				<div className="relative">
					<CircleNotch className="w-12 h-12 animate-spin text-primary" />
					<div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
				</div>
			</div>
		);
	}

	return (
		<main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
			{/* Animated Background Elements */}
			<div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse pointer-events-none" />
			<div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse delay-700 pointer-events-none" />

			<section className="space-y-16 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
				<div className="space-y-6 text-center max-w-3xl mx-auto">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-2">
						<Flame weight="fill" className="text-primary w-4 h-4" />
						<span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
							Elite Performance Awaits
						</span>
					</div>
					<h1 className="text-5xl font-black tracking-tight text-foreground sm:text-7xl leading-[0.9] uppercase italic">
						Elevate Your <span className="text-primary">Game</span>
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed font-medium">
						Stop guessing. Start growing. Join the elite rank of athletes who refuse to settle for average.
					</p>
				</div>

				<div className={cn(
					"grid gap-6",
					plans.length === 4 ? "md:grid-cols-2 xl:grid-cols-4" : 
					plans.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
				)}>
					{plans.map((plan, index) => {
						const isSelected = selectedPlan === plan.tier;
						const monthlyPrice = plan.pricing?.monthly?.discounted || plan.displayPrice;
						
						// Premium mapping for visuals
						const isPlus = plan.tier.includes("Plus");
						const isPremium = plan.tier.includes("Premium") && !isPlus;
						const isPro = plan.tier.includes("Pro");
						const isBasic = !isPlus && !isPremium && !isPro;

						return (
							<div 
								key={plan.id}
								onClick={() => setSelectedPlan(plan.tier)}
								className={cn(
									"group relative flex flex-col h-full transition-all duration-500 cursor-pointer outline-none",
									isSelected ? "scale-[1.03] z-20" : "scale-100 hover:scale-[1.01] opacity-90 hover:opacity-100"
								)}
							>
								{/* Card Glow/Shadow */}
								<div className={cn(
									"absolute -inset-1 rounded-[3rem] blur-2xl transition-opacity duration-500 pointer-events-none opacity-0 group-hover:opacity-40",
									isSelected && "opacity-60",
									isPlus ? "bg-primary" : isPremium ? "bg-primary/80" : "bg-primary/40"
								)} />

								<Card className={cn(
									"relative flex-1 p-8 flex flex-col rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden backdrop-blur-xl",
									isSelected 
										? "border-primary bg-card/90 shadow-2xl ring-8 ring-primary/5" 
										: "border-border/40 bg-card/40 hover:border-primary/30"
								)}>
									{/* Interior Liquid Effect */}
									{isSelected && (
										<div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary/10 rounded-full blur-[60px] animate-pulse" />
									)}

									<div className="space-y-8 flex-1 relative z-10">
										{/* Header */}
										<div className="flex items-start justify-between">
											<div className={cn(
												"p-4 rounded-2xl transition-all duration-500 transform group-hover:rotate-6",
												isSelected ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-primary/10 text-primary"
											)}>
												{isPlus ? <Crown size={32} weight="bold" /> : 
												 isPremium ? <Trophy size={32} weight="bold" /> : 
												 isPro ? <Star size={32} weight="bold" /> : 
												 <TrendUp size={32} weight="bold" />}
											</div>
											
											{isPlus && (
												<div className="bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full shadow-md animate-bounce">
													Ultimate
												</div>
											)}
											{(isPremium || isPro) && isSelected && (
												<div className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full">
													Most Popular
												</div>
											)}
										</div>

										{/* Name & Tier */}
										<div className="space-y-1">
											<h3 className="text-3xl font-black leading-[0.8] uppercase italic group-hover:text-primary transition-colors">
												{plan.name.split(' ').map((word: string, i: number) => (
													<span key={i} className="block">{word}</span>
												))}
											</h3>
											<p className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground opacity-60">
												{plan.tier.replace(/_/g, ' ')}
											</p>
										</div>

										{/* Pricing */}
										<div className="flex items-baseline gap-2 py-2 border-y border-border/20">
											<span className="text-5xl font-black text-foreground tracking-tighter italic">
												{monthlyPrice.replace(/[^\d]/g, '')}
											</span>
											<div className="flex flex-col">
												<span className="text-xl font-black text-primary italic leading-none">$</span>
												<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">/mo</span>
											</div>
										</div>

										{/* Features */}
										<div className="space-y-5 flex-1">
											<p className="text-[10px] font-black uppercase tracking-widest text-primary/80 mb-2">Included Features</p>
											{(plan.features || [
												"Elite Training Protocols",
												"24/7 Mobile App Access",
												"Performance Analytics",
												"Expert Coach Support"
											]).map((feature: string, i: number) => (
												<div key={i} className="flex items-start gap-3 group/item">
													<div className={cn(
														"mt-1 h-5 w-5 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300",
														isSelected ? "bg-primary/20" : "bg-primary/5 group-hover/item:bg-primary/10"
													)}>
														<Check size={12} weight="bold" className="text-primary" />
													</div>
													<span className="text-[13px] font-bold text-foreground/80 group-hover/item:text-foreground transition-colors leading-tight">
														{feature}
													</span>
												</div>
											))}
										</div>
									</div>

									{/* Bottom Selection Indicator */}
									<div className={cn(
										"mt-8 w-full h-1.5 rounded-full transition-all duration-500",
										isSelected ? "bg-primary scale-x-100" : "bg-border/40 scale-x-50 group-hover:scale-x-75 group-hover:bg-primary/30"
									)} />
								</Card>
							</div>
						);
					})}
				</div>

				{/* Final Checkout Action */}
				<div className="flex flex-col items-center gap-8 pt-8 max-w-2xl mx-auto">
					<div className="w-full relative group">
						<div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary/60 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
						<Button
							onClick={handlePayment}
							disabled={isSubmitting || !selectedPlan}
							className="relative w-full h-20 rounded-[2.5rem] text-2xl font-black uppercase italic shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-4"
						>
							{isSubmitting ? (
								<CircleNotch className="w-8 h-8 animate-spin text-primary-foreground" />
							) : (
								<>
									Secure My Spot
									<Lightning weight="fill" className="w-6 h-6 animate-pulse" />
								</>
							)}
						</Button>
					</div>
					
					<div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
						<div className="flex items-center gap-2 text-muted-foreground">
							<ShieldCheck size={18} className="text-primary" />
							<span className="text-[10px] font-bold uppercase tracking-widest">Encrypted Payment</span>
						</div>
						<div className="flex items-center gap-2 text-muted-foreground">
							<Check size={18} className="text-primary" />
							<span className="text-[10px] font-bold uppercase tracking-widest">Cancel Anytime</span>
						</div>
					</div>

					<p className="text-[10px] text-muted-foreground text-center max-w-md font-medium leading-relaxed opacity-60">
						Payments processed via Stripe. By subscribing, you agree to our Terms of Service and Privacy Policy. All plans are billed monthly.
					</p>
				</div>
			</section>
		</main>
	);
}
