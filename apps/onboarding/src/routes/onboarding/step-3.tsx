import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
	ArrowLeft,
	ArrowRight,
	CircleNotch,
	Barbell,
	Target,
	Warning,
	Lightning,
	ChartLineUp,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { toast } from "sonner";
import { env } from "#/env";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/onboarding/step-3")({
	component: OnboardingStep3,
});

const PERFORMANCE_GOALS = [
	{ id: "speed", label: "Speed & Agility", icon: Lightning },
	{ id: "strength", label: "Pure Strength", icon: Barbell },
	{ id: "recovery", label: "Recovery & Longevity", icon: ChartLineUp },
	{ id: "weight", label: "Body Composition", icon: Target },
] as const;

function OnboardingStep3() {
	const [trainingPerWeek, setTrainingPerWeek] = useState<number>(3);
	const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
	const [injuries, setInjuries] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isValidating, setIsValidating] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		const email = sessionStorage.getItem("pending_email");
		const token = sessionStorage.getItem("auth_token");

		if (!email || !token) {
			toast.error("Session expired", {
				description: "Please enter your email to continue onboarding.",
			});
			navigate({ to: "/" });
			return;
		}
		setIsValidating(false);
	}, [navigate]);

	const toggleGoal = (goalId: string) => {
		setSelectedGoals((prev) =>
			prev.includes(goalId)
				? prev.filter((id) => id !== goalId)
				: [...prev, goalId],
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		if (selectedGoals.length === 0) {
			toast.error("Please select at least one goal");
			return;
		}

		const token = sessionStorage.getItem("auth_token");
		if (!token) return;

		setIsSubmitting(true);
		try {
			const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
			const response = await fetch(`${baseUrl}/api/onboarding/goals`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					trainingPerWeek,
					performanceGoals: selectedGoals.join(", "),
					injuries: injuries ? { notes: injuries } : null,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to save goals");
			}

			toast.success("Goals saved!", {
				description: "Your training path is being customized.",
			});

			// Navigate to Step 4 when ready
			// navigate({ to: "/onboarding/step-4" });
		} catch (error: any) {
			toast.error("Error", {
				description: error.message || "An unexpected error occurred.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isValidating) return null;

	return (
		<main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
			<section className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-4 text-center">
					<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
						Step 3 of 4
					</p>
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl leading-[1.1]">
						Training & <span className="text-primary">Goals</span>
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
						Let's define what success looks like for you on the PH Platform.
					</p>
				</div>

				<Card className="border-border/60 bg-card/50 backdrop-blur-sm shadow-xl p-8 rounded-3xl ring-1 ring-border/50">
					<form onSubmit={handleSubmit} className="space-y-10">
						<div className="space-y-6">
							<div className="space-y-4">
								<label className="text-sm font-bold text-foreground flex items-center gap-2">
									<Lightning size={18} className="text-primary" />
									Training Frequency (Days per week)
								</label>
								<div className="flex justify-between gap-2">
									{[1, 2, 3, 4, 5, 6, 7].map((num) => (
										<button
											key={num}
											type="button"
											onClick={() => setTrainingPerWeek(num)}
											className={cn(
												"flex-1 h-12 rounded-xl border-2 transition-all font-bold text-sm",
												trainingPerWeek === num
													? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
													: "border-border/60 bg-background/50 text-muted-foreground hover:border-primary/40",
											)}
										>
											{num}
										</button>
									))}
								</div>
							</div>

							<div className="space-y-4">
								<label className="text-sm font-bold text-foreground flex items-center gap-2">
									<Target size={18} className="text-primary" />
									Your Primary Goals
								</label>
								<div className="grid grid-cols-2 gap-3">
									{PERFORMANCE_GOALS.map((goal) => {
										const Icon = goal.icon;
										const isSelected = selectedGoals.includes(goal.id);
										return (
											<button
												key={goal.id}
												type="button"
												onClick={() => toggleGoal(goal.id)}
												className={cn(
													"flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left group",
													isSelected
														? "border-primary bg-primary/5 text-primary shadow-sm"
														: "border-border/60 bg-background/50 text-muted-foreground hover:border-primary/40",
												)}
											>
												<Icon
													size={20}
													weight={isSelected ? "bold" : "regular"}
													className={cn(
														"transition-colors",
														isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary/60",
													)}
												/>
												<span className="text-sm font-bold">{goal.label}</span>
											</button>
										);
									})}
								</div>
							</div>

							<div className="space-y-3">
								<label
									htmlFor="injuries"
									className="text-sm font-bold text-foreground flex items-center gap-2"
								>
									<Warning size={18} className="text-primary" />
									Any past injuries? (Optional)
								</label>
								<textarea
									id="injuries"
									placeholder="e.g. Previous ACL surgery, recurring hamstring issues..."
									value={injuries}
									onChange={(e) => setInjuries(e.target.value)}
									className="w-full min-h-[120px] rounded-2xl bg-background/50 border-2 border-border/60 focus:border-primary focus:ring-primary/10 transition-all p-4 text-sm placeholder:text-muted-foreground/50 resize-none outline-none"
								/>
							</div>
						</div>

						<div className="flex flex-col sm:flex-row gap-4 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate({ to: "/onboarding/step-2" })}
								className="flex-1 h-14 rounded-2xl text-lg font-bold border-border/60 hover:bg-accent transition-all"
							>
								<ArrowLeft weight="bold" className="mr-2 w-5 h-5" />
								Back
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting}
								className="flex-[2] h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
							>
								{isSubmitting ? (
									<CircleNotch className="w-6 h-6 animate-spin text-primary-foreground" />
								) : (
									<>
										Continue
										<ArrowRight weight="bold" className="ml-2 w-5 h-5" />
									</>
								)}
							</Button>
						</div>
					</form>
				</Card>
			</section>
		</main>
	);
}
