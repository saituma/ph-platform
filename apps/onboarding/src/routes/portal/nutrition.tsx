import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { usePortal } from "@/portal/PortalContext";
import { settingsService } from "@/services/settingsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, ChevronLeft, ChevronRight, Loader2, Save, Utensils, Droplets, Footprints, Moon, Smile, Zap, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portal/nutrition")({
	component: NutritionPage,
});

function NutritionPage() {
	const { user } = usePortal();
	const [date, setDate] = useState(new Date());
	const [loading, setLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	
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

	const fetchData = useCallback(async () => {
		if (!user) return;
		setLoading(true);
		try {
			const data = await settingsService.getNutritionLogs({
				userId: user.id || "me",
				from: dateKey,
				to: dateKey,
			});
			const currentLog = data.logs.find((l: any) => l.dateKey === dateKey);
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
		} catch (error) {
			console.error("Failed to fetch nutrition log", error);
		} finally {
			setLoading(false);
		}
	}, [user, dateKey]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

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

	const renderMetric = (label: string, icon: any, value: number, key: string) => (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				{icon}
				<span className="text-sm font-bold uppercase tracking-wider">{label}</span>
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
								: "bg-muted/50 border-transparent hover:border-primary/20"
						)}
					>
						{val}
					</button>
				))}
			</div>
		</div>
	);

	return (
		<div className="p-6 max-w-4xl mx-auto space-y-6">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h1 className="text-3xl font-black uppercase italic tracking-tighter">Nutrition & Wellness</h1>
					<p className="text-muted-foreground">Log your daily metrics and track your progress.</p>
				</div>
				
				<div className="flex items-center bg-card border-2 rounded-xl p-1 shrink-0">
					<Button variant="ghost" size="icon" onClick={() => changeDate(-1)} className="rounded-lg">
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<div className="flex items-center gap-2 px-4 min-w-[140px] justify-center font-bold text-sm uppercase">
						<Calendar className="h-4 w-4 text-primary" />
						{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
					</div>
					<Button variant="ghost" size="icon" onClick={() => changeDate(1)} className="rounded-lg">
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{loading ? (
				<div className="h-64 flex items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="space-y-6">
						<Card className="border-2">
							<CardHeader className="pb-3">
								<div className="flex items-center gap-2 text-primary">
									<Utensils className="h-5 w-5" />
									<CardTitle className="text-lg font-bold uppercase tracking-tight">Meal Checklist</CardTitle>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								{["breakfast", "lunch", "dinner", "snacksMorning", "snacksAfternoon", "snacksEvening"].map((meal) => (
									<div key={meal} className="space-y-2">
										<div 
											className={cn(
												"flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all",
												log[meal] ? "border-primary bg-primary/5" : "border-transparent bg-muted/30"
											)}
											onClick={() => toggleMeal(meal)}
										>
											<Label className="capitalize font-bold cursor-pointer">{meal.replace(/([A-Z])/g, ' $1')}</Label>
											<Checkbox checked={!!log[meal]} />
										</div>
										{!!log[meal] && (
											<Input 
												value={log[meal] === "yes" ? "" : log[meal]}
												onChange={(e) => setLog((prev: any) => ({ ...prev, [meal]: e.target.value || "yes" }))}
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
								<CardTitle className="text-lg font-bold uppercase tracking-tight">Daily Habits</CardTitle>
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
											onClick={() => setLog((prev: any) => ({ ...prev, waterIntake: Math.max(0, prev.waterIntake - 1) }))}
										>-</Button>
										<span className="w-8 text-center font-black">{log.waterIntake}</span>
										<Button 
											variant="outline" 
											size="icon" 
											className="h-8 w-8 rounded-lg"
											onClick={() => setLog((prev: any) => ({ ...prev, waterIntake: prev.waterIntake + 1 }))}
										>+</Button>
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
										onChange={(e) => setLog((prev: any) => ({ ...prev, steps: parseInt(e.target.value) || 0 }))}
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
										onChange={(e) => setLog((prev: any) => ({ ...prev, sleepHours: parseInt(e.target.value) || 0 }))}
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
									<CardTitle className="text-lg font-bold uppercase tracking-tight">Wellbeing</CardTitle>
								</div>
							</CardHeader>
							<CardContent className="space-y-8">
								{renderMetric("Mood Tracker", <Smile className="h-4 w-4 text-amber-500" />, log.mood, "mood")}
								{renderMetric("Energy Levels", <Zap className="h-4 w-4 text-yellow-500" />, log.energy, "energy")}
								{renderMetric("Pain Levels", <Activity className="h-4 w-4 text-red-500" />, log.pain, "pain")}
							</CardContent>
						</Card>

						<Card className="border-2">
							<CardHeader>
								<CardTitle className="text-lg font-bold uppercase tracking-tight">Food Diary</CardTitle>
							</CardHeader>
							<CardContent>
								<Textarea 
									placeholder="Any additional notes about your nutrition today?"
									className="min-h-[120px] border-2 rounded-xl resize-none"
									value={log.foodDiary}
									onChange={(e) => setLog((prev: any) => ({ ...prev, foodDiary: e.target.value }))}
								/>
							</CardContent>
						</Card>

						<Button 
							onClick={handleSave} 
							disabled={isSaving}
							className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
						>
							{isSaving ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />}
							{isSaving ? "Saving..." : "Save Daily Log"}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
