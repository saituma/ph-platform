import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
	Baby,
	PersonSimpleRun,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Card } from "#/components/ui/card";
import { cn } from "#/lib/utils";
import { toast } from "sonner";
import { config } from "#/lib/config";
import { getAuthHeaders, getTokenStatus } from "#/lib/client-storage";
import { DatePicker } from "#/components/ui/date-picker";
import { format, differenceInYears } from "date-fns";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/onboarding/step-2")({
	head: () => ({
		meta: [
			{ title: "Basic Information — PH Performance" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: OnboardingStep2,
});

type TeamType = "youth" | "adult";

const TEAM_TYPES: { id: TeamType; label: string; description: string; icon: typeof Baby }[] = [
	{
		id: "youth",
		label: "Youth Team",
		description: "Age-based training for athletes under 18.",
		icon: Baby,
	},
	{
		id: "adult",
		label: "Adult Team",
		description: "Individual and team-wide training for adult athletes.",
		icon: PersonSimpleRun,
	},
];

function OnboardingStep2() {
	const [userType, setUserType] = useState<string | null>(null);
	const [teamType, setTeamType] = useState<TeamType>("youth");
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
		let cancelled = false;
		async function check() {
			const email = localStorage.getItem("pending_email");
			const status = await getTokenStatus();
			const type = localStorage.getItem("user_type");
			if (cancelled) return;

			if (!status.authenticated) {
				toast.error("Session expired", {
					description: "Please sign in again to continue onboarding.",
				});
				navigate({ to: "/login" });
				return;
			}

			if (!type) {
				toast.error("Onboarding session incomplete", {
					description:
						'Go back to the portal and use "Continue onboarding" so your account type is set, or start from the home page.',
				});
				navigate({ to: "/portal/dashboard" });
				return;
			}

			if (!email?.trim()) {
				toast.error("Email missing", {
					description:
						"Sign out and sign in again, or continue from the portal so we can store your email for this step.",
				});
				navigate({ to: "/login" });
				return;
			}

			setUserType(type);
			setIsValidating(false);
		}
		void check();
		return () => { cancelled = true; };
	}, [navigate]);

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const mutation = useMutation({
		mutationFn: async () => {
			const status = await getTokenStatus();
			const email = localStorage.getItem("pending_email");

			if (!status.authenticated || !email) throw new Error("Session expired");

			const baseUrl = config.api.baseUrl;
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
				const maxAthletes = Number(formData.maxAthletes);

				if (!formData.teamName || !formData.maxAthletes) {
					throw new Error("Please fill in all fields");
				}

				if (teamType === "youth") {
					const minAge = Number(formData.minAge);
					const maxAge = Number(formData.maxAge);
					if (!formData.minAge || !formData.maxAge) {
						throw new Error("Please fill in the age range for your youth team");
					}
					if (minAge > maxAge) {
						throw new Error("Min age cannot be greater than Max age");
					}
					endpoint = "/api/onboarding/team-basic";
					body = {
						name: formData.teamName,
						athleteType: "youth",
						minAge,
						maxAge,
						maxAthletes,
					};
				} else {
					endpoint = "/api/onboarding/team-basic";
					body = {
						name: formData.teamName,
						athleteType: "adult",
						maxAthletes,
					};
				}
			} else {
				throw new Error("Invalid user type");
			}

			const response = await fetch(`${baseUrl}${endpoint}`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					...getAuthHeaders(),
				},
				body: JSON.stringify({ email, ...body }),
			});

			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Failed to save details");
			return data;
		},
		onSuccess: (data) => {
			toast.success("Profile updated!", {
				description: `Welcome to the platform, ${
					userType === "youth"
						? formData.athleteName
						: userType === "team"
							? formData.teamName
							: formData.name
				}.`,
			});
			if (userType === "team") {
				localStorage.setItem(
					"team_onboarding_basic",
					JSON.stringify({
						teamId: (data as any)?.teamId ?? null,
						teamName: formData.teamName,
						teamType,
						minAge: teamType === "youth" ? Number(formData.minAge) : null,
						maxAge: teamType === "youth" ? Number(formData.maxAge) : null,
						maxAthletes: Number(formData.maxAthletes),
					}),
				);
				navigate({ to: "/onboarding/step-4" });
				return;
			}
			navigate({ to: "/onboarding/step-3" });
		},
		onError: (error) => {
			toast.error("Error", {
				description: error.message || "An unexpected error occurred.",
			});
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (mutation.isPending || !!ageError) return;
		mutation.mutate();
	};

	if (isValidating || !userType) return null;

	return (
		<main className="mx-auto max-w-2xl px-4 py-8 sm:py-16 sm:px-6 lg:px-8">
			<section className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-4 text-center">
					<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
						Step 2 of {userType === "team" ? "3" : "4"}
					</p>
					<h1 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground">
						Basic Information
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed">
						{userType === "youth"
							? "Tell us about yourself and the athlete you're signing up."
							: userType === "team"
								? "Tell us about your team or club."
								: "Tell us a bit more about yourself to get started."}
					</p>
				</div>

				<Card className="border border-foreground/[0.06] p-6 sm:p-8">
					<form onSubmit={handleSubmit} className="space-y-8">
						<div className="space-y-6">
							{userType === "youth" ? (
								<>
									<div className="space-y-2">
										<label
											htmlFor="guardianName"
											className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
										>
											<IdentificationCard size={18} className="text-foreground/40" />
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
											className="h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:border-foreground/20"
										/>
									</div>

									<div className="space-y-2">
										<label
											htmlFor="athleteName"
											className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
										>
											<User size={18} className="text-foreground/40" />
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
											className="h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:border-foreground/20"
										/>
									</div>

									<div className="space-y-2">
										<label
											htmlFor="birthDate"
											className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
										>
											<CalendarIcon size={18} className="text-foreground/40" />
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
									<div className="space-y-3">
										<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/50">
											Team Type
										</p>
										<div className="grid grid-cols-2 gap-3">
											{TEAM_TYPES.map((t) => {
												const Icon = t.icon;
												const isSelected = teamType === t.id;
												return (
													<button
														key={t.id}
														type="button"
														onClick={() => setTeamType(t.id)}
														className="text-left focus:outline-none"
													>
														<Card
															className={cn(
																"h-full transition-all duration-200 border cursor-pointer",
																isSelected
																	? "border-foreground bg-primary text-primary-foreground"
																	: "border-foreground/[0.06] bg-card hover:border-foreground/20"
															)}
														>
															<div className="flex flex-col gap-2 p-4">
																<Icon
																	size={18}
																	className={isSelected ? "text-background/80" : "text-foreground/40"}
																/>
																<p className={cn(
																	"font-mono text-[11px] uppercase tracking-wider font-semibold",
																	isSelected ? "text-background" : "text-foreground"
																)}>
																	{t.label}
																</p>
																<p className={cn(
																	"text-[11px] leading-relaxed",
																	isSelected ? "text-background/60" : "text-muted-foreground"
																)}>
																	{t.description}
																</p>
															</div>
														</Card>
													</button>
												);
											})}
										</div>
									</div>

									<div className="space-y-2">
										<label
											htmlFor="teamName"
											className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
										>
											<SoccerBall size={18} className="text-foreground/40" />
											Team / Club Name
										</label>
										<Input
											id="teamName"
											placeholder="Enter team name"
											value={formData.teamName}
											onChange={(e) => handleInputChange("teamName", e.target.value)}
											required
											className="h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:border-foreground/20"
										/>
									</div>

									{teamType === "youth" && (
										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-2">
												<label
													htmlFor="minAge"
													className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
												>
													<TrendUp size={18} className="text-foreground/40" />
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
													className="h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:border-foreground/20"
												/>
											</div>
											<div className="space-y-2">
												<label
													htmlFor="maxAge"
													className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
												>
													<TrendUp size={18} className="rotate-90 text-foreground/40" />
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
													className="h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:border-foreground/20"
												/>
											</div>
										</div>
									)}

									<div className="space-y-2">
										<label
											htmlFor="maxAthletes"
											className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
										>
											<Hash size={18} className="text-foreground/40" />
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
											className="h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:border-foreground/20"
										/>
									</div>
								</>
							) : (
								<>
									<div className="space-y-2">
										<label
											htmlFor="name"
											className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
										>
											<User size={18} className="text-foreground/40" />
											Your Full Name
										</label>
										<Input
											id="name"
											placeholder="Enter your full name"
											value={formData.name}
											onChange={(e) => handleInputChange("name", e.target.value)}
											required
											className="h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:border-foreground/20"
										/>
									</div>

									<div className="space-y-2">
										<label
											htmlFor="birthDate"
											className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
										>
											<CalendarIcon size={18} className="text-foreground/40" />
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
								className="flex-1 h-10 rounded-none border border-foreground/[0.06] font-mono text-xs uppercase tracking-wider text-foreground/60 hover:bg-accent transition-all"
							>
								<ArrowLeft weight="bold" className="mr-2 w-5 h-5" />
								Back
							</Button>
							<Button
								type="submit"
								disabled={mutation.isPending || !!ageError}
								className="flex-[2] h-10 rounded-none bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50"
							>
								{mutation.isPending ? (
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

				<p className="text-center font-mono text-[10px] uppercase tracking-wider text-foreground/40 max-w-md mx-auto">
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
