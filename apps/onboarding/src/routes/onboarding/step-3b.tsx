import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
	ArrowLeft,
	ArrowRight,
	CircleNotch,
	FirstAid,
	Phone,
	Warning,
	CheckCircle,
	XCircle,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";
import { toast } from "sonner";
import { config } from "#/lib/config";
import { getAuthHeaders, getTokenStatus } from "#/lib/client-storage";

export const Route = createFileRoute("/onboarding/step-3b")({
	head: () => ({
		meta: [
			{ title: "Health & Emergency — PH Performance" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: OnboardingStep3b,
});

const PAR_Q_QUESTIONS = [
	"Do you currently have any injuries?",
	"Have you had surgery within the last 12 months?",
	"Do you experience pain during exercise?",
	"Have you ever suffered from heart-related conditions?",
	"Are you currently taking any medication?",
	"Have you previously ruptured or injured ligaments, muscles, or bones?",
	"Do you have asthma, epilepsy, diabetes, or other medical conditions?",
	"Is there any reason physical exercise may not be suitable for you?",
];

type ParqAnswer = { answer: boolean | null; details: string };

function YesNoToggle({
	value,
	onChange,
}: {
	value: boolean | null;
	onChange: (v: boolean) => void;
}) {
	return (
		<div className="flex gap-2">
			<button
				type="button"
				onClick={() => onChange(true)}
				className={cn(
					"flex items-center gap-1.5 px-4 py-2 border text-xs font-mono uppercase tracking-wider transition-all",
					value === true
						? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
						: "border-foreground/[0.06] text-foreground/40 hover:border-foreground/20",
				)}
			>
				<XCircle size={13} weight="bold" />
				Yes
			</button>
			<button
				type="button"
				onClick={() => onChange(false)}
				className={cn(
					"flex items-center gap-1.5 px-4 py-2 border text-xs font-mono uppercase tracking-wider transition-all",
					value === false
						? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
						: "border-foreground/[0.06] text-foreground/40 hover:border-foreground/20",
				)}
			>
				<CheckCircle size={13} weight="bold" />
				No
			</button>
		</div>
	);
}

function OnboardingStep3b() {
	const navigate = useNavigate();
	const [isValidating, setIsValidating] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [parq, setParq] = useState<ParqAnswer[]>(
		PAR_Q_QUESTIONS.map(() => ({ answer: null, details: "" })),
	);
	const [emergencyName, setEmergencyName] = useState("");
	const [emergencyPhone, setEmergencyPhone] = useState("");
	const [emergencyRelationship, setEmergencyRelationship] = useState("");
	const [medicalConditions, setMedicalConditions] = useState("");

	useEffect(() => {
		let cancelled = false;
		async function check() {
			const status = await getTokenStatus();
			if (cancelled) return;
			if (!status.authenticated) {
				navigate({ to: "/" });
				return;
			}
			const userType = localStorage.getItem("user_type");
			if (userType === "team") {
				navigate({ to: "/onboarding/step-4a" });
				return;
			}
			if (!cancelled) setIsValidating(false);
		}
		void check();
		return () => { cancelled = true; };
	}, [navigate]);

	const allParqAnswered = parq.every((q) => q.answer !== null);
	const emergencyValid =
		emergencyName.trim().length > 0 &&
		emergencyPhone.trim().length > 0 &&
		emergencyRelationship.trim().length > 0;
	const canContinue = allParqAnswered && emergencyValid;

	const handleSubmit = async () => {
		if (!canContinue) return;
		setIsSubmitting(true);
		try {
			const baseUrl = config.api.baseUrl;
			const res = await fetch(`${baseUrl}/api/onboarding/health`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json", ...getAuthHeaders() },
				body: JSON.stringify({
					parq: parq.map((q, i) => ({
						question: PAR_Q_QUESTIONS[i],
						answer: q.answer,
						details: q.details.trim() || undefined,
					})),
					emergencyContact: {
						name: emergencyName.trim(),
						phone: emergencyPhone.trim(),
						relationship: emergencyRelationship.trim(),
					},
					medicalConditions: medicalConditions.trim() || undefined,
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error((err as any)?.error || "Failed to save health form");
			}
			navigate({ to: "/onboarding/step-4a" });
		} catch (error: any) {
			toast.error("Error", { description: error.message || "Could not save health form. Please try again." });
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isValidating) {
		return (
			<main className="flex items-center justify-center min-h-[60vh]">
				<CircleNotch className="w-6 h-6 animate-spin text-foreground/40" />
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-2xl px-4 py-8 sm:py-16 sm:px-6">
			<section className="space-y-10 animate-in fade-in duration-500">
				{/* Header */}
				<div className="space-y-3 text-center">
					<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
						Health & Emergency
					</p>
					<h1 className="text-2xl font-medium tracking-tight text-foreground">
						Before you train with us
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
						This information helps your coaches keep you safe and respond quickly in an emergency. All data is stored securely.
					</p>
				</div>

				{/* PAR-Q */}
				<Card className="border border-foreground/[0.06] overflow-hidden">
					<div className="px-5 py-4 border-b border-foreground/[0.06] bg-foreground/[0.02] flex items-center gap-3">
						<Warning size={16} className="text-amber-500 shrink-0" />
						<div>
							<p className="font-mono text-[10px] uppercase tracking-wider text-foreground font-bold">
								Physical Activity Readiness (PAR-Q)
							</p>
							<p className="text-[11px] text-muted-foreground mt-0.5">
								Answer honestly. If YES to any question, please provide details.
							</p>
						</div>
					</div>
					<div className="divide-y divide-foreground/[0.04]">
						{PAR_Q_QUESTIONS.map((question, i) => (
							<div key={i} className="p-5 space-y-3">
								<div className="flex items-start justify-between gap-4 flex-wrap">
									<p className="text-sm text-foreground/80 flex-1 leading-snug">{question}</p>
									<YesNoToggle
										value={parq[i].answer}
										onChange={(v) => {
											setParq((prev) =>
												prev.map((q, j) => (j === i ? { ...q, answer: v } : q)),
											);
										}}
									/>
								</div>
								{parq[i].answer === true && (
									<div className="animate-in slide-in-from-top-1 duration-200">
										<Input
											placeholder="Please provide details..."
											value={parq[i].details}
											onChange={(e) =>
												setParq((prev) =>
													prev.map((q, j) =>
														j === i ? { ...q, details: e.target.value } : q,
													),
												)
											}
											className="text-sm border-amber-500/30 bg-amber-500/[0.03] focus-visible:ring-amber-500/20"
										/>
									</div>
								)}
							</div>
						))}
					</div>
				</Card>

				{/* Medical conditions free text */}
				<Card className="border border-foreground/[0.06] p-5 space-y-3">
					<div>
						<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/60 font-bold">
							Additional Medical Information
						</p>
						<p className="text-[11px] text-muted-foreground mt-1">
							Any other conditions, medications, or information your coaches should know about. (Optional)
						</p>
					</div>
					<textarea
						value={medicalConditions}
						onChange={(e) => setMedicalConditions(e.target.value)}
						rows={3}
						placeholder="e.g. Type 1 diabetes, takes insulin — notify coach if signs of hypoglycaemia"
						className="w-full resize-none rounded-none border border-foreground/[0.06] bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors"
					/>
				</Card>

				{/* Emergency Contact */}
				<Card className="border border-foreground/[0.06] overflow-hidden">
					<div className="px-5 py-4 border-b border-foreground/[0.06] bg-foreground/[0.02] flex items-center gap-3">
						<Phone size={16} className="text-foreground/60 shrink-0" />
						<div>
							<p className="font-mono text-[10px] uppercase tracking-wider text-foreground font-bold">
								Emergency Contact
							</p>
							<p className="text-[11px] text-muted-foreground mt-0.5">
								Someone we can contact in case of emergency.
							</p>
						</div>
					</div>
					<div className="p-5 space-y-4">
						<div className="space-y-1.5">
							<label className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
								Full Name <span className="text-rose-500">*</span>
							</label>
							<Input
								value={emergencyName}
								onChange={(e) => setEmergencyName(e.target.value)}
								placeholder="e.g. Sarah Johnson"
							/>
						</div>
						<div className="space-y-1.5">
							<label className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
								Phone Number <span className="text-rose-500">*</span>
							</label>
							<Input
								value={emergencyPhone}
								onChange={(e) => setEmergencyPhone(e.target.value)}
								placeholder="e.g. +44 7911 123456"
								type="tel"
							/>
						</div>
						<div className="space-y-1.5">
							<label className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
								Relationship <span className="text-rose-500">*</span>
							</label>
							<Input
								value={emergencyRelationship}
								onChange={(e) => setEmergencyRelationship(e.target.value)}
								placeholder="e.g. Parent, Spouse, Sibling"
							/>
						</div>
					</div>
				</Card>

				{/* Health confirmation note */}
				<div className="flex items-start gap-3 px-1">
					<FirstAid size={16} className="text-foreground/30 mt-0.5 shrink-0" />
					<p className="text-[11px] text-muted-foreground leading-relaxed">
						By continuing, I confirm the information provided is accurate to the best of my knowledge. I understand that failure to disclose medical information may increase the risk of injury.
					</p>
				</div>

				{/* Navigation */}
				<div className="flex items-center justify-between pt-2">
					<Button
						variant="ghost"
						onClick={() => navigate({ to: "/onboarding/step-3" })}
						className="font-mono text-xs uppercase tracking-wider text-foreground/40 hover:text-foreground"
					>
						<ArrowLeft size={14} />
						Back
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!canContinue || isSubmitting}
						className="h-10 px-6 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-40"
					>
						{isSubmitting ? (
							<CircleNotch className="w-4 h-4 animate-spin" />
						) : (
							<>
								Continue
								<ArrowRight size={14} />
							</>
						)}
					</Button>
				</div>
			</section>
		</main>
	);
}
