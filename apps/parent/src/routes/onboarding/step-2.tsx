import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Users, User } from "lucide-react";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/onboarding/step-2")({
	component: Step2,
});

const SPORTS = [
	{ id: "football", emoji: "⚽", label: "Football" },
	{ id: "athletics", emoji: "🏃", label: "Athletics" },
	{ id: "swimming", emoji: "🏊", label: "Swimming" },
	{ id: "rugby", emoji: "🏉", label: "Rugby" },
	{ id: "basketball", emoji: "🏀", label: "Basketball" },
	{ id: "other", emoji: "🎯", label: "Other" },
];

function Step2() {
	const navigate = useNavigate();
	const [childName, setChildName] = useState("");
	const [age, setAge] = useState("");
	const [athleteType, setAthleteType] = useState<"youth" | "adult" | null>(null);
	const [sport, setSport] = useState<string | null>(null);

	const canContinue = childName.trim().length >= 2 && athleteType && age;

	const handleContinue = () => {
		if (!canContinue) return;
		localStorage.setItem("ph_parent_ob_child", JSON.stringify({ childName, age, athleteType, sport }));
		navigate({ to: "/onboarding/step-3" });
	};

	return (
		<div className="space-y-8 animate-fade-in-up">
			{/* Header */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
						<Users size={16} className="text-primary" />
					</div>
					<span className="label-mono">Step 2</span>
				</div>
				<h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
					About your<br />
					<span style={{ color: "var(--acid)" }}>child</span>
				</h1>
				<p className="text-muted-foreground text-sm">
					Tell us about the athlete you're supporting
				</p>
			</div>

			{/* Card */}
			<div className="bento-card p-6 space-y-5">
				{/* Name */}
				<div className="space-y-2">
					<label className="label-mono">Child's name</label>
					<input
						type="text"
						value={childName}
						onChange={(e) => setChildName(e.target.value)}
						placeholder="Alex Smith"
						className="w-full px-3.5 py-2.5 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
					/>
				</div>

				{/* Age */}
				<div className="space-y-2">
					<label className="label-mono">Age</label>
					<input
						type="number"
						min={4}
						max={40}
						value={age}
						onChange={(e) => setAge(e.target.value)}
						placeholder="15"
						className="w-full px-3.5 py-2.5 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
					/>
				</div>

				{/* Athlete type */}
				<div className="space-y-2">
					<label className="label-mono">Athlete type</label>
					<div className="grid grid-cols-2 gap-3">
						{([
							{ id: "youth", icon: User, title: "Youth", desc: "Under 18" },
							{ id: "adult", icon: Users, title: "Adult", desc: "18 and over" },
						] as const).map(({ id, icon: Icon, title, desc }) => (
							<button
								key={id}
								type="button"
								onClick={() => setAthleteType(id)}
								className={cn(
									"flex items-center gap-3 p-4 border-2 text-left transition-all duration-200",
									athleteType === id
										? "border-primary bg-primary/5"
										: "border-border hover:border-primary/40",
								)}
							>
								<div className={cn(
									"w-9 h-9 flex items-center justify-center flex-shrink-0",
									athleteType === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
								)}>
									<Icon size={16} />
								</div>
								<div>
									<div className={cn(
										"text-sm font-bold uppercase tracking-wide",
										athleteType === id ? "text-primary" : "text-foreground",
									)}>
										{title}
									</div>
									<div className="text-xs text-muted-foreground font-mono">{desc}</div>
								</div>
							</button>
						))}
					</div>
				</div>

				{/* Sport bento grid */}
				<div className="space-y-2">
					<label className="label-mono">
						Primary sport <span className="text-muted-foreground/60 font-normal normal-case tracking-normal">(optional)</span>
					</label>
					<div className="grid grid-cols-3 gap-2">
						{SPORTS.map(({ id, emoji, label }) => (
							<button
								key={id}
								type="button"
								onClick={() => setSport(sport === id ? null : id)}
								className={cn(
									"flex flex-col items-center gap-2 py-3 px-2 border-2 transition-all duration-200 text-center",
									sport === id
										? "border-primary bg-primary/5"
										: "border-border hover:border-primary/30",
								)}
							>
								<span className="text-xl">{emoji}</span>
								<span className={cn(
									"text-xs font-mono uppercase tracking-wide",
									sport === id ? "text-primary" : "text-foreground/60",
								)}>
									{label}
								</span>
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="flex gap-3">
				<button
					type="button"
					onClick={() => navigate({ to: "/onboarding/step-1" })}
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
