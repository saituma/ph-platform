import {
	Calendar,
	CheckCircle,
	CircleNotch,
	Clock,
	EnvelopeSimple,
	Hourglass,
	IdentificationCard,
	Layout,
	Note,
	Phone,
	SignOut,
	Target,
	TrendUp,
	User,
	Warning,
	Wrench,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { cn } from "#/lib/utils";
import { PortalProvider, usePortal } from "#/portal/PortalContext";
import { ProtectedLayout } from "#/portal/ProtectedLayout";
import {
	PORTAL_SERVICE_UNAVAILABLE,
	PORTAL_UNAUTHORIZED_ERROR,
} from "#/portal/portal-errors";
import { useRedirectOnPortalUnauthorized } from "#/portal/use-redirect-on-portal-unauthorized";

export const Route = createFileRoute("/onboarding/dashboard")({
	component: OnboardingDashboardRoute,
});

function Countdown({ expiryDate }: { expiryDate: string }) {
	const [timeLeft, setTimeLeft] = useState<{
		d: number;
		h: number;
		m: number;
		s: number;
	}>({ d: 0, h: 0, m: 0, s: 0 });

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
			<div className="bg-background border border-foreground/[0.06] w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
				<span className="text-lg sm:text-2xl font-medium tabular-nums tracking-tighter text-foreground">
					{String(value).padStart(2, "0")}
				</span>
			</div>
			<span className="mt-1.5 font-mono text-[8px] uppercase tracking-wider text-foreground/40">
				{label}
			</span>
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
	useRedirectOnPortalUnauthorized();
	const { user: userData, loading: isLoading, error, refresh } = usePortal();

	const handleLogout = () => {
		localStorage.removeItem("auth_token");
		localStorage.removeItem("user_type");
		toast.success("Logged out successfully");
		window.location.href = "/login";
	};

	if (isLoading && !userData) {
		return (
			<div className="flex h-[80vh] items-center justify-center">
				<CircleNotch className="w-10 h-10 animate-spin text-foreground/40" />
			</div>
		);
	}

	if (error === PORTAL_UNAUTHORIZED_ERROR) {
		return (
			<div className="flex h-[80vh] flex-col items-center justify-center gap-3">
				<CircleNotch className="w-10 h-10 animate-spin text-foreground/40" />
				<p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
			</div>
		);
	}

	if (error === PORTAL_SERVICE_UNAVAILABLE) {
		return (
			<div className="flex h-[80vh] flex-col items-center justify-center gap-4 px-4">
				<p className="max-w-md text-center text-sm font-semibold text-foreground">
					The service cannot reach the database right now.
				</p>
				<p className="max-w-md text-center text-xs text-muted-foreground leading-relaxed">
					Try again in a moment, or confirm your API database is running (e.g.
					Neon not paused).
				</p>
				<Button
					type="button"
					onClick={() => void refresh()}
					className="bg-foreground text-background font-mono text-xs uppercase tracking-wider"
				>
					Retry
				</Button>
			</div>
		);
	}

	if (!userData) return null;

	const isYouth = userData.athleteType === "youth";
	const isAdult = userData.athleteType === "adult";
	const isTeam = userData.role === "coach";

	const athletesData =
		userData.allAthletes || (userData.athleteId ? [userData] : []);

	const formatDate = (dateString: string | null | undefined) => {
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
						<h1 className="text-3xl font-medium tracking-tight leading-none">
							Dashboard
						</h1>
						<div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-wider text-foreground/60">
							{isYouth && (
								<>
									<span>Guardian: {userData.name}</span>
									<span className="text-foreground/20">•</span>
									<span>Athlete: {userData.athleteName}</span>
								</>
							)}
							{isAdult && <span>Athlete: {userData.name}</span>}
							{isTeam && <span>Team: {userData.name}</span>}
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleLogout}
						className="hover:bg-destructive/10 hover:text-destructive"
					>
						<SignOut size={24} weight="bold" />
					</Button>
				</div>

				<div className="grid gap-6 md:grid-cols-3">
					{/* Status Card */}
					<Card className="p-6 sm:p-8 border border-foreground/[0.06] transition-all duration-300 flex flex-col items-center text-center space-y-4 group">
						<div className="p-4 text-foreground/40">
							<Layout size={32} weight="bold" />
						</div>
						<div className="space-y-1">
							<h3 className="font-medium text-lg leading-none">Registration</h3>
							<p className="text-xs text-muted-foreground">Profile Status</p>
						</div>
						<div
							className={cn(
								"font-mono text-[10px] uppercase tracking-wider px-3 py-1.5",
								userData.onboardingCompleted
									? "bg-foreground/10 text-foreground/60"
									: "bg-foreground/10 text-foreground/60",
							)}
						>
							{userData.onboardingCompleted ? "Active Member" : "In Progress"}
						</div>
					</Card>

					{/* Profile Card */}
					<Card className="p-6 sm:p-8 border border-foreground/[0.06] transition-all duration-300 flex flex-col items-center text-center space-y-4 group">
						<div className="p-4 text-foreground/40">
							<User size={32} weight="bold" />
						</div>
						<div className="space-y-1">
							<h3 className="font-medium text-lg leading-none">Account</h3>
							<p className="text-xs text-muted-foreground truncate max-w-[200px]">
								{userData.email}
							</p>
						</div>
						<Link
							to="/portal/profile"
							className="font-mono text-[10px] uppercase tracking-wider text-foreground/60 hover:underline"
						>
							View Settings
						</Link>
					</Card>

					{/* Program Card */}
					<Card className="p-6 sm:p-8 border border-foreground/[0.06] transition-all duration-300 flex flex-col items-center text-center space-y-4 group">
						<div className="p-4 text-foreground/40">
							<TrendUp size={32} weight="bold" />
						</div>
						<div className="space-y-1">
							<h3 className="font-medium text-lg leading-none">Current Tier</h3>
							<p className="text-xs text-muted-foreground">
								{userData.programTier?.replace(/_/g, " ") || "No active plan"}
							</p>
						</div>
						{userData.planExpiresAt && (
							<div className="w-full space-y-2 px-4">
								<div className="flex justify-between items-end">
									<span className="font-mono text-[9px] uppercase tracking-wider text-foreground/40">
										Plan Progress
									</span>
									<span className="font-mono text-[9px] uppercase tracking-wider text-foreground/60">
										{Math.max(
											0,
											Math.ceil(
												(new Date(userData.planExpiresAt).getTime() -
													Date.now()) /
													(1000 * 60 * 60 * 24),
											),
										)}{" "}
										Days Left
									</span>
								</div>
								<div className="h-1.5 w-full bg-foreground/[0.06] overflow-hidden">
									<div
										className="h-full bg-foreground/40 transition-all duration-1000 ease-out"
										style={{
											width: `${Math.min(
												100,
												Math.max(
													0,
													((new Date(userData.planExpiresAt).getTime() -
														Date.now()) /
														(new Date(userData.planExpiresAt).getTime() -
															new Date(
																userData.planCreatedAt || userData.createdAt || userData.planExpiresAt,
															).getTime() || 1)) *
														100,
												),
											)}%`,
										}}
									/>
								</div>
								<div className="flex items-center justify-center gap-1.5 font-mono text-[9px] text-foreground/40 uppercase tracking-wider">
									<Clock size={10} weight="bold" className="text-foreground/40" />
									{userData.planPaymentType === "monthly"
										? "Next Charge: "
										: "Plan Ends: "}
									{formatDate(userData.planExpiresAt)}
								</div>
							</div>
						)}
						{!userData.programTier && (
							<Link to="/onboarding/step-1">
								<Button
									size="sm"
									className="h-8 px-4 bg-foreground text-background font-mono text-[10px] uppercase tracking-wider"
								>
									Finish Onboarding
								</Button>
							</Link>
						)}
					</Card>
				</div>

				{/* Plan Countdown Section */}
				{userData.planExpiresAt && (
					<Card className="p-8 sm:p-10 border border-foreground/[0.06] relative overflow-hidden">
						<div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
							<div className="space-y-2 text-center md:text-left">
								<div className="flex items-center justify-center md:justify-start gap-3 text-foreground/60">
									<Hourglass
										size={28}
										weight="fill"
									/>
									<h2 className="font-mono text-xs uppercase tracking-wider text-foreground">
										Plan Countdown
									</h2>
								</div>
								<p className="font-mono text-[9px] uppercase tracking-wider text-foreground/40">
									Time remaining until your{" "}
									{userData.planPaymentType === "monthly"
										? "next renewal"
										: "plan ends"}
								</p>
							</div>

							<Countdown expiryDate={userData.planExpiresAt} />

							<div className="hidden lg:block space-y-1 text-right">
								<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
									Final Date
								</p>
								<p className="text-sm font-medium text-foreground">
									{formatDate(userData.planExpiresAt)}
								</p>
							</div>
						</div>
					</Card>
				)}

				{/* Athletes Performance Section */}
				{athletesData.length > 0 && (
					<div className="space-y-6">
						<div className="flex items-center gap-3">
							<TrendUp size={24} weight="bold" className="text-foreground/40" />
							<h2 className="font-mono text-xs uppercase tracking-wider text-foreground">
								Performance Stats
							</h2>
						</div>

						<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{athletesData.map((athlete: any) => (
								<Card
									key={athlete.id}
									className="p-6 border border-foreground/[0.06] space-y-4 hover:border-foreground/20 transition-all duration-300 group"
								>
									<div className="flex items-center justify-between border-b border-foreground/[0.06] pb-3">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 bg-foreground/10 flex items-center justify-center text-foreground/60">
												<User size={20} weight="bold" />
											</div>
											<div className="flex flex-col">
												<span className="text-sm font-medium tracking-tight leading-none">
													{athlete.name || athlete.athleteName}
												</span>
												<span className="font-mono text-[10px] text-foreground/40 uppercase">
													{athlete.athleteType}
												</span>
											</div>
										</div>
										<div className="bg-foreground/10 text-foreground/60 font-mono text-[10px] uppercase px-2 py-1">
											{athlete.currentProgramTier || "No Tier"}
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-1">
											<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
												Finished Sessions
											</span>
											<div className="flex items-center gap-2">
												<CheckCircle
													size={16}
													weight="bold"
													className="text-foreground/40"
												/>
												<span className="text-lg font-medium text-foreground">
													{athlete.trainingStats?.finishedSessions || 0}
												</span>
											</div>
										</div>
										<div className="space-y-1">
											<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
												Finished Modules
											</span>
											<div className="flex items-center gap-2">
												<Layout
													size={16}
													weight="bold"
													className="text-foreground/40"
												/>
												<span className="text-lg font-medium text-foreground">
													{athlete.trainingStats?.finishedModules || 0}
												</span>
											</div>
										</div>
									</div>

									{athlete.planExpiresAt && (
										<div className="space-y-2 pt-2 border-t border-foreground/[0.06]">
											<div className="flex justify-between items-end">
												<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
													Plan Validity
												</span>
												<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/60">
													{Math.max(
														0,
														Math.ceil(
															(new Date(athlete.planExpiresAt).getTime() -
																Date.now()) /
																(1000 * 60 * 60 * 24),
														),
													)}{" "}
													Days Left
												</span>
											</div>
											<div className="h-1.5 w-full bg-foreground/[0.06] overflow-hidden">
												<div
													className="h-full bg-foreground/40 transition-all duration-1000 ease-out"
													style={{
														width: `${Math.min(
															100,
															Math.max(
																0,
																((new Date(athlete.planExpiresAt).getTime() -
																	Date.now()) /
																	(new Date(athlete.planExpiresAt).getTime() -
																		new Date(
																			athlete.planCreatedAt ||
																				athlete.createdAt,
																		).getTime() || 1)) *
																	100,
															),
														)}%`,
													}}
												/>
											</div>
											<div className="flex items-center gap-1.5 font-mono text-[9px] text-foreground/40 uppercase tracking-wider">
												<Clock
													size={10}
													weight="bold"
													className="text-foreground/40"
												/>
												{athlete.planPaymentType === "monthly"
													? "Next Charge: "
													: "Plan Ends: "}
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
					<Card className="p-8 sm:p-10 border border-foreground/[0.06] space-y-8">
						<div className="flex items-center gap-3">
							<IdentificationCard
								size={24}
								weight="bold"
								className="text-foreground/40"
							/>
							<h2 className="font-mono text-xs uppercase tracking-wider text-foreground">
								Athlete Profile
							</h2>
						</div>

						<div className="grid gap-6 sm:grid-cols-2">
							<DetailItem
								label="Full Name"
								value={userData.athleteName || userData.name}
								icon={User}
							/>
							<DetailItem
								label="Email"
								value={userData.email}
								icon={EnvelopeSimple}
							/>
							<DetailItem
								label="Phone"
								value={userData.phoneNumber || "N/A"}
								icon={Phone}
							/>
							<DetailItem
								label="Birth Date"
								value={formatDate(userData.birthDate)}
								icon={Calendar}
							/>
							<DetailItem
								label="Athlete Type"
								value={userData.athleteType || "N/A"}
								icon={Layout}
								className="capitalize"
							/>
						</div>
					</Card>

					{/* Goals & Access */}
					<Card className="p-8 sm:p-10 border border-foreground/[0.06] space-y-8">
						<div className="flex items-center gap-3">
							<Target size={24} weight="bold" className="text-foreground/40" />
							<h2 className="font-mono text-xs uppercase tracking-wider text-foreground">
								Training & Goals
							</h2>
						</div>

						<div className="grid gap-6 sm:grid-cols-2">
							<DetailItem
								label="Frequency"
								value={`${userData.trainingPerWeek || 0} days / week`}
								icon={Calendar}
							/>
							<DetailItem
								label="Equipment"
								value={userData.equipmentAccess || "N/A"}
								icon={Wrench}
								className="capitalize"
							/>
							<div className="sm:col-span-2">
								<DetailItem
									label="Performance Goals"
									value={userData.performanceGoals || "N/A"}
									icon={Target}
								/>
							</div>
							{userData.growthNotes && (
								<div className="sm:col-span-2">
									<DetailItem
										label="Growth Notes"
										value={userData.growthNotes}
										icon={Note}
									/>
								</div>
							)}
							{userData.injuries?.notes && (
								<div className="sm:col-span-2">
									<DetailItem
										label="Injuries"
										value={userData.injuries.notes}
										icon={Warning}
										destructive
									/>
								</div>
							)}
						</div>
					</Card>
				</div>

				{/* Activity Feed */}
				<Card className="p-8 sm:p-10 border border-foreground/[0.06] relative overflow-hidden">
					<div className="relative z-10 space-y-6">
						<div className="flex items-center gap-3">
							<Calendar size={24} weight="bold" className="text-foreground/40" />
							<h2 className="font-mono text-xs uppercase tracking-wider text-foreground">
								Activity Feed
							</h2>
						</div>

						<div className="space-y-4">
							<div className="p-4 border border-foreground/[0.06] text-sm font-medium text-muted-foreground text-center">
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
	destructive = false,
}: {
	label: string;
	value: string;
	icon: any;
	className?: string;
	destructive?: boolean;
}) {
	return (
		<div className="flex flex-col gap-1">
			<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
				{label}
			</span>
			<div className="flex items-center gap-2.5">
				<Icon
					size={18}
					weight="bold"
					className={cn(destructive ? "text-destructive" : "text-foreground/40")}
				/>
				<span
					className={cn(
						"text-sm font-medium truncate",
						destructive && "text-destructive",
						className,
					)}
				>
					{value}
				</span>
			</div>
		</div>
	);
}
