import {
	CircleNotch,
	EnvelopeSimple,
	WarningCircle,
} from "@phosphor-icons/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "#/components/ui/input";
import { Turnstile } from "#/components/Turnstile";
import { config } from "#/lib/config";
import { csrfFetch } from "#/lib/csrf";
import { env } from "#/env";
import { trackEvent } from "#/lib/analytics";

export const Route = createFileRoute("/register")({
	head: () => ({
		meta: [
			{ title: "Get Started — PH Performance" },
			{
				name: "description",
				content:
					"Create your PH Performance account. Start your free 14-day trial — no credit card required.",
			},
			{ name: "robots", content: "noindex, follow" },
		],
		links: [
			{
				rel: "canonical",
				href: "https://ph-platform-onboarding.vercel.app/register",
			},
		],
	}),
	component: Register,
});

const registrationSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

function Register() {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const navigate = useNavigate();
	const turnstileSiteKey = env.VITE_TURNSTILE_SITE_KEY;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isLoading) return;
		setError(undefined);

		const result = registrationSchema.safeParse({ email });
		if (!result.success) {
			setError(result.error.issues[0].message);
			return;
		}

		if (turnstileSiteKey && !turnstileToken) {
			toast.error("Please complete the verification challenge");
			return;
		}

		setIsLoading(true);
		trackEvent("sign_up_start", { email });
		try {
			const response = await csrfFetch(
				`${config.api.baseUrl}/api/auth/register/start`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email, turnstileToken }),
				},
			);
			const data = await response.json();

			if (!response.ok) {
				if (response.status === 409) {
					toast.error("Account already exists", {
						description:
							"This email is already registered. Would you like to sign in instead?",
						action: {
							label: "Sign In",
							onClick: () => navigate({ to: "/login" }),
						},
					});
					setIsLoading(false);
					return;
				}
				throw new Error(data.error || "Failed to start registration");
			}

			trackEvent("sign_up_complete", { email });
			localStorage.setItem("pending_email", email);
			toast.success("Verification code sent!", {
				description: `We've sent a 6-digit code to ${email}`,
			});
			navigate({ to: "/verification" });
		} catch (err: any) {
			toast.error("Registration failed", {
				description:
					err.message || "An unexpected error occurred. Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main className="relative min-h-[100dvh] flex flex-col items-center justify-center p-6 overflow-hidden">
			<div
				className="absolute inset-0 overflow-hidden bg-background pointer-events-none"
				aria-hidden="true"
			>
				<div className="w-full h-full bg-noise-pattern opacity-[0.02] dark:opacity-[0.05]" />
			</div>

			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: "easeOut" }}
				className="relative w-full max-w-sm space-y-8"
			>
				<div className="space-y-3">
					<Link to="/" className="inline-flex items-center gap-2 mb-4">
						<div className="w-6 h-6 overflow-hidden">
							<img
								src="/ph.jpg"
								alt="PH Performance"
								className="w-full h-full object-cover"
							/>
						</div>
						<span className="font-mono text-xs uppercase tracking-wider text-foreground/50">
							PH Performance
						</span>
					</Link>
					<h1 className="text-2xl md:text-3xl tracking-tight font-medium text-foreground">
						Create your account
					</h1>
				</div>

				<div className="border border-foreground/[0.06] bg-card/50 p-6 sm:p-8 space-y-6">
					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-2">
							<label
								htmlFor="email-input"
								className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
							>
								<EnvelopeSimple
									weight="bold"
									size={12}
									className="text-foreground/40"
								/>
								Email
							</label>
							<Input
								id="email-input"
								type="email"
								placeholder="name@example.com"
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									if (error) setError(undefined);
								}}
								disabled={isLoading}
								aria-invalid={!!error}
								aria-describedby={error ? "register-email-error" : undefined}
								className={`h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm placeholder:text-foreground/20 focus-visible:ring-0 focus-visible:border-foreground/20 transition-colors ${
									error ? "border-destructive/50" : ""
								}`}
							/>
							{error && (
								<p
									id="register-email-error"
									role="alert"
									className="text-xs text-destructive flex items-center gap-1.5 font-mono"
								>
									<WarningCircle weight="fill" size={12} />
									{error}
								</p>
							)}
						</div>

						{turnstileSiteKey && (
							<Turnstile
								siteKey={turnstileSiteKey}
								action="register"
								onVerify={setTurnstileToken}
								onExpire={() => setTurnstileToken(null)}
								onError={() => setTurnstileToken(null)}
								className="flex justify-center"
							/>
						)}

						<button
							type="submit"
							disabled={isLoading || (!!turnstileSiteKey && !turnstileToken)}
							className="w-full h-10 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
						>
							{isLoading ? (
								<CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
							) : (
								"Get Started Free"
							)}
						</button>
					</form>
				</div>

				<p className="text-center font-mono text-[11px] text-foreground/40 uppercase tracking-wider">
					Already have an account?{" "}
					<Link
						to="/login"
						className="text-foreground/60 hover:text-foreground transition-colors duration-150 border-b border-foreground/20"
					>
						Sign In
					</Link>
				</p>
			</motion.div>
		</main>
	);
}
