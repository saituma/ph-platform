import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/onboarding/success")({
	component: OnboardingSuccess,
});

const FEATURE_CARDS = [
	{ emoji: "📊", title: "Track progress",    desc: "Training milestones and performance data",    bg: "bg-primary/5",  border: "border-primary/15" },
	{ emoji: "💬", title: "Message coaches",   desc: "Communicate directly with the coaching team", bg: "bg-blue-50",    border: "border-blue-100" },
	{ emoji: "💳", title: "Manage billing",    desc: "Control subscriptions and view invoices",     bg: "bg-emerald-50", border: "border-emerald-100" },
	{ emoji: "🔔", title: "Stay updated",      desc: "Receive updates based on your preferences",   bg: "bg-amber-50",   border: "border-amber-100" },
] as const;

function OnboardingSuccess() {
	const navigate = useNavigate();

	useEffect(() => {
		localStorage.setItem("ph_parent_onboarding_done", "1");
	}, []);

	return (
		<div className="space-y-10 animate-fade-in-up">
			{/* Hero */}
			<div className="space-y-4 pt-2">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 bg-primary flex items-center justify-center">
						<svg className="w-5 h-5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
						</svg>
					</div>
					<span className="label-mono" style={{ color: "var(--acid)" }}>Setup complete</span>
				</div>

				<h1 className="text-4xl font-black uppercase leading-none tracking-tight text-foreground">
					You're all<br />
					<span style={{ color: "var(--acid)" }}>set!</span>
				</h1>
				<p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
					Your parent portal is ready. Start tracking your child's athletic journey right now.
				</p>
			</div>

			{/* Feature bento */}
			<div className="grid grid-cols-2 gap-3 stagger">
				{FEATURE_CARDS.map(({ emoji, title, desc, bg, border }) => (
					<div
						key={title}
						className={`flex flex-col gap-3 p-5 border-2 ${bg} ${border}`}
					>
						<span className="text-2xl">{emoji}</span>
						<div>
							<div className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</div>
							<div className="text-xs text-muted-foreground mt-0.5 leading-snug font-mono">{desc}</div>
						</div>
					</div>
				))}
			</div>

			{/* CTA */}
			<div className="space-y-3">
				<button
					type="button"
					onClick={() => navigate({ to: "/dashboard" })}
					className="w-full py-3 px-6 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
				>
					<ArrowRight size={13} /> Go to dashboard
				</button>
				<p className="text-center text-xs text-muted-foreground font-mono">
					Update your preferences any time in Settings
				</p>
			</div>
		</div>
	);
}
