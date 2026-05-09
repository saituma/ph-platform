import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Share2, Bot, Search, UserPlus, Youtube, Tv2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "#/lib/api-client";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/onboarding/step-5")({
	component: Step5,
});

const SOURCES = [
	{
		id: "social_media",
		icon: Share2,
		title: "Social Media",
		desc: "Instagram, TikTok, X",
		color: "text-pink-500",
		bg: "bg-pink-50 dark:bg-pink-950/30",
		border: "border-pink-100 dark:border-pink-900/50",
		active: "border-pink-400 bg-pink-50 dark:bg-pink-950/40",
	},
	{
		id: "ai_agent",
		icon: Bot,
		title: "AI Agent",
		desc: "ChatGPT, Gemini, Claude",
		color: "text-violet-500",
		bg: "bg-violet-50 dark:bg-violet-950/30",
		border: "border-violet-100 dark:border-violet-900/50",
		active: "border-violet-400 bg-violet-50 dark:bg-violet-950/40",
	},
	{
		id: "google",
		icon: Search,
		title: "Google",
		desc: "Search result or ad",
		color: "text-sky-500",
		bg: "bg-sky-50 dark:bg-sky-950/30",
		border: "border-sky-100 dark:border-sky-900/50",
		active: "border-sky-400 bg-sky-50 dark:bg-sky-950/40",
	},
	{
		id: "referral",
		icon: UserPlus,
		title: "Referral",
		desc: "Friend, parent or coach",
		color: "text-emerald-500",
		bg: "bg-emerald-50 dark:bg-emerald-950/30",
		border: "border-emerald-100 dark:border-emerald-900/50",
		active: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
	},
	{
		id: "youtube",
		icon: Youtube,
		title: "YouTube",
		desc: "Video or channel",
		color: "text-red-500",
		bg: "bg-red-50 dark:bg-red-950/30",
		border: "border-red-100 dark:border-red-900/50",
		active: "border-red-400 bg-red-50 dark:bg-red-950/40",
	},
	{
		id: "tv_media",
		icon: Tv2,
		title: "TV / Media",
		desc: "News, broadcast or podcast",
		color: "text-amber-500",
		bg: "bg-amber-50 dark:bg-amber-950/30",
		border: "border-amber-100 dark:border-amber-900/50",
		active: "border-amber-400 bg-amber-50 dark:bg-amber-950/40",
	},
] as const;

function Step5() {
	const navigate = useNavigate();
	const [source, setSource] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleFinish = async () => {
		if (isLoading) return;
		setIsLoading(true);

		try {
			const expectationsText = localStorage.getItem("ph_parent_ob_expectations_text") ?? "";

			await api.patch("/api/portal/me", {
				onboardingComplete: true,
				preferences: {
					...(expectationsText ? { expectationsText } : {}),
					...(source ? { heardFrom: source } : {}),
				},
			});

			localStorage.setItem("ph_parent_onboarding_done", "1");
			localStorage.removeItem("ph_parent_ob_expectations_text");
			localStorage.removeItem("ph_parent_ob_password_done");

			navigate({ to: "/onboarding/success" });
		} catch (err) {
			toast.error("Something went wrong", {
				description: err instanceof Error ? err.message : "Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="space-y-8 animate-fade-in-up">
			{/* Header */}
			<div className="space-y-3">
				<span className="label-mono">Step 4</span>
				<h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
					How did you<br />
					<span style={{ color: "var(--acid)" }}>find us?</span>
				</h1>
				<p className="text-muted-foreground text-sm">
					Helps us understand where parents discover PH Performance
				</p>
			</div>

			{/* Source grid */}
			<div className="grid grid-cols-2 gap-3">
				{SOURCES.map(({ id, icon: Icon, title, desc, color, bg, border, active }) => {
					const isSelected = source === id;
					return (
						<button
							key={id}
							type="button"
							onClick={() => setSource(isSelected ? null : id)}
							className={cn(
								"relative flex flex-col gap-3 p-5 border-2 text-left transition-all duration-200",
								isSelected ? active : `${bg} ${border} hover:border-primary/30`,
							)}
						>
							{isSelected && (
								<div className="absolute top-2.5 right-2.5 w-4 h-4 bg-primary flex items-center justify-center">
									<svg className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
									</svg>
								</div>
							)}
							<div className={cn("w-9 h-9 flex items-center justify-center", isSelected ? "bg-white/60 dark:bg-white/10" : "bg-white/80 dark:bg-white/5")}>
								<Icon size={18} className={color} />
							</div>
							<div>
								<div className={cn("text-sm font-bold uppercase tracking-tight", isSelected ? color : "text-foreground/80")}>
									{title}
								</div>
								<div className="text-xs text-muted-foreground font-mono mt-0.5">{desc}</div>
							</div>
						</button>
					);
				})}
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
					onClick={handleFinish}
					disabled={isLoading}
					className={cn(
						"flex-1 flex items-center justify-center gap-2 py-3 px-5 font-bold text-xs uppercase tracking-widest transition-all",
						!isLoading
							? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
							: "bg-muted text-muted-foreground cursor-not-allowed",
					)}
				>
					{isLoading
						? <><Loader2 size={13} className="animate-spin" /> Finishing…</>
						: <><ArrowRight size={13} /> {source ? "Finish setup" : "Skip & finish"}</>}
				</button>
			</div>
		</div>
	);
}
