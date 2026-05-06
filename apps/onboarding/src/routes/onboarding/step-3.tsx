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
	Calendar,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { toast } from "sonner";
import { config } from "#/lib/config";
import { getAuthHeaders, getTokenStatus } from "#/lib/client-storage";
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
const COUNTRY_CODES = [
	{ code: "+44", country: "UK", flag: "🇬🇧", length: 10 },
	{ code: "+1", country: "US", flag: "🇺🇸", length: 10 },
	{ code: "+353", country: "IE", flag: "🇮🇪", length: 9 },
	{ code: "+61", country: "AU", flag: "🇦🇺", length: 9 },
	{ code: "+64", country: "NZ", flag: "🇳🇿", length: 9 },
	{ code: "+91", country: "IN", flag: "🇮🇳", length: 10 },
	{ code: "+49", country: "DE", flag: "🇩🇪", length: 11 },
	{ code: "+33", country: "FR", flag: "🇫🇷", length: 9 },
	{ code: "+34", country: "ES", flag: "🇪🇸", length: 9 },
	{ code: "+39", country: "IT", flag: "🇮🇹", length: 10 },
	{ code: "+31", country: "NL", flag: "🇳🇱", length: 9 },
	{ code: "+971", country: "AE", flag: "🇦🇪", length: 9 },
	{ code: "+966", country: "SA", flag: "🇸🇦", length: 9 },
	{ code: "+27", country: "ZA", flag: "🇿🇦", length: 9 },
] as const;
const TRAINING_DAYS = [
	{ id: "mon", label: "Mon" },
	{ id: "tue", label: "Tue" },
	{ id: "wed", label: "Wed" },
	{ id: "thu", label: "Thu" },
	{ id: "fri", label: "Fri" },
	{ id: "sat", label: "Sat" },
	{ id: "sun", label: "Sun" },
] as const;

function OnboardingStep3() {
	const [trainingPerWeek, setTrainingPerWeek] = useState<number>(3);
	const [preferredTrainingDays, setPreferredTrainingDays] = useState<string[]>(["mon", "wed", "fri"]);
	const [performanceGoals, setPerformanceGoals] = useState("");
	const [growthNotes, setGrowthNotes] = useState("");
	const [equipmentAccess, setEquipmentAccess] = useState<string>("full");
	const [otherEquipment, setOtherEquipment] = useState("");
	const [countryCode, setCountryCode] = useState("+44");
	const [phone, setPhone] = useState("");
	const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
	const [injuries, setInjuries] = useState("");
	const [isValidating, setIsValidating] = useState(true);
	const navigate = useNavigate();

	const selectedCountry =
		COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

	useEffect(() => {
		let cancelled = false;
		async function check() {
			const email = localStorage.getItem("pending_email");
			const status = await getTokenStatus();
			const type = localStorage.getItem("user_type");
			if (cancelled) return;

			if (type === "team") {
				navigate({ to: "/onboarding/step-4" });
				return;
			}

			if (!email || !status.authenticated) {
				toast.error("Session expired", {
					description: "Please enter your email to continue onboarding.",
				});
				navigate({ to: "/" });
				return;
			}
			setIsValidating(false);
		}
		void check();
		return () => { cancelled = true; };
	}, [navigate]);

	useEffect(() => {
		let cancelled = false;
		async function hydrateExistingGoals() {
			if (isValidating) return;
			try {
				const status = await getTokenStatus();
				if (!status.authenticated) return;
				const baseUrl = config.api.baseUrl;
				const response = await fetch(`${baseUrl}/api/auth/me`, {
					credentials: "include",
					headers: getAuthHeaders(),
				});
				if (!response.ok) return;
				const data = await response.json().catch(() => ({}));
				const user = (data as any)?.user ?? null;
				if (!user || cancelled) return;

				const training = Number(user.trainingPerWeek ?? 0);
				if (Number.isFinite(training) && training > 0 && training <= 7) {
					setTrainingPerWeek(training);
				}
				if (Array.isArray(user.preferredTrainingDays) && user.preferredTrainingDays.length > 0) {
					setPreferredTrainingDays(user.preferredTrainingDays.slice(0, 7));
				}
				if (typeof user.performanceGoals === "string" && user.performanceGoals.trim()) {
					setPerformanceGoals(user.performanceGoals);
				}
				if (typeof user.growthNotes === "string" && user.growthNotes.trim()) {
					setGrowthNotes(user.growthNotes);
				}
				if (typeof user.phoneNumber === "string" && user.phoneNumber.trim()) {
					const fullPhone = user.phoneNumber.trim();
					// Try to match country code
					const matched = COUNTRY_CODES.find((c) => fullPhone.startsWith(c.code));
					if (matched) {
						setCountryCode(matched.code);
						setPhone(fullPhone.slice(matched.code.length).trim());
					} else {
						setPhone(fullPhone);
					}
				}
				if (typeof user.equipmentAccess === "string" && user.equipmentAccess.trim()) {
					const normalized = user.equipmentAccess.trim().toLowerCase();
					const known = ["full", "home", "minimal", "none"];
					if (known.includes(normalized)) {
						setEquipmentAccess(normalized);
					} else {
						setEquipmentAccess("other");
						setOtherEquipment(user.equipmentAccess);
					}
				}
				const injuryNotes =
					typeof user.injuries?.notes === "string"
						? user.injuries.notes
						: typeof user.injuries === "string"
							? user.injuries
							: "";
				if (injuryNotes.trim()) {
					setInjuries(injuryNotes);
				}
			} catch {
				// Best effort hydration only.
			}
		}
		void hydrateExistingGoals();
		return () => {
			cancelled = true;
		};
	}, [isValidating]);

	const mutation = useMutation({
		mutationFn: async () => {
			const status = await getTokenStatus();
			if (!status.authenticated) throw new Error("Session expired");

			const baseUrl = config.api.baseUrl;
			const response = await fetch(`${baseUrl}/api/onboarding/goals`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					...getAuthHeaders(),
				},
				body: JSON.stringify({
					trainingPerWeek,
					preferredTrainingDays,
					performanceGoals,
					growthNotes,
					phone: `${countryCode}${phone.replace(/\s+/g, "").replace(/^0/, "")}`,
					equipmentAccess:
						equipmentAccess === "other" ? otherEquipment : equipmentAccess,
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

		const cleanPhone = phone.replace(/\s+/g, "").replace(/^0/, "");
		if (!cleanPhone) {
			toast.error("Please enter your phone number");
			return;
		}

		if (cleanPhone.length !== selectedCountry.length) {
			toast.error(
				`Phone number must be ${selectedCountry.length} digits for ${selectedCountry.country}`,
			);
			return;
		}

		if (preferredTrainingDays.length === 0) {
			toast.error("Please select at least one training day");
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
											onClick={() => {
												setTrainingPerWeek(num);
												setPreferredTrainingDays((prev) => (prev.length > num ? prev.slice(0, num) : prev));
											}}
											className={cn(
												"h-10 sm:h-12 rounded-none border transition-all font-bold text-xs sm:text-sm",
												trainingPerWeek === num
													? "border-foreground bg-primary text-primary-foreground"
													: "border-foreground/[0.06] text-foreground/60 hover:border-foreground/20",
											)}
										>
											{num}
										</button>
									))}
								</div>
							</div>

							<div className="space-y-4">
								<label className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5">
									<Calendar size={18} className="text-foreground/40" />
									Preferred Training Days
								</label>
								<div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
									{TRAINING_DAYS.map((day) => {
										const selected = preferredTrainingDays.includes(day.id);
										const limitReached = preferredTrainingDays.length >= trainingPerWeek;
										const isDisabled = !selected && limitReached;

										return (
											<button
												key={day.id}
												type="button"
												disabled={isDisabled}
												onClick={() =>
													setPreferredTrainingDays((prev) =>
														prev.includes(day.id) ? prev.filter((d) => d !== day.id) : [...prev, day.id],
													)
												}
												className={cn(
													"h-10 rounded-none border transition-all font-bold text-xs",
													selected
														? "border-foreground bg-primary text-primary-foreground"
														: "border-foreground/[0.06] text-foreground/60 hover:border-foreground/20",
													isDisabled && "opacity-20 cursor-not-allowed grayscale",
												)}
											>
												{day.label}
											</button>
										);
									})}
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
								<div className="flex items-center justify-between">
									<label
										htmlFor="phone"
										className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
									>
										<Phone size={18} className="text-foreground/40" />
										{localStorage.getItem("user_type") === "youth"
											? "Guardian Phone Number"
											: "Your Phone Number"}
									</label>
									{phone && (
										<span
											className={cn(
												"font-mono text-[10px] uppercase tracking-wider transition-colors",
												phone.replace(/\s+/g, "").replace(/^0/, "").length ===
													selectedCountry.length
													? "text-foreground/40"
													: "text-red-500",
											)}
										>
											{phone.replace(/\s+/g, "").replace(/^0/, "").length} /{" "}
											{selectedCountry.length}
										</span>
									)}
								</div>
								<div className="flex relative group">
									<div className="relative">
										<button
											type="button"
											onClick={() => setIsCountryMenuOpen(!isCountryMenuOpen)}
											className="h-10 flex items-center gap-2 px-4 border border-foreground/[0.06] border-r-0 bg-transparent hover:bg-foreground/[0.02] transition-all font-mono text-sm outline-none"
										>
											<span className="text-lg leading-none">
												{selectedCountry.flag}
											</span>
											<span className="text-foreground/60">
												{selectedCountry.code}
											</span>
										</button>
										{isCountryMenuOpen && (
											<>
												<div
													className="fixed inset-0 z-40"
													onClick={() => setIsCountryMenuOpen(false)}
												/>
												<div className="absolute top-full left-0 z-50 mt-1 w-48 max-h-60 overflow-y-auto bg-background border border-foreground/[0.06] shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md">
													{COUNTRY_CODES.map((c) => (
														<button
															key={c.code}
															type="button"
															onClick={() => {
																setCountryCode(c.code);
																setIsCountryMenuOpen(false);
															}}
															className={cn(
																"flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-foreground/[0.04] transition-colors font-mono",
																c.code === countryCode
																	? "bg-foreground/[0.02] text-foreground"
																	: "text-foreground/60",
															)}
														>
															<span className="text-lg leading-none">
																{c.flag}
															</span>
															<span className="flex-1">{c.country}</span>
															<span className="text-foreground/30 text-[10px]">
																{c.code}
															</span>
														</button>
													))}
												</div>
											</>
										)}
									</div>
									<Input
										id="phone"
										type="tel"
										placeholder={`e.g. ${
											selectedCountry.code === "+44"
												? "7911 123456"
												: "234 567 8900"
										}`}
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										required
										className="h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:border-foreground/20 px-6 transition-all flex-1"
									/>
								</div>
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
								className="flex-[2] h-10 rounded-none bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-all"
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
