import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
	ArrowLeft,
	ArrowRight,
	CircleNotch,
	CaretDown,
	CaretUp,
	CheckSquare,
	Square,
	ShieldCheck,
	Camera,
	FileText,
	Warning,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { cn } from "#/lib/utils";
import { toast } from "sonner";
import { config } from "#/lib/config";
import { getAuthHeaders, getTokenStatus } from "#/lib/client-storage";

export const Route = createFileRoute("/onboarding/step-4a")({
	head: () => ({
		meta: [
			{ title: "Policies & Agreements — PH Performance" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: OnboardingStep4a,
});

const TERMS_FULL = `PH Performance memberships operate on a monthly payment structure. Membership fees remain fixed regardless of whether a month contains four or five weeks, based on a 48-week coaching year.

A minimum of 24 hours notice is required to cancel or reschedule a session. Sessions cancelled with less than 24 hours notice may be lost and are not guaranteed to be rescheduled. Missed sessions without communication may also be forfeited.

Membership payments are non-refundable unless agreed otherwise by PH Performance. If payments fail or remain unpaid, access to sessions, programmes, or the app may be suspended until payment is resolved.

PH Performance reserves the right to amend schedules, coaches, session times, and programme structures where required.

App memberships are billed monthly. All payments are strictly non-refundable. This includes unused programmes, lack of engagement, and cancellations. Payment provides access, not guaranteed results. App is for personal use only. Login sharing is prohibited.`;

const WAIVER_FULL = `Participation in strength & conditioning training, gym sessions, running sessions, mobility work, and physical activity carries an inherent risk of injury.

By participating in PH Performance services, users acknowledge and accept these risks voluntarily.

Users confirm that they are physically fit to participate and have disclosed any relevant injuries, medical conditions, surgeries, or limitations before training.

PH Performance coaches will always aim to provide safe and professional coaching; however, PH Performance cannot be held liable for injuries, accidents, illness, or damages resulting from participation unless caused by proven negligence.

Users participate entirely at their own risk. Parents/guardians accepting this waiver on behalf of an under-18 participant acknowledge and accept these risks on behalf of the athlete.`;

const PRIVACY_FULL = `PH Performance collects and processes the following personal data: name, date of birth, contact details, health and fitness information, emergency contact details, and payment information.

Your data is used to: manage your membership and coaching services, communicate with you about sessions and programmes, process payments securely, and contact your emergency contact if required.

Your data is stored securely and is never sold to third parties. We comply with UK GDPR regulations. You may request access to, correction of, or deletion of your personal data at any time by contacting us.

Data is retained for the duration of your membership and for up to 3 years after membership ends for legal and accounting purposes.`;

const MEDIA_FULL = `PH Performance may occasionally use photos and videos of training sessions for social media, marketing, website content, app content, and promotional material.

PH Performance will always aim to use content professionally and respectfully. You can withdraw your consent at any time by contacting us — this will not affect any content already published.

If you are under 18, parental/guardian consent is required.`;

function PolicyCard({
	icon: Icon,
	title,
	summary,
	fullText,
}: {
	icon: any;
	title: string;
	summary: string;
	fullText: string;
}) {
	const [expanded, setExpanded] = useState(false);
	return (
		<Card className="border border-foreground/[0.06] overflow-hidden">
			<div className="px-5 py-4 flex items-start gap-3">
				<Icon size={16} className="text-foreground/50 mt-0.5 shrink-0" />
				<div className="flex-1 min-w-0">
					<p className="font-mono text-[10px] uppercase tracking-wider text-foreground font-bold">{title}</p>
					<p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{summary}</p>
					<button
						type="button"
						onClick={() => setExpanded((v) => !v)}
						className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground transition-colors"
					>
						{expanded ? <CaretUp size={11} weight="bold" /> : <CaretDown size={11} weight="bold" />}
						{expanded ? "Hide Full Policy" : "View Full Policy"}
					</button>
					{expanded && (
						<div className="mt-4 p-4 border border-foreground/[0.06] bg-foreground/[0.02] animate-in fade-in duration-200">
							<p className="text-[11px] text-muted-foreground leading-relaxed font-mono whitespace-pre-line">
								{fullText}
							</p>
						</div>
					)}
				</div>
			</div>
		</Card>
	);
}

function Tick({
	checked,
	onChange,
	label,
	required,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	label: string;
	required?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={() => onChange(!checked)}
			className="flex items-start gap-3 text-left w-full group"
		>
			<div className="mt-0.5 shrink-0 text-foreground/40 group-hover:text-foreground transition-colors">
				{checked ? (
					<CheckSquare size={18} weight="fill" className="text-foreground" />
				) : (
					<Square size={18} />
				)}
			</div>
			<span className="text-sm text-foreground/70 leading-snug">
				{label}
				{required && <span className="text-rose-500 ml-1">*</span>}
			</span>
		</button>
	);
}

function MediaExpand() {
	const [expanded, setExpanded] = useState(false);
	return (
		<div>
			<button
				type="button"
				onClick={() => setExpanded((v) => !v)}
				className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground transition-colors"
			>
				{expanded ? <CaretUp size={11} weight="bold" /> : <CaretDown size={11} weight="bold" />}
				{expanded ? "Hide Full Policy" : "View Full Media Policy"}
			</button>
			{expanded && (
				<div className="mt-3 p-4 border border-foreground/[0.06] bg-foreground/[0.02] animate-in fade-in duration-200">
					<p className="text-[11px] text-muted-foreground leading-relaxed font-mono whitespace-pre-line">
						{MEDIA_FULL}
					</p>
				</div>
			)}
		</div>
	);
}

function OnboardingStep4a() {
	const navigate = useNavigate();
	const [isValidating, setIsValidating] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isUnder18, setIsUnder18] = useState(false);

	const [termsAccepted, setTermsAccepted] = useState(false);
	const [privacyAccepted, setPrivacyAccepted] = useState(false);
	const [waiverAccepted, setWaiverAccepted] = useState(false);
	const [healthAccurate, setHealthAccurate] = useState(false);
	const [parentConsent, setParentConsent] = useState(false);
	const [mediaConsent, setMediaConsent] = useState<boolean | null>(null);

	useEffect(() => {
		let cancelled = false;
		async function check() {
			const status = await getTokenStatus();
			if (cancelled) return;
			if (!status.authenticated) {
				navigate({ to: "/" });
				return;
			}
			// Detect if under 18 from stored birth date
			try {
				const baseUrl = config.api.baseUrl;
				const res = await fetch(`${baseUrl}/api/auth/me`, {
					credentials: "include",
					headers: getAuthHeaders(),
				});
				const data = await res.json().catch(() => ({}));
				const birthDate = (data as any)?.user?.birthDate ?? (data as any)?.user?.athlete?.birthDate;
				if (birthDate) {
					const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));
					if (!cancelled) setIsUnder18(age < 18);
				}
			} catch {
				// best effort
			}
			if (!cancelled) setIsValidating(false);
		}
		void check();
		return () => { cancelled = true; };
	}, [navigate]);

	const requiredTicked =
		termsAccepted &&
		privacyAccepted &&
		waiverAccepted &&
		healthAccurate &&
		(!isUnder18 || parentConsent) &&
		mediaConsent !== null;

	const handleSubmit = async () => {
		if (!requiredTicked) return;
		setIsSubmitting(true);
		try {
			const baseUrl = config.api.baseUrl;
			const res = await fetch(`${baseUrl}/api/onboarding/agreements`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json", ...getAuthHeaders() },
				body: JSON.stringify({
					termsAccepted,
					privacyAccepted,
					waiverAccepted,
					healthFormAccurate: healthAccurate,
					mediaConsent: mediaConsent ?? false,
					parentConsent: isUnder18 ? parentConsent : undefined,
					termsVersion: "2025-05-01",
					privacyVersion: "2025-05-01",
					waiverVersion: "2025-05-01",
					appVersion: "1.0",
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error((err as any)?.error || "Failed to save agreements");
			}
			navigate({ to: "/onboarding/step-4" });
		} catch (error: any) {
			toast.error("Error", { description: error.message || "Could not save agreements. Please try again." });
		} finally {
			setIsSubmitting(false);
		}
	};

	const backTo =
		typeof window !== "undefined" && localStorage.getItem("user_type") === "team"
			? "/onboarding/step-3"
			: "/onboarding/step-3b";

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
						Policies & Agreements
					</p>
					<h1 className="text-2xl font-medium tracking-tight text-foreground">
						Before you continue
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
						Please read the summaries below. You can expand each section to view the full policy.
					</p>
				</div>

				{/* Policy cards */}
				<div className="space-y-3">
					<PolicyCard
						icon={FileText}
						title="Terms & Conditions"
						summary="By continuing you agree to PH Performance's membership structure, session rules, payment terms, and coaching policies."
						fullText={TERMS_FULL}
					/>
					<PolicyCard
						icon={Warning}
						title="Liability Waiver"
						summary="Physical training carries inherent risk. I understand and accept these risks voluntarily and confirm I am physically fit to participate."
						fullText={WAIVER_FULL}
					/>
					<PolicyCard
						icon={ShieldCheck}
						title="Privacy Policy"
						summary="I consent to PH Performance collecting and processing my personal and health data to deliver coaching services, in line with UK GDPR."
						fullText={PRIVACY_FULL}
					/>
				</div>

				{/* Media consent toggle */}
				<Card className="border border-foreground/[0.06] overflow-hidden">
					<div className="px-5 py-4 border-b border-foreground/[0.06] bg-foreground/[0.02] flex items-center gap-3">
						<Camera size={16} className="text-foreground/50 shrink-0" />
						<div>
							<p className="font-mono text-[10px] uppercase tracking-wider text-foreground font-bold">
								Media Consent
							</p>
							<p className="text-[11px] text-muted-foreground mt-0.5">
								Photos/videos may be used for social media, marketing, and promotional content.
							</p>
						</div>
					</div>
					<div className="px-5 py-4 space-y-3">
						<MediaExpand />
						<div className="flex gap-3 pt-1">
							<button
								type="button"
								onClick={() => setMediaConsent(true)}
								className={cn(
									"flex-1 py-3 border text-xs font-mono uppercase tracking-wider transition-all",
									mediaConsent === true
										? "border-foreground bg-foreground text-background"
										: "border-foreground/[0.06] text-foreground/40 hover:border-foreground/20",
								)}
							>
								Yes, I consent
							</button>
							<button
								type="button"
								onClick={() => setMediaConsent(false)}
								className={cn(
									"flex-1 py-3 border text-xs font-mono uppercase tracking-wider transition-all",
									mediaConsent === false
										? "border-foreground bg-foreground text-background"
										: "border-foreground/[0.06] text-foreground/40 hover:border-foreground/20",
								)}
							>
								No, I don't consent
							</button>
						</div>
					</div>
				</Card>

				{/* Required checkboxes */}
				<Card className="border border-foreground/[0.06] p-5 space-y-5">
					<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/60 font-bold">
						Required Confirmations
					</p>
					<div className="space-y-4">
						<Tick
							checked={termsAccepted}
							onChange={setTermsAccepted}
							label="I have read and agree to the PH Performance Terms & Conditions"
							required
						/>
						<Tick
							checked={privacyAccepted}
							onChange={setPrivacyAccepted}
							label="I have read and agree to the Privacy Policy"
							required
						/>
						<Tick
							checked={waiverAccepted}
							onChange={setWaiverAccepted}
							label="I understand that physical training carries risk and I participate voluntarily"
							required
						/>
						<Tick
							checked={healthAccurate}
							onChange={setHealthAccurate}
							label="I confirm the medical and health information I have provided is accurate to the best of my knowledge"
							required
						/>
						{isUnder18 && (
							<Tick
								checked={parentConsent}
								onChange={setParentConsent}
								label="I am the parent or legal guardian of this athlete and give consent on their behalf"
								required
							/>
						)}
					</div>
				</Card>

				{/* Navigation */}
				<div className="flex items-center justify-between pt-2">
					<Button
						variant="ghost"
						onClick={() => navigate({ to: backTo as any })}
						className="font-mono text-xs uppercase tracking-wider text-foreground/40 hover:text-foreground"
					>
						<ArrowLeft size={14} />
						Back
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!requiredTicked || isSubmitting}
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
