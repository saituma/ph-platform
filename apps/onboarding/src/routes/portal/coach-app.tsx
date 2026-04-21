import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ExternalLink,
	LayoutDashboard,
	Smartphone,
	Users,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getClientAuthToken } from "@/lib/client-storage";
import { isCoachPortalUser } from "@/lib/portal-access";
import { usePortal } from "@/portal/PortalContext";
import { fetchHomeContent, homeQueryKeys } from "@/services/homeService";

export const Route = createFileRoute("/portal/coach-app")({
	loader: async ({ context: { queryClient } }) => {
		const token = getClientAuthToken();
		if (token) {
			await queryClient.ensureQueryData({
				queryKey: homeQueryKeys.content(token),
				queryFn: () => fetchHomeContent(token),
			});
		}
	},
	component: CoachAppPage,
});

function CoachAppPage() {
	const { user, token } = usePortal();
	const { data: homeContent } = useQuery({
		queryKey: homeQueryKeys.content(token),
		queryFn: () => {
			if (!token) throw new Error("Missing auth token");
			return fetchHomeContent(token);
		},
		enabled: !!token,
		staleTime: 1000 * 60 * 5,
	});

	const isCoach = user ? isCoachPortalUser(user) : false;

	return (
		<div className="container mx-auto max-w-2xl p-4 pb-24 space-y-6">
			<Link
				to="/portal/dashboard"
				className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
			>
				<ArrowLeft className="h-4 w-4" aria-hidden />
				Back to dashboard
			</Link>

			<div className="space-y-2">
				<h1 className="text-3xl font-black uppercase italic tracking-tight">
					Coach workspace &amp; PH App
				</h1>
				<p className="text-muted-foreground text-lg leading-relaxed">
					This web portal is built for coaches and team staff. Athletes and
					families use the PH mobile app with their own logins — not this
					dashboard.
				</p>
			</div>

			{!isCoach && user && (
				<div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-900 dark:text-amber-100">
					You’re signed in as an athlete or guardian. This page describes the
					coach experience; your home is the athlete dashboard.
				</div>
			)}

			<div className="grid gap-4">
				<Card className="border-primary/15 shadow-sm">
					<CardHeader className="flex flex-row items-start gap-3 space-y-0">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
							<LayoutDashboard className="h-5 w-5 text-primary" aria-hidden />
						</div>
						<div>
							<CardTitle className="text-lg">What you use here (web)</CardTitle>
							<CardDescription className="text-base leading-relaxed pt-1">
								Programs, schedule, messages, and team tools in this browser app
								are for your squad only. Use them to plan training, communicate,
								and manage roster details your club owns.
							</CardDescription>
						</div>
					</CardHeader>
				</Card>

				<Card className="border-primary/15 shadow-sm">
					<CardHeader className="flex flex-row items-start gap-3 space-y-0">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
							<Smartphone className="h-5 w-5 text-primary" aria-hidden />
						</div>
						<div>
							<CardTitle className="text-lg">
								What athletes use (mobile)
							</CardTitle>
							<CardDescription className="text-base leading-relaxed pt-1">
								Players and parents sign in on the PH mobile app. They don’t
								share this coach dashboard — they see workouts, check-ins, and
								notifications meant for them.
							</CardDescription>
						</div>
					</CardHeader>
				</Card>

				<Card className="border-primary/15 shadow-sm">
					<CardHeader className="flex flex-row items-start gap-3 space-y-0">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
							<Users className="h-5 w-5 text-primary" aria-hidden />
						</div>
						<div>
							<CardTitle className="text-lg">
								Team emails &amp; logins
							</CardTitle>
							<CardDescription className="text-base leading-relaxed pt-1">
								Each athlete gets a username tied to your team segment before{" "}
								<span className="whitespace-nowrap font-medium text-foreground">
									@phplatform.com
								</span>
								. You generate or reset passwords from the dashboard so they can
								open the app on their devices.
							</CardDescription>
						</div>
					</CardHeader>
				</Card>
			</div>

			{homeContent?.introVideoUrl && (
				<Card className="border-primary/20 bg-primary/5">
					<CardContent className="pt-6">
						<p className="text-sm font-medium text-muted-foreground mb-3">
							Intro video
						</p>
						<a
							href={homeContent.introVideoUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md hover:opacity-95 transition-opacity"
						>
							Watch intro
							<ExternalLink className="h-4 w-4" aria-hidden />
						</a>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
