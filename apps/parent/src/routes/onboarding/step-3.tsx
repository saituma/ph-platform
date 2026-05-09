import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";


export const Route = createFileRoute("/onboarding/step-3")({
	component: Step3,
});

function Step3() {
	const navigate = useNavigate();
	const [freeText, setFreeText] = useState("");

	const handleContinue = () => {
		if (freeText.trim()) {
			localStorage.setItem("ph_parent_ob_expectations_text", freeText.trim());
		}
		navigate({ to: "/onboarding/step-5" });
	};

	return (
		<div className="space-y-8 animate-fade-in-up">
			{/* Header */}
			<div className="space-y-3">
				<span className="label-mono">Step 3</span>
				<h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
					What do you<br />
					<span style={{ color: "var(--acid)" }}>expect?</span>
				</h1>
				<p className="text-muted-foreground text-sm">
					Tell us what you'd like from your child's coaching relationship with PH Performance
				</p>
			</div>

			{/* Free-text */}
			<div className="bento-card p-5 space-y-3">
				<label className="label-mono block">In your own words</label>
				<textarea
					value={freeText}
					onChange={(e) => setFreeText(e.target.value)}
					rows={6}
					maxLength={500}
					placeholder="e.g. I want regular updates on my child's progress, especially around injury prevention and whether they're enjoying training…"
					className="w-full px-3.5 py-2.5 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none leading-relaxed"
				/>
				{freeText.length > 0 && (
					<div className="text-right">
						<span className="label-mono">{freeText.length} / 500</span>
					</div>
				)}
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
					{freeText.trim() ? "Continue" : "Skip for now"}
				</button>
			</div>
		</div>
	);
}
