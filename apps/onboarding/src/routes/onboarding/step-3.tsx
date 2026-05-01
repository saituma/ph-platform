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
	NotePencil,
	Trophy,
	Wrench,
	DotsThreeCircle,
	Phone,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { toast } from "sonner";
import { config } from "#/lib/config";
import { cn } from "#/lib/utils";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/onboarding/step-3")({
	head: () => ({
		meta: [
			{ title: "Training & Goals — PH Performance" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: OnboardingStep3,
});

const EQUIPMENT_OPTIONS = [
	{ id: "full", label: "Full Gym", icon: Barbell },
	{ id: "home", label: "Home Gym / Basic", icon: Wrench },
	{ id: "minimal", label: "Minimal / Bands", icon: Lightning },
	{ id: "none", label: "No Equipment", icon: Target },
	{ id: "other", label: "Other", icon: DotsThreeCircle },
] as const;

function OnboardingStep3() {
	const [trainingPerWeek, setTrainingPerWeek] = useState<number>(3);
	const [performanceGoals, setPerformanceGoals] = useState("");
	const [growthNotes, setGrowthNotes] = useState("");
	const [equipmentAccess, setEquipmentAccess] = useState<string>("full");
	const [otherEquipment, setOtherEquipment] = useState("");
	const [phone, setPhone] = useState("");
	const [injuries, setInjuries] = useState("");
	const [isValidating, setIsValidating] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		const email = localStorage.getItem("pending_email");
		const token = localStorage.getItem("auth_token");
		const type = localStorage.getItem("user_type");

		if (type === "team") {
			navigate({ to: "/onboarding/step-4" });
			return;
		}

		if (!email || !token) {
			toast.error("Session expired", {
				description: "Please enter your email to continue onboarding.",
			});
			navigate({ to: "/" });
			return;
		}
		setIsValidating(false);
	}, [navigate]);

	const mutation = useMutation({
		mutationFn: async () => {
			const token = localStorage.getItem("auth_token");
			if (!token) throw new Error("Session expired");

			const baseUrl = config.api.baseUrl;
			const response = await fetch(`${baseUrl}/api/onboarding/goals`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					trainingPerWeek,
					performanceGoals,
					growthNotes,
					phone,
					equipmentAccess: equipmentAccess === "other" ? otherEquipment : equipmentAccess,
					injuries: injuries ? { notes: injuries } : null,
				}),
			});

			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Failed to save goals");
			return data;
		},
		onSuccess: () => {
			toast.success("Goals saved!", {
				description: "Your training path is being customized.",
			});
			navigate({ to: "/onboarding/step-4" });
		},
		onError: (error) => {
			toast.error("Error", {
				description: error.message || "An unexpected error occurred.",
			});
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (mutation.isPending) return;

		if (!performanceGoals.trim()) {
			toast.error("Please enter your performance goals");
			return;
		}
		if (equipmentAccess === "other" && !otherEquipment.trim()) {
			toast.error("Please specify your equipment access");
			return;
		}
		if (!phone.trim()) {
			toast.error("Please enter your phone number");
			return;
		}

		mutation.mutate();
	};

	if (isValidating) return null;

	return (
		<main className="mx-auto max-w-2xl px-4 py-8 sm:py-16 sm:px-6 lg:px-8">
			<section className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-4 text-center">
					<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
						Step 3 of 4
					</p>
					<h1 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground leading-[1.1]">
						Training & Goals
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
						Let's define what success looks like for you on the PH Platform.
					</p>
				</div>

				<Card className="border border-foreground/[0.06] p-6 sm:p-8">
					<form onSubmit={handleSubmit} className="space-y-10">
						<div className="space-y-8">
							{/* Training Frequency */}
							<div className="space-y-4">
								<label className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5">
									<Lightning size={18} className="text-foreground/40" />
									Training Frequency (Days per week)
								</label>
								<div className="grid grid-cols-7 gap-1 sm:gap-2">
									{[1, 2, 3, 4, 5, 6, 7].map((num) => (
										<button
											key={num}
											type="button"
											onClick={() => setTrainingPerWeek(num)}
											className={cn(
												"h-10 sm:h-12 rounded-none border transition-all font-bold text-xs sm:text-sm",
												trainingPerWeek === num
													? "border-foreground bg-foreground text-background"
													: "border-foreground/[0.06] text-foreground/60 hover:border-foreground/20",
											)}
										>
											{num}
										</button>
									))}
								</div>
							</div>

							{/* Performance Goals */}
							<div className="space-y-2">
								<label
									htmlFor="performanceGoals"
									className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
								>
									<Trophy size={18} className="text-foreground/40" />
									Performance Goals
								</label>
								<Input
									id="performanceGoals"
									placeholder="e.g. Increase vertical jump, improve 40yd dash..."
									value={performanceGoals}
									onChange={(e) => setPerformanceGoals(e.target.value)}
									required
									className="h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:border-foreground/20 px-6 transition-all"
								/>
							</div>

							{/* Phone Number */}
							<div className="space-y-2">
								<label
									htmlFor="phone"
									className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
								>
									<Phone size={18} className="text-foreground/40" />
									{localStorage.getItem("user_type") === "youth"
										? "Guardian Phone Number"
										: "Your Phone Number"}
								</label>
								<Input
									id="phone"
									type="tel"
									placeholder="e.g. +1 234 567 8900"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									required
									className="h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:border-foreground/20 px-6 transition-all"
								/>
							</div>

							{/* Equipment Access */}
							<div className="space-y-4">
								<label className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5">
									<Wrench size={18} className="text-foreground/40" />
									Equipment Access
								</label>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
									{EQUIPMENT_OPTIONS.map((option) => {
										const Icon = option.icon;
										const isSelected = equipmentAccess === option.id;
										return (
											<button
												key={option.id}
												type="button"
												onClick={() => setEquipmentAccess(option.id)}
												className={cn(
													"flex items-center gap-3 p-4 rounded-none border transition-all text-left group",
													isSelected
														? "border-foreground bg-foreground/[0.04]"
														: "border-foreground/[0.06] text-foreground/60 hover:border-foreground/20",
												)}
											>
												<Icon
													size={20}
													weight={isSelected ? "bold" : "regular"}
													className={cn(
														"transition-colors",
														isSelected ? "text-foreground" : "text-foreground/40 group-hover:text-foreground/60",
													)}
												/>
												<span className="text-sm font-medium">{option.label}</span>
											</button>
										);
									})}
								</div>
								{equipmentAccess === "other" && (
									<div className="animate-in fade-in slide-in-from-top-2 duration-300">
										<Input
											placeholder="Describe your equipment access..."
											value={otherEquipment}
											onChange={(e) => setOtherEquipment(e.target.value)}
											required
											className="h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:border-foreground/20 px-6"
										/>
									</div>
								)}
							</div>

							{/* Growth Notes */}
							<div className="space-y-3">
								<label
									htmlFor="growthNotes"
									className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
								>
									<NotePencil size={18} className="text-foreground/40" />
									Growth Notes (Optional)
								</label>
								<textarea
									id="growthNotes"
									placeholder="Tell us about your current level, height/weight changes, or general health notes..."
									value={growthNotes}
									onChange={(e) => setGrowthNotes(e.target.value)}
									className="w-full min-h-[100px] rounded-none border border-foreground/[0.06] bg-transparent font-mono text-sm focus:border-foreground/20 focus:ring-0 transition-all p-4 placeholder:text-muted-foreground/50 resize-none outline-none"
								/>
							</div>

							{/* Injuries */}
							<div className="space-y-3">
								<label
									htmlFor="injuries"
									className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
								>
									<Warning size={18} className="text-foreground/40" />
									Any past injuries? (Optional)
								</label>
								<textarea
									id="injuries"
									placeholder="e.g. Previous ACL surgery, recurring hamstring issues..."
									value={injuries}
									onChange={(e) => setInjuries(e.target.value)}
									className="w-full min-h-[100px] rounded-none border border-foreground/[0.06] bg-transparent font-mono text-sm focus:border-foreground/20 focus:ring-0 transition-all p-4 placeholder:text-muted-foreground/50 resize-none outline-none"
								/>
							</div>
						</div>

						<div className="flex flex-col sm:flex-row gap-4 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate({ to: "/onboarding/step-2" })}
								className="flex-1 h-10 rounded-none border border-foreground/[0.06] font-mono text-xs uppercase tracking-wider text-foreground/60 hover:bg-accent transition-all"
							>
								<ArrowLeft weight="bold" className="mr-2 w-5 h-5" />
								Back
							</Button>
							<Button
								type="submit"
								disabled={mutation.isPending}
								className="flex-[2] h-10 rounded-none bg-foreground text-background font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-all"
							>
								{mutation.isPending ? (
									<CircleNotch className="w-6 h-6 animate-spin" />
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
