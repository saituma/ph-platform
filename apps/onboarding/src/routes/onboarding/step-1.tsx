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
	head: () => ({
		meta: [
			{ title: "Account Setup — PH Performance" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
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
					<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
						Step 1 of {selected === "team" ? "3" : "4"}
					</p>
					<h1 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground">
						Setup your Account
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
						Select your role and set a secure password to get started.
					</p>
				</div>

				<div className="space-y-10">
					<div className="space-y-4">
						<h2 className="text-sm font-medium text-center text-foreground/60">I am a...</h2>
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
												"h-full transition-all duration-300 border cursor-pointer hover:border-foreground/20 group",
												isSelected
													? "border-foreground bg-foreground text-background"
													: "border-foreground/[0.06] bg-card"
											)}
										>
											<div className="flex flex-col h-full gap-4 p-6">
												<div
													className={cn(
														"w-12 h-12 flex items-center justify-center transition-colors duration-300",
														isSelected
															? "bg-background/20 text-background"
															: "bg-foreground/10 text-foreground/60"
													)}
												>
													<Icon size={24} weight={isSelected ? "bold" : "regular"} />
												</div>
												<div className="space-y-2">
													<h3 className={cn(
														"text-sm font-medium tracking-tight leading-tight",
														isSelected ? "text-background" : "text-foreground"
													)}>
														{type.title}
													</h3>
													<p className={cn(
														"text-xs leading-relaxed",
														isSelected ? "text-background/60" : "text-muted-foreground"
													)}>
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
							<div className="space-y-6 border border-foreground/[0.06] p-6 sm:p-8">
								<div className="space-y-4">
									<div className="space-y-2">
										<label className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-2">
											<LockKey weight="bold" className="text-foreground/40" />
											Create Password
										</label>
										<div className="relative">
											<Input
												type={showPassword ? "text" : "password"}
												placeholder="••••••••"
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												className="h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm pr-12"
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/60 transition-colors"
											>
												{showPassword ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
											</button>
										</div>
									</div>

									<div className="space-y-2">
										<label className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-2">
											<Check weight="bold" className="text-foreground/40" />
											Confirm Password
										</label>
										<div className="relative">
											<Input
												type={showConfirmPassword ? "text" : "password"}
												placeholder="••••••••"
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												className={cn(
													"h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm pr-12 transition-all",
													confirmPassword && !passwordsMatch && "border-destructive focus-visible:ring-destructive/20"
												)}
											/>
											<button
												type="button"
												onClick={() => setShowConfirmPassword(!showConfirmPassword)}
												className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/60 transition-colors"
											>
												{showConfirmPassword ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
											</button>
										</div>
										{confirmPassword && !passwordsMatch && (
											<p className="font-mono text-[10px] text-destructive uppercase tracking-wider pl-2">
												Passwords do not match
											</p>
										)}
									</div>
								</div>

								{/* Password Requirements Tip */}
								<div className="space-y-3 pt-2">
									<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
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
						className="w-full sm:w-auto sm:min-w-[240px] h-10 bg-foreground text-background font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50"
					>
						{mutation.isPending ? (
							<CircleNotch className="w-5 h-5 animate-spin" />
						) : (
							<>
								Continue
								<ArrowRight weight="bold" className="ml-2 w-4 h-4" />
							</>
						)}
					</Button>
					<p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-foreground/40">
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
				"h-4 w-4 flex items-center justify-center shrink-0 border transition-all duration-500",
				met ? "bg-foreground/10 border-foreground/20 text-foreground" : "bg-foreground/[0.03] border-foreground/[0.06] text-foreground/30"
			)}>
				{met ? <Check size={10} weight="bold" /> : <X size={8} weight="bold" />}
			</div>
			<span className={cn(
				"font-mono text-[10px] transition-colors duration-500",
				met ? "text-foreground" : "text-foreground/40"
			)}>
				{label}
			</span>
		</div>
	);
}
