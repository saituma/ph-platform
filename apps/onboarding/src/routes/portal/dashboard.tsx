import { createFileRoute, Link } from "@tanstack/react-router";
import { usePortal } from "@/portal/PortalContext";
import {
	fetchHomeContent,
} from "@/services/homeService";
import { useQuery } from "@tanstack/react-query";

export const homeKeys = {
	all: ["home"] as const,
	content: (token: string | null) => [...homeKeys.all, "content", token] as const,
};

export const Route = createFileRoute("/portal/dashboard")({
	loader: async ({ context: { queryClient } }) => {
		const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
		if (token) {
			await queryClient.ensureQueryData({
				queryKey: homeKeys.content(token),
				queryFn: () => fetchHomeContent(token),
			});
		}
	},
	component: DashboardPage,
});

function DashboardPage() {
	const {
		user,
		token,
		loading: portalLoading,
		error: portalError,
	} = usePortal();

	const {
		data: homeContent,
		isLoading: homeLoading,
		error: homeError,
	} = useQuery({
		queryKey: homeKeys.content(token),
		queryFn: () => fetchHomeContent(token!),
		enabled: !!token && !portalLoading,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	if (portalLoading || (token && homeLoading && !homeContent)) {
		return (
			<div className="flex h-screen items-center justify-center pb-20">
				<div className="text-center">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
					<p className="mt-4 text-sm text-muted-foreground">
						Loading your dashboard...
					</p>
				</div>
			</div>
		);
	}

	if (portalError || !user) {
		return (
			<div className="flex h-screen items-center justify-center pb-20 px-4">
				<div className="text-center space-y-4">
					<p className="text-muted-foreground mb-4">
						{portalError || "Please log in to access your dashboard"}
					</p>
					<Link
						to="/login"
						className="px-4 py-2 border rounded-lg hover:bg-primary/10 inline-block"
					>
						Go to Login
					</Link>
				</div>
			</div>
		);
	}

	const name = user.athleteName || user.name || "Athlete";
	const planType =
		user.programTier
			?.replace(/_+/g, " ")
			.replace(/\b\w/g, (c) => c.toUpperCase()) || "No Active Plan";

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString(undefined, {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	return (
		<div className="container mx-auto p-4 pb-20 space-y-6">
			{homeError && (
				<div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
					{homeError instanceof Error ? homeError.message : "Error loading dashboard"}
				</div>
			)}

			{/* Hero Content from Mobile API */}
			{homeContent && (
				<div className="relative rounded-3xl overflow-hidden bg-primary/5 border border-primary/10 p-6 md:p-8">
					<div className="max-w-2xl">
						<h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight text-foreground mb-2">
							{homeContent.headline || `Welcome back, ${name}!`}
						</h1>
						<p className="text-muted-foreground font-medium text-lg leading-relaxed">
							{homeContent.description || "Your daily performance overview."}
						</p>
						{homeContent.introVideoUrl && (
							<a
								href={homeContent.introVideoUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="currentColor"
									aria-hidden="true"
									focusable="false"
								>
									<path d="M8 5v14l11-7z" />
								</svg>
								Watch Intro
							</a>
						)}
					</div>
					{homeContent.heroImageUrl && (
						<div className="hidden lg:block absolute top-1/2 right-8 -translate-y-1/2 w-64 h-64 opacity-20">
							<img
								src={homeContent.heroImageUrl}
								alt=""
								className="w-full h-full object-contain"
							/>
						</div>
					)}
				</div>
			)}

			{!homeContent && (
				<div className="mb-6">
					<h1 className="text-3xl font-bold mb-2">Welcome back, {name}!</h1>
					<p className="text-muted-foreground">
						{user.role && user.role !== "athlete"
							? `Role: ${user.role}`
							: "Athlete Dashboard"}
					</p>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Plan Status Card */}
				<div className="md:col-span-2 rounded-2xl border bg-card p-6 shadow-sm">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="text-xl font-semibold">Current Plan</h2>
							<p className="text-primary font-medium">{planType}</p>
						</div>
						<div className="text-right">
							<p className="text-sm text-muted-foreground">Member since</p>
							<p className="font-medium">
								{formatDate(user.createdAt || new Date().toISOString())}
							</p>
						</div>
					</div>

					{user.planExpiresAt ? (
						<div className="pt-4 border-t">
							<div className="flex justify-between items-center mb-2">
								<p className="text-sm text-muted-foreground">Time Remaining</p>
								<p className="font-bold text-primary">
									{Math.ceil(
										(new Date(user.planExpiresAt).getTime() - Date.now()) /
											(1000 * 60 * 60 * 24),
									)}{" "}
									Days
								</p>
							</div>
							<div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
								<div
									className="h-full bg-primary"
									style={{
										width: `${Math.max(0, Math.min(100, ((new Date(user.planExpiresAt).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)) * 100))}%`,
									}}
								/>
							</div>
							<p className="mt-2 text-xs text-muted-foreground">
								Expires on {formatDate(user.planExpiresAt)}
							</p>
						</div>
					) : (
						<div className="pt-4 border-t">
							<p className="text-sm text-muted-foreground">
								No active subscription found. Explore our plans to get started.
							</p>
						</div>
					)}
				</div>

				{/* User Quick Info */}
				<div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col justify-between">
					<div className="space-y-4">
						<h2 className="text-lg font-semibold">Profile Info</h2>
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Email</span>
								<span className="font-medium">{user.email}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">User ID</span>
								<span className="font-medium">#{user.id}</span>
							</div>
							{user.birthDate && (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Birth Date</span>
									<span className="font-medium">
										{formatDate(user.birthDate)}
									</span>
								</div>
							)}
						</div>
					</div>
					<button
						type="button"
						className="w-full mt-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
					>
						Edit Profile
					</button>
				</div>
			</div>

			{/* Navigation Grid */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Link
					to="/portal/programs"
					className="p-6 border rounded-2xl bg-card hover:border-primary hover:shadow-md transition-all group text-center"
				>
					<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							className="text-primary"
							aria-hidden="true"
							focusable="false"
						>
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
							<polyline points="9 22 9 12 15 12 15 22"></polyline>
						</svg>
					</div>
					<p className="font-bold">Programs</p>
				</Link>
				<Link
					to="/portal/schedule"
					className="p-6 border rounded-2xl bg-card hover:border-primary hover:shadow-md transition-all group text-center"
				>
					<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							className="text-primary"
							aria-hidden="true"
							focusable="false"
						>
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
							<line x1="16" y1="2" x2="16" y2="6"></line>
							<line x1="8" y1="2" x2="8" y2="6"></line>
							<line x1="3" y1="10" x2="21" y2="10"></line>
						</svg>
					</div>
					<p className="font-bold">Schedule</p>
				</Link>
				<Link
					to="/portal/tracking"
					className="p-6 border rounded-2xl bg-card hover:border-primary hover:shadow-md transition-all group text-center"
				>
					<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							className="text-primary"
							aria-hidden="true"
							focusable="false"
						>
							<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
						</svg>
					</div>
					<p className="font-bold">Tracking</p>
				</Link>
				<Link
					to="/portal/more"
					className="p-6 border rounded-2xl bg-card hover:border-primary hover:shadow-md transition-all group text-center"
				>
					<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							className="text-primary"
							aria-hidden="true"
							focusable="false"
						>
							<circle cx="12" cy="12" r="3"></circle>
							<path d="M12 1v6m0 6v6"></path>
						</svg>
					</div>
					<p className="font-bold">More</p>
				</Link>
			</div>

			{/* Testimonials from Mobile API */}
			{homeContent?.testimonials && homeContent.testimonials.length > 0 && (
				<div className="space-y-4">
					<h2 className="text-xl font-bold px-1">What Athletes Say</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{homeContent.testimonials.slice(0, 2).map((t) => (
							<div
								key={t.id}
								className="p-6 rounded-2xl border bg-card/50 italic text-muted-foreground relative"
							>
								<span className="text-4xl absolute top-4 left-4 opacity-10">
									"
								</span>
								<p className="relative z-10 mb-4">{t.quote}</p>
								<div className="flex items-center gap-3">
									{t.photoUrl && (
										<img
											src={t.photoUrl}
											alt=""
											className="w-8 h-8 rounded-full object-cover"
										/>
									)}
									<div>
										<p className="text-sm font-bold text-foreground not-italic">
											{t.name}
										</p>
										{t.role && <p className="text-xs not-italic">{t.role}</p>}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
