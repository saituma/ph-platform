import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CircleNotch, IdentificationCard, User, Calendar } from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Card } from "#/components/ui/card";
import { toast } from "sonner";
import { env } from "#/env";

export const Route = createFileRoute("/onboarding/step-2")({
	component: OnboardingStep2,
});

function OnboardingStep2() {
	const [formData, setFormData] = useState({
		guardianName: "",
		athleteName: "",
		age: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const navigate = useNavigate();

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		const ageNum = Number(formData.age);
		if (!formData.guardianName || !formData.athleteName || !formData.age) {
			toast.error("Please fill in all fields");
			return;
		}

		if (isNaN(ageNum) || ageNum < 5 || ageNum > 18) {
			toast.error("Invalid age", {
				description: "Youth athletes must be between 5 and 18 years old.",
			});
			return;
		}

		const token = sessionStorage.getItem("auth_token");
		if (!token) {
			toast.error("Session expired", {
				description: "Please go back and verify your email again.",
			});
			return;
		}

		setIsSubmitting(true);
		try {
			const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
			const response = await fetch(`${baseUrl}/api/onboarding/youth-basic`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					guardianName: formData.guardianName,
					athleteName: formData.athleteName,
					age: ageNum,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to save details");
			}

			toast.success("Profile updated!", {
				description: `Setting up the platform for ${formData.athleteName}.`,
			});

			navigate({ to: "/onboarding/step-1" }); // Adjust to next step when ready
		} catch (error: any) {
			toast.error("Could not save details", {
				description: error.message || "An unexpected error occurred.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
			<section className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-4 text-center">
					<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
						Step 2 of 4
					</p>
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl leading-[1.1]">
						Basic <span className="text-primary">Information</span>
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed">
						Tell us about yourself and the athlete you're signing up.
					</p>
				</div>

				<Card className="border-border/60 bg-card/50 backdrop-blur-sm shadow-xl p-8 rounded-3xl ring-1 ring-border/50">
					<form onSubmit={handleSubmit} className="space-y-8">
						<div className="space-y-6">
							<div className="space-y-2">
								<label
									htmlFor="guardianName"
									className="text-sm font-bold text-foreground flex items-center gap-2"
								>
									<IdentificationCard size={18} className="text-primary" />
									Your Full Name (Guardian)
								</label>
								<Input
									id="guardianName"
									placeholder="Enter your name"
									value={formData.guardianName}
									onChange={(e) => handleInputChange("guardianName", e.target.value)}
									required
									className="h-14 rounded-2xl bg-background/50 border-border/60 focus:ring-primary/20 focus:border-primary px-6"
								/>
							</div>

							<div className="space-y-2">
								<label
									htmlFor="athleteName"
									className="text-sm font-bold text-foreground flex items-center gap-2"
								>
									<User size={18} className="text-primary" />
									Athlete's Full Name
								</label>
								<Input
									id="athleteName"
									placeholder="Enter athlete's name"
									value={formData.athleteName}
									onChange={(e) => handleInputChange("athleteName", e.target.value)}
									required
									className="h-14 rounded-2xl bg-background/50 border-border/60 focus:ring-primary/20 focus:border-primary px-6"
								/>
							</div>

							<div className="space-y-2">
								<label
									htmlFor="age"
									className="text-sm font-bold text-foreground flex items-center gap-2"
								>
									<Calendar size={18} className="text-primary" />
									Athlete's Age
								</label>
								<Input
									id="age"
									type="number"
									min="5"
									max="18"
									placeholder="Enter athlete's age (5-18)"
									value={formData.age}
									onChange={(e) => handleInputChange("age", e.target.value)}
									required
									className="h-14 rounded-2xl bg-background/50 border-border/60 focus:ring-primary/20 focus:border-primary px-6"
								/>
							</div>
						</div>

						<div className="flex flex-col sm:flex-row gap-4 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate({ to: "/onboarding/step-1" })}
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

				<p className="text-center text-xs text-muted-foreground max-w-md mx-auto">
					We use this information to customize the training programs and ensure age-appropriate coaching content.
				</p>
			</section>
		</main>
	);
}
