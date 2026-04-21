import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
	User, 
	CircleNotch,
	Layout,
	Calendar,
	TrendUp,
	SignOut,
	Phone,
	Target,
	Wrench,
	Note,
	Warning,
	IdentificationCard,
	Clock,
	CheckCircle,
	Hourglass,
	EnvelopeSimple,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { toast } from "sonner";
import { config } from "#/lib/config";
import { cn } from "#/lib/utils";
import { PortalProvider, usePortal } from "#/portal/PortalContext";
import { ProtectedLayout } from "#/portal/ProtectedLayout";

export const Route = createFileRoute("/onboarding/dashboard")({
	component: OnboardingDashboardRoute,
});

function Countdown({ expiryDate }: { expiryDate: string }) {
	const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number }>({ d: 0, h: 0, m: 0, s: 0 });

	useEffect(() => {
		const calculate = () => {
			const now = new Date().getTime();
			const end = new Date(expiryDate).getTime();
			const distance = end - now;

			if (distance < 0) {
				setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
				return;
			}

			setTimeLeft({
				d: Math.floor(distance / (1000 * 60 * 60 * 24)),
				h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
				m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
				s: Math.floor((distance % (1000 * 60)) / 1000),
			});
		};

		calculate();
		const interval = setInterval(calculate, 1000);
		return () => clearInterval(interval);
	}, [expiryDate]);

	return (
		<div className="flex gap-4 sm:gap-6 items-center">
			<TimeUnit value={timeLeft.d} label="Days" />
			<TimeUnit value={timeLeft.h} label="Hours" />
			<TimeUnit value={timeLeft.m} label="Mins" />
			<TimeUnit value={timeLeft.s} label="Secs" />
		</div>
	);
}

function TimeUnit({ value, label }: { value: number; label: string }) {
	return (
		<div className="flex flex-col items-center">
			<div className="bg-background/80 backdrop-blur-sm border border-border/60 w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shadow-lg border-b-2 border-b-primary/40">
				<span className="text-lg sm:text-2xl font-black tabular-nums tracking-tighter text-primary">
					{String(value).padStart(2, '0')}
				</span>
			</div>
			<span className="mt-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</span>
		</div>
	);
}

function OnboardingDashboardRoute() {
	return (
		<ProtectedLayout>
			<PortalProvider>
				<Dashboard />
			</PortalProvider>
		</ProtectedLayout>
	);
}

function Dashboard() {
	const navigate = useNavigate();
	const { user: userData, loading: isLoading, error, token } = usePortal();

	const handleLogout = () => {
		localStorage.removeItem("auth_token");
		localStorage.removeItem("user_type");
		toast.success("Logged out successfully");
		window.location.href = "/login";
	};

	if (isLoading && !userData) {
		return (
			<div className="flex h-[80vh] items-center justify-center">
				<CircleNotch className="w-10 h-10 animate-spin text-primary" />
			</div>
		);
	}

	if (!userData) return null;

	const isYouth = userData.athleteType === "youth";
	const isAdult = userData.athleteType === "adult";
	const isTeam = userData.role === "coach";
	const isGuardian = userData.role === "guardian";

	const athletesData = userData.allAthletes || (userData.athleteId ? [userData] : []);

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		return new Date(dateString).toLocaleDateString(undefined, {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
			<section className="space-y-10 animate-in fade-in duration-700">
				{/* Header */}
				<div className="flex items-center justify-between gap-4">
					<div className="space-y-2">
						<h1 className="text-3xl font-black uppercase italic tracking-tight leading-none">
							Dashboard
						</h1>
						<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold uppercase tracking-widest text-primary/80">
							{isYouth && (
								<>
									<span>Guardian: {userData.name}</span>
									<span className="text-muted-foreground/30">•</span>
									<span>Athlete: {userData.athleteName}</span>
								</>
							)}
							{isAdult && (
								<span>Athlete: {userData.name}</span>
							)}
							{isTeam && (
								<span>Team: {userData.name}</span>
							)}
						</div>
					</div>
					<Button 
						variant="ghost" 
						size="icon" 
						onClick={handleLogout}
						className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
					>
						<SignOut size={24} weight="bold" />
					</Button>
				</div>

				<div className="grid gap-6 md:grid-cols-3">
					{/* Status Card */}
					<Card className="p-6 sm:p-8 rounded-[2rem] border border-border/40 bg-card/60 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center space-y-4 group">
						<div className="p-4 bg-primary/10 rounded-2xl text-primary">
							<Layout size={32} weight="bold" />
						</div>
						<div className="space-y-1">
							<h3 className="font-bold text-lg leading-none">Registration</h3>
							<p className="text-xs text-muted-foreground">Profile Status</p>
						</div>
						<div className={cn(
							"text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full",
							userData.onboardingCompleted ? "bg-green-500/20 text-green-500" : "bg-primary/20 text-primary"
						)}>
							{userData.onboardingCompleted ? "Active Member" : "In Progress"}
						</div>
					</Card>

					{/* Profile Card */}
					<Card className="p-6 sm:p-8 rounded-[2rem] border border-border/40 bg-card/60 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center space-y-4 group">
						<div className="p-4 bg-primary/10 rounded-2xl text-primary">
							<User size={32} weight="bold" />
						</div>
						<div className="space-y-1">
							<h3 className="font-bold text-lg leading-none">Account</h3>
							<p className="text-xs text-muted-foreground truncate max-w-[200px]">{userData.email}</p>
						</div>
						<Link to="/profile" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
							View Settings
						</Link>
					</Card>

					{/* Program Card */}
					<Card className="p-6 sm:p-8 rounded-[2rem] border border-border/40 bg-card/60 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center space-y-4 group">
						<div className="p-4 bg-primary/10 rounded-2xl text-primary">
							<TrendUp size={32} weight="bold" />
						</div>
						<div className="space-y-1">
							<h3 className="font-bold text-lg leading-none">Current Tier</h3>
							<p className="text-xs text-muted-foreground">{userData.programTier?.replace(/_/g, ' ') || "No active plan"}</p>
						</div>
						{userData.planExpiresAt && (
							<div className="w-full space-y-2 px-4">
								<div className="flex justify-between items-end">
									<span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
										Plan Progress
									</span>
									<span className="text-[9px] font-black uppercase text-primary">
										{Math.max(0, Math.ceil((new Date(userData.planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} Days Left
									</span>
								</div>
								<div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
									<div 
										className="h-full bg-primary transition-all duration-1000 ease-out"
										style={{ 
											width: `${Math.min(100, Math.max(0, 
												((new Date(userData.planExpiresAt).getTime() - Date.now()) / 
												(new Date(userData.planExpiresAt).getTime() - new Date(userData.planCreatedAt || userData.createdAt).getTime() || 1)) * 100
											))}%` 
										}}
									/>
								</div>
								<div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
									<Clock size={10} weight="bold" className="text-primary" />
									{userData.planPaymentType === 'monthly' ? 'Next Charge: ' : 'Plan Ends: '}
									{formatDate(userData.planExpiresAt)}
								</div>
							</div>
						)}
						{!userData.programTier && (
							<Link to="/onboarding/step-1">
								<Button size="sm" className="h-8 px-4 rounded-full text-[10px] font-black uppercase">
									Finish Onboarding
								</Button>
							</Link>
						)}
					</Card>
				</div>

				{/* Plan Countdown Section */}
				{userData.planExpiresAt && (
					<Card className="p-8 sm:p-10 rounded-[2rem] border border-primary/20 bg-primary/5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
						<div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -mr-48 -mt-48 blur-3xl" />
						
						<div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
							<div className="space-y-2 text-center md:text-left">
								<div className="flex items-center justify-center md:justify-start gap-3 text-primary">
									<Hourglass size={28} weight="fill" className="animate-pulse" />
									<h2 className="text-2xl font-black uppercase italic tracking-tight">Plan Countdown</h2>
								</div>
								<p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">
									Time remaining until your {userData.planPaymentType === 'monthly' ? 'next renewal' : 'plan ends'}
								</p>
							</div>

							<Countdown expiryDate={userData.planExpiresAt} />

							<div className="hidden lg:block space-y-1 text-right">
								<p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Final Date</p>
								<p className="text-sm font-black text-primary uppercase">{formatDate(userData.planExpiresAt)}</p>
							</div>
						</div>
					</Card>
				)}

				{/* Athletes Performance Section */}
				{athletesData.length > 0 && (
					<div className="space-y-6">
						<div className="flex items-center gap-3">
							<TrendUp size={24} weight="bold" className="text-primary" />
							<h2 className="text-xl font-black uppercase italic">Performance Stats</h2>
						</div>

						<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{athletesData.map((athlete: any) => (
								<Card key={athlete.id} className="p-6 rounded-[2rem] border border-border/40 bg-card/60 backdrop-blur-xl shadow-xl space-y-4 hover:border-primary/40 transition-all duration-300 group">
									<div className="flex items-center justify-between border-b border-border/40 pb-3">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
												<User size={20} weight="bold" />
											</div>
											<div className="flex flex-col">
												<span className="text-sm font-black uppercase tracking-tight leading-none">
													{athlete.name || athlete.athleteName}
												</span>
												<span className="text-[10px] font-bold text-muted-foreground uppercase">
													{athlete.athleteType}
												</span>
											</div>
										</div>
										<div className="bg-primary/20 text-primary text-[10px] font-black uppercase px-2 py-1 rounded-lg">
											{athlete.currentProgramTier || "No Tier"}
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-1">
											<span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
												Finished Sessions
											</span>
											<div className="flex items-center gap-2">
												<CheckCircle size={16} weight="bold" className="text-green-500" />
												<span className="text-lg font-black text-foreground">
													{athlete.trainingStats?.finishedSessions || 0}
												</span>
											</div>
										</div>
										<div className="space-y-1">
											<span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
												Finished Modules
											</span>
											<div className="flex items-center gap-2">
												<Layout size={16} weight="bold" className="text-primary" />
												<span className="text-lg font-black text-foreground">
													{athlete.trainingStats?.finishedModules || 0}
												</span>
											</div>
										</div>
									</div>

									{athlete.planExpiresAt && (
										<div className="space-y-2 pt-2 border-t border-border/20">
											<div className="flex justify-between items-end">
												<span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
													Plan Validity
												</span>
												<span className="text-[10px] font-black uppercase text-primary">
													{Math.max(0, Math.ceil((new Date(athlete.planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} Days Left
												</span>
											</div>
											<div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
												<div 
													className="h-full bg-primary transition-all duration-1000 ease-out"
													style={{ 
														width: `${Math.min(100, Math.max(0, 
															((new Date(athlete.planExpiresAt).getTime() - Date.now()) / 
															(new Date(athlete.planExpiresAt).getTime() - new Date(athlete.planCreatedAt || athlete.createdAt).getTime() || 1)) * 100
														))}%` 
													}}
												/>
											</div>
											<div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">
												<Clock size={10} weight="bold" className="text-primary" />
												{athlete.planPaymentType === 'monthly' ? 'Next Charge: ' : 'Plan Ends: '}
												{formatDate(athlete.planExpiresAt)}
											</div>
										</div>
									)}
								</Card>
							))}
						</div>
					</div>
				)}

				<div className="grid gap-6 md:grid-cols-2">
					{/* Detailed Athlete Info */}
					<Card className="p-8 sm:p-10 rounded-[2rem] border border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl space-y-8">
						<div className="flex items-center gap-3">
							<IdentificationCard size={24} weight="bold" className="text-primary" />
							<h2 className="text-xl font-black uppercase italic">Athlete Profile</h2>
						</div>

						<div className="grid gap-6 sm:grid-cols-2">
							<DetailItem label="Full Name" value={userData.athleteName || userData.name} icon={User} />
							<DetailItem label="Email" value={userData.email} icon={EnvelopeSimple} />
							<DetailItem label="Phone" value={userData.phoneNumber || "N/A"} icon={Phone} />
							<DetailItem label="Birth Date" value={formatDate(userData.birthDate)} icon={Calendar} />
							<DetailItem label="Athlete Type" value={userData.athleteType || "N/A"} icon={Layout} className="capitalize" />
						</div>
					</Card>

					{/* Goals & Access */}
					<Card className="p-8 sm:p-10 rounded-[2rem] border border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl space-y-8">
						<div className="flex items-center gap-3">
							<Target size={24} weight="bold" className="text-primary" />
							<h2 className="text-xl font-black uppercase italic">Training & Goals</h2>
						</div>

						<div className="grid gap-6 sm:grid-cols-2">
							<DetailItem label="Frequency" value={`${userData.trainingPerWeek || 0} days / week`} icon={Calendar} />
							<DetailItem label="Equipment" value={userData.equipmentAccess || "N/A"} icon={Wrench} className="capitalize" />
							<div className="sm:col-span-2">
								<DetailItem label="Performance Goals" value={userData.performanceGoals || "N/A"} icon={Target} />
							</div>
							{userData.growthNotes && (
								<div className="sm:col-span-2">
									<DetailItem label="Growth Notes" value={userData.growthNotes} icon={Note} />
								</div>
							)}
							{userData.injuries?.notes && (
								<div className="sm:col-span-2">
									<DetailItem label="Injuries" value={userData.injuries.notes} icon={Warning} destructive />
								</div>
							)}
						</div>
					</Card>
				</div>

				{/* Activity Feed */}
				<Card className="p-8 sm:p-10 rounded-[2rem] border border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
					<div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
					
					<div className="relative z-10 space-y-6">
						<div className="flex items-center gap-3">
							<Calendar size={24} weight="bold" className="text-primary" />
							<h2 className="text-xl font-black uppercase italic">Activity Feed</h2>
						</div>
						
						<div className="space-y-4">
							<div className="p-4 rounded-2xl border border-border/40 bg-background/30 text-sm font-medium text-muted-foreground italic text-center">
								No recent activity to show.
							</div>
						</div>
					</div>
				</Card>
			</section>
		</main>
	);
}

function DetailItem({ 
	label, 
	value, 
	icon: Icon, 
	className,
	destructive = false 
}: { 
	label: string; 
	value: string; 
	icon: any; 
	className?: string;
	destructive?: boolean;
}) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
				{label}
			</span>
			<div className="flex items-center gap-2.5">
				<Icon size={18} weight="bold" className={cn(destructive ? "text-destructive" : "text-primary")} />
				<span className={cn("text-sm font-bold truncate", destructive && "text-destructive", className)}>
					{value}
				</span>
			</div>
		</div>
	);
}
