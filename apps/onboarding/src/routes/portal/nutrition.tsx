import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Droplets,
	Footprints,
	Loader2,
	Moon,
	Save,
	Smile,
	Utensils,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageTransition } from "@/lib/motion";
import {
	isPortalAthleteRole,
	showPortalNutritionNav,
} from "@/lib/portal-roles";
import { cn } from "@/lib/utils";
import { usePortal } from "@/portal/PortalContext";
import { usePortalSocketEvent } from "@/portal/PortalSocketContext";
import { settingsService } from "@/services/settingsService";

export const Route = createFileRoute("/portal/nutrition")({
	component: NutritionPage,
});

function WellbeingDot({
	value,
	color,
	inverted = false,
}: {
	value: number | null | undefined;
	color: string;
	inverted?: boolean;
}) {
	if (!value)
		return <div className="h-6 w-6 mx-auto rounded-full bg-muted/30" />;
	const score = inverted ? 6 - value : value; // for pain, lower is better
	const opacity =
		score <= 1
			? "opacity-20"
			: score <= 2
				? "opacity-40"
				: score <= 3
					? "opacity-60"
					: score <= 4
						? "opacity-80"
						: "opacity-100";
	return (
		<div
			className={`h-6 w-6 mx-auto rounded-full ${color} ${opacity} flex items-center justify-center`}
			title={`${value}/5`}
		>
			<span className="text-[8px] font-black text-white">{value}</span>
		</div>
	);
}

function NutritionPage() {
	const { user, token } = usePortal();
	const [date, setDate] = useState(new Date());
	const [loading, setLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [forceProfileEdit, setForceProfileEdit] = useState(false);
	const [targets, setTargets] = useState<any>(null);
	const [weekLogs, setWeekLogs] = useState<any[]>([]);
	const [hasNutritionProfile, setHasNutritionProfile] = useState<
		boolean | null
	>(null);
	const [profileForm, setProfileForm] = useState({
		dietaryRequirements: "",
		allergies: "",
		generalNutritionHabits: "",
		primaryGoal: "",
		mealsPerDay: "",
		hydrationLitersPerDay: "",
		supplements: "",
		medicalNotes: "",
		additionalContext: "",
	});

	const [log, setLog] = useState<any>({
		breakfast: "",
		lunch: "",
		dinner: "",
		snacksMorning: "",
		snacksAfternoon: "",
		snacksEvening: "",
		waterIntake: 0,
		steps: 0,
		sleepHours: 0,
		mood: 3,
		energy: 3,
		pain: 1,
		foodDiary: "",
	});

	const dateKey = date.toISOString().slice(0, 10);
	const requiresNutritionOnboarding = isPortalAthleteRole(user?.role);

	const fetchNutritionOnboardingProfile = useCallback(async () => {
		if (!user || !requiresNutritionOnboarding) {
			setHasNutritionProfile(true);
			return;
		}
		try {
			const data = await settingsService.getNutritionOnboardingProfile();
			const profile = data.profile;
			setHasNutritionProfile(Boolean(profile));
			if (profile) {
				setProfileForm({
					dietaryRequirements: profile.dietaryRequirements ?? "",
					allergies: profile.allergies ?? "",
					generalNutritionHabits: profile.generalNutritionHabits ?? "",
					primaryGoal: profile.primaryGoal ?? "",
					mealsPerDay:
						profile.mealsPerDay != null ? String(profile.mealsPerDay) : "",
					hydrationLitersPerDay:
						profile.hydrationLitersPerDay != null
							? String(profile.hydrationLitersPerDay)
							: "",
					supplements: profile.supplements ?? "",
					medicalNotes: profile.medicalNotes ?? "",
					additionalContext: profile.additionalContext ?? "",
				});
			}
		} catch (error) {
			console.error("Failed to fetch nutrition onboarding profile", error);
			setHasNutritionProfile(false);
		}
	}, [user, requiresNutritionOnboarding]);

	const fetchData = useCallback(async () => {
		if (!user || !showPortalNutritionNav(user.role)) return;
		if (requiresNutritionOnboarding && hasNutritionProfile !== true) return;
		setLoading(true);
		try {
			// Fetch today's log + 7-day history + targets in parallel
			const weekStart = new Date(date);
			weekStart.setDate(weekStart.getDate() - 6);
			const weekStartKey = weekStart.toISOString().slice(0, 10);

			const [todayData, weekData, targetsData] = await Promise.all([
				settingsService.getNutritionLogs({
					userId: user.id || "me",
					from: dateKey,
					to: dateKey,
				}),
				settingsService.getNutritionLogs({
					userId: user.id || "me",
					from: weekStartKey,
					to: dateKey,
					limit: 30,
				}),
				settingsService
					.getNutritionTargets(user.id || "me")
					.catch(() => ({ targets: null })),
			]);

			const currentLog = todayData.logs.find((l: any) => l.dateKey === dateKey);
			if (currentLog) {
				setLog({
					...currentLog,
					mood: currentLog.mood || 3,
					energy: currentLog.energy || 3,
					pain: currentLog.pain || 1,
				});
			} else {
				setLog({
					breakfast: "",
					lunch: "",
					dinner: "",
					snacksMorning: "",
					snacksAfternoon: "",
					snacksEvening: "",
					waterIntake: 0,
					steps: 0,
					sleepHours: 0,
					mood: 3,
					energy: 3,
					pain: 1,
					foodDiary: "",
				});
			}
			setTargets(targetsData.targets);
			// Deduplicate by dateKey, keep one per day
			const byDate = new Map<string, any>();
			for (const l of weekData.logs) {
				if (!byDate.has(l.dateKey)) byDate.set(l.dateKey, l);
			}
			setWeekLogs(
				Array.from(byDate.values()).sort((a, b) =>
					a.dateKey.localeCompare(b.dateKey),
				),
			);
		} catch (error) {
			console.error("Failed to fetch nutrition log", error);
		} finally {
			setLoading(false);
		}
	}, [user, dateKey, requiresNutritionOnboarding, hasNutritionProfile]);

	useEffect(() => {
		fetchNutritionOnboardingProfile();
	}, [fetchNutritionOnboardingProfile]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const refreshIfMine = (payload?: { userId?: number | string | null }) => {
		const target = Number(payload?.userId ?? Number.NaN);
		if (Number.isFinite(target) && target !== Number(user?.id)) return;
		void fetchData();
	};
	usePortalSocketEvent(
		"nutrition:log:updated",
		refreshIfMine,
		!!token && !!user?.id,
	);
	usePortalSocketEvent(
		"nutrition:feedback:updated",
		refreshIfMine,
		!!token && !!user?.id,
	);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await settingsService.saveNutritionLog({
				...log,
				dateKey,
				athleteId: user?.id,
			});
			toast.success("Daily log saved successfully");
		} catch (error: any) {
			toast.error(error.message || "Failed to save log");
		} finally {
			setIsSaving(false);
		}
	};

	const changeDate = (days: number) => {
		const newDate = new Date(date);
		newDate.setDate(newDate.getDate() + days);
		setDate(newDate);
	};

	const toggleMeal = (key: string) => {
		setLog((prev: any) => ({
			...prev,
			[key]: prev[key] ? "" : "yes",
		}));
	};

	const handleSaveProfile = async () => {
		if (
			!profileForm.dietaryRequirements.trim() ||
			!profileForm.allergies.trim() ||
			!profileForm.generalNutritionHabits.trim()
		) {
			toast.error(
				"Please complete dietary requirements, allergies, and general habits.",
			);
			return;
		}

		setIsSavingProfile(true);
		try {
			await settingsService.saveNutritionOnboardingProfile({
				dietaryRequirements: profileForm.dietaryRequirements.trim(),
				allergies: profileForm.allergies.trim(),
				generalNutritionHabits: profileForm.generalNutritionHabits.trim(),
				primaryGoal: profileForm.primaryGoal.trim() || null,
				mealsPerDay: profileForm.mealsPerDay
					? Number(profileForm.mealsPerDay)
					: null,
				hydrationLitersPerDay: profileForm.hydrationLitersPerDay
					? Number(profileForm.hydrationLitersPerDay)
					: null,
				supplements: profileForm.supplements.trim() || null,
				medicalNotes: profileForm.medicalNotes.trim() || null,
				additionalContext: profileForm.additionalContext.trim() || null,
			});
			setHasNutritionProfile(true);
			setForceProfileEdit(false);
			toast.success("Nutrition profile saved.");
		} catch (error: any) {
			toast.error(error.message || "Failed to save nutrition profile");
		} finally {
			setIsSavingProfile(false);
		}
	};

	if (user && !showPortalNutritionNav(user.role)) {
		return (
			<div className="p-6 max-w-2xl mx-auto space-y-6">
				<Card className="border-2">
					<CardHeader>
						<CardTitle className="text-xl font-black uppercase italic tracking-tight">
							Nutrition logging
						</CardTitle>
						<CardDescription className="text-base">
							Daily nutrition logs are for athletes. Team coaches review
							athletes from Team and the staff dashboard rather than logging
							personal metrics here.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-3">
						<Button asChild className="rounded-xl font-bold">
							<Link to="/portal/team">Open Team</Link>
						</Button>
						<Button asChild variant="outline" className="rounded-xl font-bold">
							<Link to="/portal/dashboard">Back to dashboard</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (requiresNutritionOnboarding && hasNutritionProfile == null) {
		return (
			<div className="h-64 flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (
		requiresNutritionOnboarding &&
		(hasNutritionProfile === false || forceProfileEdit)
	) {
		return (
			<PageTransition className="p-6 max-w-3xl mx-auto space-y-6">
				<Card className="border-2">
					<CardHeader>
						<CardTitle className="text-xl font-black uppercase italic tracking-tight">
							Complete nutrition profile
						</CardTitle>
						<CardDescription className="text-base">
							Before daily nutrition logging, tell your coach about your
							allergies, requirements, and habits.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label>Allergies *</Label>
							<Textarea
								value={profileForm.allergies}
								onChange={(e) =>
									setProfileForm((prev) => ({
										...prev,
										allergies: e.target.value,
									}))
								}
								placeholder="List known allergies and severity"
								className="min-h-[90px] border-2 rounded-xl resize-none"
							/>
						</div>
						<div className="space-y-2">
							<Label>Dietary requirements *</Label>
							<Textarea
								value={profileForm.dietaryRequirements}
								onChange={(e) =>
									setProfileForm((prev) => ({
										...prev,
										dietaryRequirements: e.target.value,
									}))
								}
								placeholder="Any restrictions or dietary pattern"
								className="min-h-[90px] border-2 rounded-xl resize-none"
							/>
						</div>
						<div className="space-y-2">
							<Label>General nutrition habits *</Label>
							<Textarea
								value={profileForm.generalNutritionHabits}
								onChange={(e) =>
									setProfileForm((prev) => ({
										...prev,
										generalNutritionHabits: e.target.value,
									}))
								}
								placeholder="Typical meal timing, appetite, and eating pattern"
								className="min-h-[90px] border-2 rounded-xl resize-none"
							/>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Primary goal</Label>
								<Input
									value={profileForm.primaryGoal}
									onChange={(e) =>
										setProfileForm((prev) => ({
											...prev,
											primaryGoal: e.target.value,
										}))
									}
									placeholder="e.g. gain lean muscle"
									className="border-2 rounded-xl"
								/>
							</div>
							<div className="space-y-2">
								<Label>Meals per day</Label>
								<Input
									type="number"
									value={profileForm.mealsPerDay}
									onChange={(e) =>
										setProfileForm((prev) => ({
											...prev,
											mealsPerDay: e.target.value,
										}))
									}
									placeholder="3"
									className="border-2 rounded-xl"
								/>
							</div>
							<div className="space-y-2">
								<Label>Hydration (L/day)</Label>
								<Input
									type="number"
									value={profileForm.hydrationLitersPerDay}
									onChange={(e) =>
										setProfileForm((prev) => ({
											...prev,
											hydrationLitersPerDay: e.target.value,
										}))
									}
									placeholder="2"
									className="border-2 rounded-xl"
								/>
							</div>
							<div className="space-y-2">
								<Label>Supplements</Label>
								<Input
									value={profileForm.supplements}
									onChange={(e) =>
										setProfileForm((prev) => ({
											...prev,
											supplements: e.target.value,
										}))
									}
									placeholder="If any"
									className="border-2 rounded-xl"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label>Medical notes</Label>
							<Textarea
								value={profileForm.medicalNotes}
								onChange={(e) =>
									setProfileForm((prev) => ({
										...prev,
										medicalNotes: e.target.value,
									}))
								}
								placeholder="Conditions, medications, or relevant notes"
								className="min-h-[80px] border-2 rounded-xl resize-none"
							/>
						</div>
						<div className="space-y-2">
							<Label>Additional context</Label>
							<Textarea
								value={profileForm.additionalContext}
								onChange={(e) =>
									setProfileForm((prev) => ({
										...prev,
										additionalContext: e.target.value,
									}))
								}
								placeholder="Anything else your coach should know"
								className="min-h-[80px] border-2 rounded-xl resize-none"
							/>
						</div>
						<div className="flex flex-wrap gap-3">
							<Button
								onClick={handleSaveProfile}
								disabled={isSavingProfile}
								className="h-12 rounded-xl font-black uppercase tracking-wider"
							>
								{isSavingProfile ? (
									<Loader2 className="mr-2 h-5 w-5 animate-spin" />
								) : (
									<Save className="mr-2 h-5 w-5" />
								)}
								{isSavingProfile ? "Saving..." : "Save nutrition profile"}
							</Button>
							{forceProfileEdit && (
								<Button
									variant="outline"
									className="h-12 rounded-xl font-bold"
									onClick={() => setForceProfileEdit(false)}
								>
									Back to logging
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			</PageTransition>
		);
	}

	const renderMetric = (
		label: string,
		icon: any,
		value: number,
		key: string,
	) => (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				{icon}
				<span className="text-sm font-bold uppercase tracking-wider">
					{label}
				</span>
			</div>
			<div className="flex justify-between gap-1">
				{[1, 2, 3, 4, 5].map((val) => (
					<button
						key={val}
						onClick={() => setLog((prev: any) => ({ ...prev, [key]: val }))}
						className={cn(
							"flex-1 h-10 rounded-lg font-bold transition-all border-2",
							value === val
								? "bg-primary text-primary-foreground border-primary"
								: "bg-muted/50 border-transparent hover:border-primary/20",
						)}
					>
						{val}
					</button>
				))}
			</div>
		</div>
	);

	return (
		<PageTransition className="p-6 max-w-4xl mx-auto space-y-6">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h1 className="text-3xl font-black uppercase italic tracking-tighter">
						Nutrition & Wellness
					</h1>
					<p className="text-muted-foreground">
						Log your daily metrics and track your progress. You can save several
						times on the same day (for example breakfast now, dinner later) —
						earlier meals stay on file when you save again.
					</p>
					{requiresNutritionOnboarding && hasNutritionProfile && (
						<div className="mt-3">
							<Button
								variant="outline"
								className="rounded-xl font-bold"
								onClick={() => setForceProfileEdit(true)}
							>
								Edit nutrition profile
							</Button>
						</div>
					)}
				</div>

				<div className="flex items-center bg-card border-2 rounded-xl p-1 shrink-0">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => changeDate(-1)}
						className="rounded-lg"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<div className="flex items-center gap-2 px-4 min-w-[140px] justify-center font-bold text-sm uppercase">
						<Calendar className="h-4 w-4 text-primary" />
						{date.toLocaleDateString(undefined, {
							month: "short",
							day: "numeric",
							year: "numeric",
						})}
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => changeDate(1)}
						className="rounded-lg"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{loading ? (
				<div className="h-64 flex items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-6">
							<Card className="border-2">
								<CardHeader className="pb-3">
									<div className="flex items-center gap-2 text-primary">
										<Utensils className="h-5 w-5" />
										<CardTitle className="text-lg font-bold uppercase tracking-tight">
											Meal Checklist
										</CardTitle>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									{[
										"breakfast",
										"lunch",
										"dinner",
										"snacksMorning",
										"snacksAfternoon",
										"snacksEvening",
									].map((meal) => (
										<div key={meal} className="space-y-2">
											<div
												className={cn(
													"flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all",
													log[meal]
														? "border-primary bg-primary/5"
														: "border-transparent bg-muted/30",
												)}
												onClick={() => toggleMeal(meal)}
											>
												<Label className="capitalize font-bold cursor-pointer">
													{meal.replace(/([A-Z])/g, " $1")}
												</Label>
												<Checkbox checked={!!log[meal]} />
											</div>
											{!!log[meal] && (
												<Input
													value={log[meal] === "yes" ? "" : log[meal]}
													onChange={(e) =>
														setLog((prev: any) => ({
															...prev,
															[meal]: e.target.value || "yes",
														}))
													}
													placeholder="What did you eat?"
													className="border-2 rounded-xl h-10"
												/>
											)}
										</div>
									))}
								</CardContent>
							</Card>

							<Card className="border-2">
								<CardHeader className="pb-3">
									<CardTitle className="text-lg font-bold uppercase tracking-tight">
										Daily Habits
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-6">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
												<Droplets className="h-5 w-5" />
											</div>
											<span className="font-bold">Water Intake</span>
										</div>
										<div className="flex items-center gap-3">
											<Button
												variant="outline"
												size="icon"
												className="h-8 w-8 rounded-lg"
												onClick={() =>
													setLog((prev: any) => ({
														...prev,
														waterIntake: Math.max(0, prev.waterIntake - 1),
													}))
												}
											>
												-
											</Button>
											<span className="w-8 text-center font-black">
												{log.waterIntake}
											</span>
											<Button
												variant="outline"
												size="icon"
												className="h-8 w-8 rounded-lg"
												onClick={() =>
													setLog((prev: any) => ({
														...prev,
														waterIntake: prev.waterIntake + 1,
													}))
												}
											>
												+
											</Button>
										</div>
									</div>

									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
												<Footprints className="h-5 w-5" />
											</div>
											<span className="font-bold">Steps</span>
										</div>
										<Input
											type="number"
											className="w-24 text-right font-bold border-2 rounded-xl"
											value={log.steps}
											onChange={(e) =>
												setLog((prev: any) => ({
													...prev,
													steps: parseInt(e.target.value) || 0,
												}))
											}
										/>
									</div>

									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
												<Moon className="h-5 w-5" />
											</div>
											<span className="font-bold">Sleep (hrs)</span>
										</div>
										<Input
											type="number"
											className="w-24 text-right font-bold border-2 rounded-xl"
											value={log.sleepHours}
											onChange={(e) =>
												setLog((prev: any) => ({
													...prev,
													sleepHours: parseInt(e.target.value) || 0,
												}))
											}
										/>
									</div>
								</CardContent>
							</Card>
						</div>

						<div className="space-y-6">
							<Card className="border-2">
								<CardHeader className="pb-3">
									<div className="flex items-center gap-2 text-primary">
										<Activity className="h-5 w-5" />
										<CardTitle className="text-lg font-bold uppercase tracking-tight">
											Wellbeing
										</CardTitle>
									</div>
								</CardHeader>
								<CardContent className="space-y-8">
									{renderMetric(
										"Mood Tracker",
										<Smile className="h-4 w-4 text-amber-500" />,
										log.mood,
										"mood",
									)}
									{renderMetric(
										"Energy Levels",
										<Zap className="h-4 w-4 text-yellow-500" />,
										log.energy,
										"energy",
									)}
									{renderMetric(
										"Pain Levels",
										<Activity className="h-4 w-4 text-red-500" />,
										log.pain,
										"pain",
									)}
								</CardContent>
							</Card>

							<Card className="border-2">
								<CardHeader>
									<CardTitle className="text-lg font-bold uppercase tracking-tight">
										Food Diary
									</CardTitle>
								</CardHeader>
								<CardContent>
									<Textarea
										placeholder="Any additional notes about your nutrition today?"
										className="min-h-[120px] border-2 rounded-xl resize-none"
										value={log.foodDiary}
										onChange={(e) =>
											setLog((prev: any) => ({
												...prev,
												foodDiary: e.target.value,
											}))
										}
									/>
								</CardContent>
							</Card>

							<Button
								onClick={handleSave}
								disabled={isSaving}
								className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
							>
								{isSaving ? (
									<Loader2 className="mr-2 h-6 w-6 animate-spin" />
								) : (
									<Save className="mr-2 h-6 w-6" />
								)}
								{isSaving ? "Saving..." : "Save Daily Log"}
							</Button>
						</div>
					</div>

					{/* Coach-Set Daily Targets */}
					{targets && (
						<Card className="border-2">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg font-bold uppercase tracking-tight">
									Daily Targets
								</CardTitle>
								<p className="text-xs text-muted-foreground">
									Set by your coach — aim for these each day.
								</p>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="grid grid-cols-2 gap-3">
									{targets.calories && (
										<div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-3 text-center">
											<div className="text-lg font-black text-orange-600">
												{targets.calories}
											</div>
											<div className="text-[10px] font-bold uppercase tracking-wider text-orange-600/70">
												kcal
											</div>
										</div>
									)}
									{targets.protein && (
										<div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
											<div className="text-lg font-black text-blue-600">
												{targets.protein}g
											</div>
											<div className="text-[10px] font-bold uppercase tracking-wider text-blue-600/70">
												Protein
											</div>
										</div>
									)}
									{targets.carbs && (
										<div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
											<div className="text-lg font-black text-yellow-600">
												{targets.carbs}g
											</div>
											<div className="text-[10px] font-bold uppercase tracking-wider text-yellow-600/70">
												Carbs
											</div>
										</div>
									)}
									{targets.fats && (
										<div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
											<div className="text-lg font-black text-red-600">
												{targets.fats}g
											</div>
											<div className="text-[10px] font-bold uppercase tracking-wider text-red-600/70">
												Fats
											</div>
										</div>
									)}
								</div>
								{targets.micronutrientsGuidance && (
									<p className="text-xs text-muted-foreground border-t pt-3 mt-1">
										<span className="font-bold">Coach notes: </span>
										{targets.micronutrientsGuidance}
									</p>
								)}
							</CardContent>
						</Card>
					)}

					{/* Weekly Wellbeing Summary */}
					{weekLogs.length > 1 && (
						<Card className="border-2">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg font-bold uppercase tracking-tight">
									7-Day Wellbeing Trend
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-7 gap-1 text-center">
									{weekLogs.slice(-7).map((log) => (
										<div key={log.dateKey} className="space-y-1.5">
											<p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
												{new Date(log.dateKey + "T12:00:00").toLocaleDateString(
													undefined,
													{ weekday: "short" },
												)}
											</p>
											<WellbeingDot value={log.mood} color="bg-amber-400" />
											<WellbeingDot value={log.energy} color="bg-yellow-400" />
											<WellbeingDot
												value={log.pain}
												color="bg-red-400"
												inverted
											/>
										</div>
									))}
								</div>
								<div className="flex gap-4 mt-4 text-[10px] text-muted-foreground font-medium">
									<span className="flex items-center gap-1">
										<span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
										Mood
									</span>
									<span className="flex items-center gap-1">
										<span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" />
										Energy
									</span>
									<span className="flex items-center gap-1">
										<span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
										Pain
									</span>
								</div>
							</CardContent>
						</Card>
					)}

					{weekLogs.length > 0 && (
						<Card className="border-2">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg font-bold uppercase tracking-tight">
									Your upload history
								</CardTitle>
							</CardHeader>
							<CardContent>
								<ul className="divide-y rounded-xl border overflow-hidden">
									{[...weekLogs]
										.sort((a, b) =>
											String(b.dateKey).localeCompare(String(a.dateKey)),
										)
										.slice(0, 14)
										.map((log) => (
											<li
												key={String(log.id ?? log.dateKey)}
												className="px-3 py-2.5 text-sm"
											>
												<div className="flex items-center justify-between gap-2">
													<span className="font-semibold">
														{String(log.dateKey)}
													</span>
													{log.updatedAt ? (
														<span className="text-[11px] text-muted-foreground">
															{new Date(log.updatedAt).toLocaleString()}
														</span>
													) : null}
												</div>
												<p className="text-xs text-muted-foreground mt-0.5">
													{log.foodDiary?.trim()
														? "Food diary uploaded"
														: "Nutrition log updated"}
												</p>
											</li>
										))}
								</ul>
							</CardContent>
						</Card>
					)}
				</>
			)}
		</PageTransition>
	);
}
