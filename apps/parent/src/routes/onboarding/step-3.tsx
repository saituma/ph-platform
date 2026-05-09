import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/onboarding/step-3")({
	component: Step3,
});

const EXPECTATIONS = [
	{ id: "progress_reports",  emoji: "📊", title: "Progress Reports",  desc: "Regular summaries of training and performance",    bg: "bg-primary/5",   border: "border-primary/20",   selected: "border-primary bg-primary/10" },
	{ id: "direct_messaging",  emoji: "💬", title: "Direct Messaging",  desc: "Message coaches about my child directly",           bg: "bg-blue-50",     border: "border-blue-100",     selected: "border-blue-400 bg-blue-50" },
	{ id: "injury_alerts",     emoji: "🚨", title: "Injury Alerts",     desc: "Immediate notifications if my child is injured",    bg: "bg-red-50",      border: "border-red-100",      selected: "border-red-400 bg-red-50" },
	{ id: "training_schedule", emoji: "📅", title: "Schedule Access",   desc: "View upcoming sessions and practice plans",         bg: "bg-sky-50",      border: "border-sky-100",      selected: "border-sky-400 bg-sky-50" },
	{ id: "milestones",        emoji: "🏆", title: "Milestones",        desc: "Celebrate achievements and personal bests",         bg: "bg-amber-50",    border: "border-amber-100",    selected: "border-amber-400 bg-amber-50" },
	{ id: "nutrition",         emoji: "🥗", title: "Nutrition",         desc: "Diet advice tailored to training load",             bg: "bg-emerald-50",  border: "border-emerald-100",  selected: "border-emerald-400 bg-emerald-50" },
	{ id: "video_feedback",    emoji: "🎥", title: "Video Feedback",    desc: "Coach commentary on technique and form",            bg: "bg-violet-50",   border: "border-violet-100",   selected: "border-violet-400 bg-violet-50" },
	{ id: "goal_setting",      emoji: "🎯", title: "Goal Setting",      desc: "Define and track short and long-term targets",      bg: "bg-orange-50",   border: "border-orange-100",   selected: "border-orange-400 bg-orange-50" },
] as const;

function Step3() {
	const navigate = useNavigate();
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const toggle = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	const handleContinue = () => {
		localStorage.setItem("ph_parent_ob_expectations", JSON.stringify([...selected]));
		navigate({ to: "/onboarding/step-4" });
	};

	return (
		<div className="space-y-8 animate-fade-in-up">
			{/* Header */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<span className="label-mono">Step 3</span>
					{selected.size > 0 && (
						<span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider">
							{selected.size} selected
						</span>
					)}
				</div>
				<h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
					What do you<br />
					<span style={{ color: "var(--acid)" }}>expect?</span>
				</h1>
				<p className="text-muted-foreground text-sm">
					Select everything you'd like from your child's coaching relationship
				</p>
			</div>

			{/* Bento grid */}
			<div className="grid grid-cols-2 gap-3">
				{EXPECTATIONS.map(({ id, emoji, title, desc, bg, border, selected: selCls }) => {
					const isSelected = selected.has(id);
					return (
						<button
							key={id}
							type="button"
							onClick={() => toggle(id)}
							className={cn(
								"relative flex flex-col gap-2.5 p-4 border-2 text-left transition-all duration-200",
								isSelected ? selCls : `${bg} ${border} hover:border-primary/30`,
							)}
						>
							{isSelected && (
								<div className="absolute top-2.5 right-2.5 w-5 h-5 bg-primary flex items-center justify-center">
									<svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
									</svg>
								</div>
							)}
							<span className="text-2xl">{emoji}</span>
							<div>
								<div className="text-sm font-bold text-foreground mb-0.5">{title}</div>
								<div className="text-xs text-muted-foreground leading-snug">{desc}</div>
							</div>
						</button>
					);
				})}
			</div>

			<div className="flex gap-3">
				<button
					type="button"
					onClick={() => navigate({ to: "/onboarding/step-2" })}
					className="flex items-center justify-center px-4 py-3 border border-border text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-all"
				>
					<ArrowLeft size={15} />
				</button>
				<button
					type="button"
					onClick={handleContinue}
					className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all"
				>
					<ArrowRight size={13} />
					{selected.size === 0 ? "Skip for now" : "Continue"}
				</button>
			</div>
		</div>
	);
}
