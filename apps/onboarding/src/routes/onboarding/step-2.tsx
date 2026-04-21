import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
	ArrowLeft,
	ArrowRight,
	CircleNotch,
	IdentificationCard,
	User,
	Calendar as CalendarIcon,
	SoccerBall,
	TrendUp,
	Hash,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Card } from "#/components/ui/card";
import { toast } from "sonner";
import { env } from "#/env";
import { DatePicker } from "#/components/ui/date-picker";
import { format, differenceInYears } from "date-fns";

export const Route = createFileRoute("/onboarding/step-2")({
	component: OnboardingStep2,
});

function OnboardingStep2() {
	const [userType, setUserType] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		// Youth fields
		guardianName: "",
		athleteName: "",
		age: "",
		// Adult fields
		name: "",
		// Team fields
		teamName: "",
		minAge: "",
		maxAge: "",
		maxAthletes: "",
	});
	const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
	const [ageError, setAgeError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isValidating, setIsValidating] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		if (userType === "youth" && birthDate) {
			const age = differenceInYears(new Date(), birthDate);
			if (age < 7 || age > 18) {
				setAgeError("Youth athletes must be between 7 and 18 years old.");
			} else {
				setAgeError(null);
			}
		} else {
			setAgeError(null);
		}
	}, [birthDate, userType]);

	useEffect(() => {
		const email = localStorage.getItem("pending_email");
		const token = localStorage.getItem("auth_token");
		const type = localStorage.getItem("user_type");

		if (!email || !token || !type) {
			toast.error("Session expired", {
				description: "Please enter your email to continue onboarding.",
			});
			navigate({ to: "/" });
			return;
		}

		setUserType(type);
		setIsValidating(false);
	}, [navigate]);

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		const token = localStorage.getItem("auth_token");
		const email = localStorage.getItem("pending_email");

		if (!token || !email) {
			toast.error("Session expired", {
				description: "Please go back and verify your email again.",
			});
			return;
		}

		setIsSubmitting(true);
		try {
			const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
			let endpoint = "";
			let body = {};

			if (userType === "youth") {
				if (!formData.guardianName || !formData.athleteName || !birthDate) {
					throw new Error("Please fill in all fields");
				}

				const age = differenceInYears(new Date(), birthDate);
				if (age < 7 || age > 18) {
					throw new Error("Youth athletes must be between 7 and 18 years old.");
				}

				endpoint = "/api/onboarding/youth-basic";
				body = {
					guardianName: formData.guardianName,
					athleteName: formData.athleteName,
					birthDate: format(birthDate, "yyyy-MM-dd"),
				};
			} else if (userType === "adult") {
				if (!formData.name || !birthDate) {
					throw new Error("Please fill in all fields");
				}
				endpoint = "/api/onboarding/adult-basic";
				body = {
					name: formData.name,
					birthDate: format(birthDate, "yyyy-MM-dd"),
				};
			} else if (userType === "team") {
				const minAge = Number(formData.minAge);
				const maxAge = Number(formData.maxAge);
				const maxAthletes = Number(formData.maxAthletes);

				if (!formData.teamName || !formData.minAge || !formData.maxAge || !formData.maxAthletes) {
					throw new Error("Please fill in all fields");
				}
				if (minAge > maxAge) {
					throw new Error("Min age cannot be greater than Max age");
				}
				endpoint = "/api/onboarding/team-basic";
				body = {
					name: formData.teamName,
					minAge,
					maxAge,
					maxAthletes,
				};
			} else {
				throw new Error("Invalid user type");
			}

			const response = await fetch(`${baseUrl}${endpoint}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					email,
					...body,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to save details");
			}

			toast.success("Profile updated!", {
				description: `Welcome to the platform, ${
					userType === "youth"
						? formData.athleteName
						: userType === "team"
							? formData.teamName
							: formData.name
				}.`,
			});

			navigate({ to: "/onboarding/step-3" });
		} catch (error: any) {
			toast.error("Error", {
				description: error.message || "An unexpected error occurred.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isValidating || !userType) return null;

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
						{userType === "youth"
							? "Tell us about yourself and the athlete you're signing up."
							: userType === "team"
								? "Tell us about your team or club."
								: "Tell us a bit more about yourself to get started."}
					</p>
				</div>

				<Card className="border-border/60 bg-card/50 backdrop-blur-sm shadow-xl p-8 rounded-3xl ring-1 ring-border/50">
					<form onSubmit={handleSubmit} className="space-y-8">
						<div className="space-y-6">
							{userType === "youth" ? (
								<>
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
											onChange={(e) =>
												handleInputChange("guardianName", e.target.value)
											}
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
											onChange={(e) =>
												handleInputChange("athleteName", e.target.value)
											}
											required
											className="h-14 rounded-2xl bg-background/50 border-border/60 focus:ring-primary/20 focus:border-primary px-6"
										/>
									</div>

									<div className="space-y-2">
										<label
											htmlFor="birthDate"
											className="text-sm font-bold text-foreground flex items-center gap-2"
										>
											<CalendarIcon size={18} className="text-primary" />
											Athlete's Birth Date
										</label>
										<DatePicker
											date={birthDate}
											setDate={setBirthDate}
											placeholder="Select athlete's birth date"
											fromYear={new Date().getFullYear() - 100}
											toYear={new Date().getFullYear()}
										/>
										{ageError && (
											<p className="text-xs font-semibold text-destructive animate-in fade-in slide-in-from-top-1">
												{ageError}
											</p>
										)}
									</div>
								</>
							) : userType === "team" ? (
								<>
									<div className="space-y-2">
										<label
											htmlFor="teamName"
											className="text-sm font-bold text-foreground flex items-center gap-2"
										>
											<SoccerBall size={18} className="text-primary" />
											Team / Club Name
										</label>
										<Input
											id="teamName"
											placeholder="Enter team name"
											value={formData.teamName}
											onChange={(e) => handleInputChange("teamName", e.target.value)}
											required
											className="h-14 rounded-2xl bg-background/50 border-border/60 focus:ring-primary/20 focus:border-primary px-6"
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<label
												htmlFor="minAge"
												className="text-sm font-bold text-foreground flex items-center gap-2"
											>
												<TrendUp size={18} className="text-primary" />
												Min Age
											</label>
											<Input
												id="minAge"
												type="number"
												min="5"
												max="99"
												placeholder="e.g. 12"
												value={formData.minAge}
												onChange={(e) => handleInputChange("minAge", e.target.value)}
												required
												className="h-14 rounded-2xl bg-background/50 border-border/60 focus:ring-primary/20 focus:border-primary px-6"
											/>
										</div>
										<div className="space-y-2">
											<label
												htmlFor="maxAge"
												className="text-sm font-bold text-foreground flex items-center gap-2"
											>
												<TrendUp size={18} className="rotate-90 text-primary" />
												Max Age
											</label>
											<Input
												id="maxAge"
												type="number"
												min="5"
												max="99"
												placeholder="e.g. 16"
												value={formData.maxAge}
												onChange={(e) => handleInputChange("maxAge", e.target.value)}
												required
												className="h-14 rounded-2xl bg-background/50 border-border/60 focus:ring-primary/20 focus:border-primary px-6"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label
											htmlFor="maxAthletes"
											className="text-sm font-bold text-foreground flex items-center gap-2"
										>
											<Hash size={18} className="text-primary" />
											Expected Number of Athletes
										</label>
										<Input
											id="maxAthletes"
											type="number"
											min="1"
											placeholder="e.g. 25"
											value={formData.maxAthletes}
											onChange={(e) =>
												handleInputChange("maxAthletes", e.target.value)
											}
											required
											className="h-14 rounded-2xl bg-background/50 border-border/60 focus:ring-primary/20 focus:border-primary px-6"
										/>
									</div>
								</>
							) : (
								<>
									<div className="space-y-2">
										<label
											htmlFor="name"
											className="text-sm font-bold text-foreground flex items-center gap-2"
										>
											<User size={18} className="text-primary" />
											Your Full Name
										</label>
										<Input
											id="name"
											placeholder="Enter your full name"
											value={formData.name}
											onChange={(e) => handleInputChange("name", e.target.value)}
											required
											className="h-14 rounded-2xl bg-background/50 border-border/60 focus:ring-primary/20 focus:border-primary px-6"
										/>
									</div>

									<div className="space-y-2">
										<label
											htmlFor="birthDate"
											className="text-sm font-bold text-foreground flex items-center gap-2"
										>
											<CalendarIcon size={18} className="text-primary" />
											Your Birth Date
										</label>
										<DatePicker
											date={birthDate}
											setDate={setBirthDate}
											placeholder="Select your birth date"
										/>
									</div>
								</>
							)}
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
								disabled={isSubmitting || !!ageError}
								className="flex-[2] h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
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
					{userType === "youth"
						? "We use this information to customize the training programs and ensure age-appropriate coaching content."
						: userType === "team"
							? "Team accounts allow for centralized management and group-based performance tracking."
							: "Your information helps us tailor the training and performance insights to your specific age and physical needs."}
				</p>
			</section>
		</main>
	);
}
