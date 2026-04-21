import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { 
	CheckCircle, 
	EnvelopeOpen, 
	ArrowRight,
	Clock,
	ShieldCheck
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { toast } from "sonner";
import { env } from "#/env";

export const Route = createFileRoute("/onboarding/success")({
	component: OnboardingSuccess,
});

function OnboardingSuccess() {
	useEffect(() => {
		if (typeof window === "undefined") return;
		const params = new URLSearchParams(window.location.search);
		const sessionId = params.get("session_id")?.trim();
		if (!sessionId) return;

		const token = localStorage.getItem("auth_token");
		if (!token) return;

		const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
		void fetch(`${baseUrl}/api/billing/confirm`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ sessionId }),
		})
			.then(async (res) => {
				if (res.ok) return;
				const payload = await res.json().catch(() => ({}));
				throw new Error(payload?.error || "Could not confirm payment.");
			})
			.catch((err: any) => {
				toast.error("Payment confirmation", {
					description: err?.message || "Could not confirm payment. Please contact support.",
				});
			});
	}, []);

	return (
		<main className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
			<section className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="flex flex-col items-center text-center space-y-6">
					<div className="relative">
						<div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse" />
						<div className="relative bg-primary/10 p-6 rounded-full border border-primary/20">
							<CheckCircle size={64} weight="fill" className="text-primary" />
						</div>
					</div>

					<div className="space-y-3">
						<h1 className="text-4xl font-black tracking-tight text-foreground sm:text-6xl uppercase italic leading-none">
							Payment <span className="text-primary">Received</span>
						</h1>
						<p className="text-lg text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
							Thank you for joining the PH Platform. Your elite performance journey begins now.
						</p>
					</div>
				</div>

				<Card className="border-border/60 bg-card/50 backdrop-blur-md shadow-2xl p-10 rounded-[2.5rem] ring-1 ring-border/50 overflow-hidden relative">
					{/* Decorative background accent */}
					<div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
					
					<div className="space-y-10 relative z-10">
						<div className="flex items-start gap-6">
							<div className="mt-1 bg-primary/10 p-3 rounded-2xl shrink-0">
								<Clock size={24} weight="bold" className="text-primary" />
							</div>
							<div className="space-y-2">
								<h2 className="text-xl font-black uppercase italic">Under Review</h2>
								<p className="text-sm text-muted-foreground leading-relaxed font-medium">
									Our coaching team is currently reviewing your request and athletic profile to ensure the best possible start to your program.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-6">
							<div className="mt-1 bg-primary/10 p-3 rounded-2xl shrink-0">
								<EnvelopeOpen size={24} weight="bold" className="text-primary" />
							</div>
							<div className="space-y-2">
								<h2 className="text-xl font-black uppercase italic">Verification Email</h2>
								<p className="text-sm text-muted-foreground leading-relaxed font-medium">
									You will receive a verification email shortly with your login credentials and next steps to access the mobile application.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-6">
							<div className="mt-1 bg-primary/10 p-3 rounded-2xl shrink-0">
								<ShieldCheck size={24} weight="bold" className="text-primary" />
							</div>
							<div className="space-y-2">
								<h2 className="text-xl font-black uppercase italic">Secure Access</h2>
								<p className="text-sm text-muted-foreground leading-relaxed font-medium">
									Once verified, you'll have full access to your personalized training protocols, analytics, and coach support.
								</p>
							</div>
						</div>
					</div>
				</Card>

				<div className="flex flex-col items-center space-y-6 pt-4">
					<Link to="/" className="w-full max-w-xs">
						<Button className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
							Go to Homepage
							<ArrowRight weight="bold" className="ml-2 w-5 h-5" />
						</Button>
					</Link>
					
					<p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-widest opacity-60">
						Need help? Contact support@phplatform.com
					</p>
				</div>
			</section>
		</main>
	);
}
