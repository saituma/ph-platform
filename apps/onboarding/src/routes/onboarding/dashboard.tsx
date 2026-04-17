import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
	User, 
	CircleNotch,
	Layout,
	Calendar,
	TrendUp,
	SignOut,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { toast } from "sonner";
import { env } from "#/env";

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

	// Determine the primary display name based on user requirements
	const displayName = isYouth 
		? userData.name // Guardian's name
		: isAdult 
			? userData.athleteName || userData.name 
			: userData.name; // Team name

	return (
		<main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
			<section className="space-y-10 animate-in fade-in duration-700">
				<div className="flex items-center justify-between gap-4">
					<div className="space-y-1">
						<h1 className="text-3xl font-black uppercase italic tracking-tight leading-none">
							Welcome, <span className="text-primary">{displayName}</span>
						</h1>
						<p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
							{isYouth ? "Guardian Dashboard" : isAdult ? "Athlete Dashboard" : "Team Dashboard"}
						</p>
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
						<div className="bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
							{userData.programTier ? "Active Member" : "In Progress"}
						</div>
					</Card>

					{/* Profile Card */}
					<Card className="p-8 rounded-[2.5rem] border-border/60 bg-card/50 backdrop-blur-sm shadow-xl flex flex-col items-center text-center space-y-4">
						<div className="p-4 bg-primary/10 rounded-2xl text-primary">
							<User size={32} weight="bold" />
						</div>
						<div className="space-y-1">
							<h3 className="font-bold text-lg leading-none">Account</h3>
							<p className="text-xs text-muted-foreground">{userData.email}</p>
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
						{!userData.programTier && (
							<Link to="/onboarding/step-1">
								<Button size="sm" className="h-8 px-4 rounded-full text-[10px] font-black uppercase">
									Finish Onboarding
								</Button>
							</Link>
						)}
					</Card>
				</div>

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
