import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { 
	User, 
	UserCircle, 
	Users, 
	ArrowRight, 
	CircleNotch,
	Eye,
	EyeSlash,
	Check,
	X,
	LockKey
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";
import { toast } from "sonner";
import { config } from "#/lib/config";
import { useMutation } from "@tanstack/react-query";

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
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isValidating, setIsValidating] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		const email = localStorage.getItem("pending_email");
		const token = localStorage.getItem("auth_token");

		if (!email || !token) {
			toast.error("Session expired", {
				description: "Please enter your email to continue onboarding.",
			});
			navigate({ to: "/" });
			return;
		}
		setIsValidating(false);
	}, [navigate]);

	const passwordRequirements = useMemo(() => ({
		hasUpper: /[A-Z]/.test(password),
		hasNumber: /[0-9]/.test(password),
		hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
		hasMinLength: password.length >= 8,
	}), [password]);

	const isPasswordStrong = Object.values(passwordRequirements).every(Boolean);
	const passwordsMatch = password === confirmPassword && password !== "";
	
	const mutation = useMutation({
		mutationFn: async () => {
			const email = localStorage.getItem("pending_email");
			const token = localStorage.getItem("auth_token");

			if (!email || !token) throw new Error("Session expired");

			const baseUrl = config.api.baseUrl;
			const response = await fetch(`${baseUrl}/api/auth/onboarding/role`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ email, type: selected, password }),
			});

			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Failed to save selection");
			return data;
		},
		onSuccess: () => {
			toast.success("Preference saved!", {
				description: `You've joined as a ${USER_TYPES.find((t) => t.id === selected)?.title}.`,
			});
			localStorage.setItem("user_type", selected as string);
			navigate({ to: "/onboarding/step-2" });
		},
		onError: (error) => {
			toast.error("Could not save selection", {
				description: error.message || "An unexpected error occurred.",
			});
		},
	});

	const canContinue = selected && isPasswordStrong && passwordsMatch && !mutation.isPending;

	if (isValidating) return null;

	return (
		<main className="mx-auto max-w-4xl px-4 py-8 sm:py-16 sm:px-6 lg:px-8">
			<section className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-4 text-center">
					<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
						Step 1 of {selected === "team" ? "3" : "4"}
					</p>
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl leading-[1.1]">
						Setup your <span className="text-primary">Account</span>
					</h1>
					<p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
						Select your role and set a secure password to get started.
					</p>
				</div>

				<div className="space-y-10">
					<div className="space-y-4">
						<h2 className="text-lg font-bold text-center">I am a...</h2>
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
												"h-full transition-all duration-300 border-2 cursor-pointer hover:border-primary/40 group rounded-3xl",
												isSelected
													? "border-primary bg-primary/5 shadow-md scale-[1.02]"
													: "border-border/80 bg-card hover:shadow-sm"
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
													<h3 className="text-xl font-bold text-foreground leading-tight">
														{type.title}
													</h3>
													<p className="text-xs text-muted-foreground leading-relaxed">
														{type.description}
													</p>
												</div>
											</div>
										</Card>
									</button>
								);
							})}
						</div>
					</div>

					{selected && (
						<div className="max-w-md mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
							<div className="space-y-6 bg-card/50 backdrop-blur-sm p-5 sm:p-8 rounded-[2.5rem] border border-border/60 shadow-xl">
								<div className="space-y-4">
									<div className="space-y-2">
										<label className="text-sm font-bold flex items-center gap-2">
											<LockKey weight="bold" className="text-primary" />
											Create Password
										</label>
										<div className="relative">
											<Input
												type={showPassword ? "text" : "password"}
												placeholder="••••••••"
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												className="h-14 rounded-2xl bg-background/50 border-border/60 pr-12 text-lg font-medium"
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
											>
												{showPassword ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
											</button>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-sm font-bold flex items-center gap-2">
											<Check weight="bold" className="text-primary" />
											Confirm Password
										</label>
										<div className="relative">
											<Input
												type={showConfirmPassword ? "text" : "password"}
												placeholder="••••••••"
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												className={cn(
													"h-14 rounded-2xl bg-background/50 border-border/60 pr-12 text-lg font-medium transition-all",
													confirmPassword && !passwordsMatch && "border-destructive focus-visible:ring-destructive/20"
												)}
											/>
											<button
												type="button"
												onClick={() => setShowConfirmPassword(!showConfirmPassword)}
												className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
											>
												{showConfirmPassword ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
											</button>
										</div>
										{confirmPassword && !passwordsMatch && (
											<p className="text-[10px] font-bold text-destructive uppercase tracking-widest pl-2">
												Passwords do not match
											</p>
										)}
									</div>
								</div>

								{/* Password Requirements Tip */}
								<div className="space-y-3 pt-2">
									<p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
										Security Requirements
									</p>
									<div className="grid grid-cols-2 gap-2">
										<RequirementItem 
											met={passwordRequirements.hasMinLength} 
											label="8+ Characters" 
										/>
										<RequirementItem 
											met={passwordRequirements.hasUpper} 
											label="Uppercase Letter" 
										/>
										<RequirementItem 
											met={passwordRequirements.hasNumber} 
											label="One Number" 
										/>
										<RequirementItem 
											met={passwordRequirements.hasSpecial} 
											label="Special Character" 
										/>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				<div className="flex flex-col items-center pt-4">
					<Button
						onClick={() => mutation.mutate()}
						disabled={!canContinue}
						size="lg"
						className="w-full sm:w-auto sm:min-w-[240px] h-14 sm:h-16 rounded-[2rem] text-lg sm:text-xl font-black uppercase italic shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
					>
						{mutation.isPending ? (
							<CircleNotch className="w-8 h-8 animate-spin" />
						) : (
							<>
								Continue
								<ArrowRight weight="bold" className="ml-3 w-6 h-6" />
							</>
						)}
					</Button>
					<p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
						Secure account creation via PH Platform
					</p>
				</div>
			</section>
		</main>
	);
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
	return (
		<div className="flex items-center gap-2">
			<div className={cn(
				"h-4 w-4 rounded-full flex items-center justify-center shrink-0 border transition-all duration-500",
				met ? "bg-primary/20 border-primary text-primary" : "bg-muted/30 border-muted-foreground/20 text-muted-foreground/40"
			)}>
				{met ? <Check size={10} weight="bold" /> : <X size={8} weight="bold" />}
			</div>
			<span className={cn(
				"text-[11px] font-bold transition-colors duration-500",
				met ? "text-foreground" : "text-muted-foreground/60"
			)}>
				{label}
			</span>
		</div>
	);
}
