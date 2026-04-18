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
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { toast } from "sonner";
import { env } from "#/env";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/onboarding/dashboard")({
	component: Dashboard,
});

function Dashboard() {
	const [userData, setUserData] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchUserData = async () => {
			const token = sessionStorage.getItem("auth_token");
			if (!token) {
				navigate({ to: "/login" });
				return;
			}

			try {
				const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
				const response = await fetch(`${baseUrl}/api/auth/me`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				if (!response.ok) throw new Error("Failed to fetch user data");
				const data = await response.json();
				setUserData(data.user);
			} catch (error) {
				toast.error("Error", { description: "Could not load dashboard data." });
				navigate({ to: "/login" });
			} finally {
				setIsLoading(false);
			}
		};

		fetchUserData();
	}, [navigate]);

	const handleLogout = () => {
		sessionStorage.removeItem("auth_token");
		sessionStorage.removeItem("user_type");
		toast.success("Logged out successfully");
		navigate({ to: "/login" });
	};

	if (isLoading) {
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
					<Card className="p-8 rounded-[2.5rem] border-border/60 bg-card/50 backdrop-blur-sm shadow-xl flex flex-col items-center text-center space-y-4">
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
					<Card className="p-8 rounded-[2.5rem] border-border/60 bg-card/50 backdrop-blur-sm shadow-xl flex flex-col items-center text-center space-y-4">
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
					<Card className="p-8 rounded-[2.5rem] border-border/60 bg-card/50 backdrop-blur-sm shadow-xl flex flex-col items-center text-center space-y-4">
						<div className="p-4 bg-primary/10 rounded-2xl text-primary">
							<TrendUp size={32} weight="bold" />
						</div>
						<div className="space-y-1">
							<h3 className="font-bold text-lg leading-none">Current Tier</h3>
							<p className="text-xs text-muted-foreground">{userData.programTier?.replace(/_/g, ' ') || "No active plan"}</p>
						</div>
						{userData.planExpiresAt && (
							<div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
								<Clock size={12} weight="bold" className="text-primary" />
								Expires: {formatDate(userData.planExpiresAt)}
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

				<div className="grid gap-6 md:grid-cols-2">
					{/* Detailed Athlete Info */}
					<Card className="p-10 rounded-[3rem] border-border/60 bg-card/40 backdrop-blur-md shadow-2xl space-y-8">
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
					<Card className="p-10 rounded-[3rem] border-border/60 bg-card/40 backdrop-blur-md shadow-2xl space-y-8">
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
				<Card className="p-10 rounded-[3rem] border-border/60 bg-card/40 backdrop-blur-md shadow-2xl relative overflow-hidden">
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

function EnvelopeSimple(props: any) {
	return <Layout {...props} />; // Fallback since it wasn't imported
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
