import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/onboarding/step-4")({
	component: Step4,
});

const FREQUENCIES = [
	{ id: "daily",     emoji: "☀️", title: "Daily",          desc: "Brief daily updates on activity" },
	{ id: "weekly",    emoji: "📋", title: "Weekly",         desc: "A weekly digest every Monday" },
	{ id: "biweekly",  emoji: "📆", title: "Bi-weekly",      desc: "Updates every two weeks" },
	{ id: "important", emoji: "🔔", title: "Important only", desc: "Only when something matters" },
] as const;

const METHODS = [
	{ id: "app",   emoji: "📱", title: "In-app",    desc: "Portal notifications only" },
	{ id: "email", emoji: "✉️",  title: "Email",     desc: "Updates to your inbox" },
	{ id: "both",  emoji: "🔁", title: "Both",      desc: "In-app + email" },
] as const;

function Step4() {
	const navigate = useNavigate();
	const [frequency, setFrequency] = useState<string | null>(null);
	const [method, setMethod] = useState<string | null>(null);
	const canContinue = frequency && method;

	const handleContinue = () => {
		if (!canContinue) return;
		localStorage.setItem("ph_parent_ob_comms", JSON.stringify({ frequency, method }));
		navigate({ to: "/onboarding/step-5" });
	};

	return (
		<div className="space-y-8 animate-fade-in-up">
			{/* Header */}
			<div className="space-y-3">
				<span className="label-mono">Step 4</span>
				<h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
					Stay in<br />
					<span style={{ color: "var(--acid)" }}>the loop</span>
				</h1>
				<p className="text-muted-foreground text-sm">
					How often and where would you like to receive updates?
				</p>
			</div>

			{/* Frequency */}
			<div className="bento-card p-5 space-y-3">
				<h2 className="label-mono">Update frequency</h2>
				<div className="grid grid-cols-2 gap-2.5">
					{FREQUENCIES.map(({ id, emoji, title, desc }) => (
						<button
							key={id}
							type="button"
							onClick={() => setFrequency(id)}
							className={cn(
								"flex flex-col gap-2 p-4 border-2 text-left transition-all duration-200",
								frequency === id
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/30",
							)}
						>
							<span className="text-xl">{emoji}</span>
							<div>
								<div className={cn(
									"text-sm font-bold",
									frequency === id ? "text-primary" : "text-foreground/80",
								)}>
									{title}
								</div>
								<div className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</div>
							</div>
						</button>
					))}
				</div>
			</div>

			{/* Contact method */}
			<div className="bento-card p-5 space-y-3">
				<h2 className="label-mono">Contact method</h2>
				<div className="grid grid-cols-3 gap-2.5">
					{METHODS.map(({ id, emoji, title, desc }) => (
						<button
							key={id}
							type="button"
							onClick={() => setMethod(id)}
							className={cn(
								"flex flex-col items-center gap-2 py-4 px-2 border-2 text-center transition-all duration-200",
								method === id
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/30",
							)}
						>
							<span className="text-2xl">{emoji}</span>
							<div>
								<div className={cn(
									"text-xs font-bold uppercase tracking-wide",
									method === id ? "text-primary" : "text-foreground/80",
								)}>
									{title}
								</div>
								<div className="text-[10px] text-muted-foreground leading-snug mt-0.5 font-mono">{desc}</div>
							</div>
						</button>
					))}
				</div>
			</div>

			<div className="flex gap-3">
				<button
					type="button"
					onClick={() => navigate({ to: "/onboarding/step-3" })}
					className="flex items-center justify-center px-4 py-3 border border-border text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-all"
				>
					<ArrowLeft size={15} />
				</button>
				<button
					type="button"
					onClick={handleContinue}
					disabled={!canContinue}
					className={cn(
						"flex-1 flex items-center justify-center gap-2 py-3 px-5 font-bold text-xs uppercase tracking-widest transition-all",
						canContinue
							? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
							: "bg-muted text-muted-foreground cursor-not-allowed",
					)}
				>
					<ArrowRight size={13} /> Continue
				</button>
			</div>
		</div>
	);
}
