import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, UserCircle, Users, ArrowRight, CircleNotch } from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { cn } from "#/lib/utils";
import { toast } from "sonner";
import { env } from "#/env";

export const Route = createFileRoute("/onboarding/step-1")({
	component: OnboardingStep1,
});

type UserType = "youth" | "adult" | "team" | null;

const USER_TYPES = [
	{
		id: "youth",
		title: "Youth Athlete",
		description: "Under 18, focused on building a strong athletic foundation.",
		icon: User,
	},
	{
		id: "adult",
		title: "Adult Athlete",
		description: "18+, looking for elite performance or high-level fitness.",
		icon: UserCircle,
	},
	{
		id: "team",
		title: "Team / Club",
		description: "Coaches and organizations managing multiple athletes.",
		icon: Users,
	},
] as const;

function OnboardingStep1() {
	const [selected, setSelected] = useState<UserType>(null);
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

	const handleContinue = async () => {
		if (!selected || isSubmitting) return;

		const email = sessionStorage.getItem("pending_email");
		const token = sessionStorage.getItem("auth_token");

		if (!email || !token) {
			toast.error("Session expired", {
				description: "Please go back and verify your email again.",
			});
			return;
		}

		setIsSubmitting(true);
		try {
			const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
			const response = await fetch(`${baseUrl}/api/auth/onboarding/role`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ email, type: selected }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to save selection");
			}

			toast.success("Preference saved!", {
				description: `You've joined as a ${USER_TYPES.find((t) => t.id === selected)?.title}.`,
			});

			sessionStorage.setItem("user_type", selected as string);
			navigate({ to: "/onboarding/step-2" });
		} catch (error: any) {
			toast.error("Could not save selection", {
				description: error.message || "An unexpected error occurred.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isValidating) return null;

	return (
		<main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
			<section className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-4 text-center">
					<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
						Step 1 of 4
					</p>
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl leading-[1.1]">
						Choose your <span className="text-primary">path</span>
					</h1>
					<p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
						Select the type of account that best describes you to customize your PH Platform experience.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					{USER_TYPES.map((type) => {
						const Icon = type.icon;
						const isSelected = selected === type.id;

						return (
							<button
								key={type.id}
								type="button"
								onClick={() => setSelected(type.id)}
								className="text-left focus:outline-none"
							>
								<Card
									className={cn(
										"h-full transition-all duration-300 border-2 cursor-pointer hover:border-primary/40 group",
										isSelected
											? "border-primary bg-primary/5 shadow-md scale-[1.02]"
											: "border-border/60 bg-card hover:shadow-sm"
									)}
								>
									<div className="flex flex-col h-full gap-4 p-6">
										<div
											className={cn(
												"w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300",
												isSelected
													? "bg-primary text-primary-foreground"
													: "bg-primary/10 text-primary group-hover:bg-primary/20"
											)}
										>
											<Icon size={24} weight={isSelected ? "bold" : "regular"} />
										</div>
										<div className="space-y-2">
											<h3 className="text-xl font-bold text-foreground">
												{type.title}
											</h3>
											<p className="text-sm text-muted-foreground leading-relaxed">
												{type.description}
											</p>
										</div>
									</div>
								</Card>
							</button>
						);
					})}
				</div>

				<div className="flex flex-col items-center pt-8">
					<Button
						onClick={handleContinue}
						disabled={!selected || isSubmitting}
						size="lg"
						className="min-w-[200px] h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
					>
						{isSubmitting ? (
							<CircleNotch className="w-6 h-6 animate-spin" />
						) : (
							<>
								Continue
								<ArrowRight weight="bold" className="ml-2 w-5 h-5" />
							</>
						)}
					</Button>
					<p className="mt-4 text-xs text-muted-foreground">
						You can change this later in your account settings.
					</p>
				</div>
			</section>
		</main>
	);
}
