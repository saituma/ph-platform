import {
	CircleNotch,
	EnvelopeSimple,
	WarningCircle,
} from "@phosphor-icons/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "#/components/ui/input";
import { config } from "#/lib/config";

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
		links: [{ rel: "canonical", href: "https://ph-platform-onboarding.vercel.app/register" }],
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
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isLoading) return;
		setError(undefined);

		const result = registrationSchema.safeParse({ email });
		if (!result.success) {
			setError(result.error.issues[0].message);
			return;
		}

		setIsLoading(true);
		try {
			const response = await fetch(
				`${config.api.baseUrl}/api/auth/register/start`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email }),
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
			{/* Radial green bloom */}
			<div
				className="absolute inset-0 pointer-events-none -z-10"
				style={{
					background: "radial-gradient(ellipse at 50% 60%, hsl(var(--primary) / 0.1), transparent 65%)",
				}}
			/>
			{/* Subtle grid */}
			<div
				className="absolute inset-0 pointer-events-none -z-10"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='rgba(255,255,255,0.02)' stroke-width='1'/%3E%3C/svg%3E")`,
					backgroundSize: "60px 60px",
				}}
			/>

			<div className="w-full max-w-sm space-y-10">
				{/* Logo */}
				<div className="flex flex-col items-center gap-4">
					<Link to="/" className="block">
						<div className="w-12 h-12 rounded-xl overflow-hidden ring-1 ring-primary/30">
							<img src="/ph.jpg" alt="PH Performance" className="w-full h-full object-cover" />
						</div>
					</Link>

					<div className="text-center space-y-2">
						<h1
							className="font-black uppercase text-foreground"
							style={{
								fontFamily: "var(--font-display)",
								fontSize: "clamp(2.5rem, 8vw, 4rem)",
								letterSpacing: "-0.02em",
								lineHeight: 1,
							}}
						>
							Join the{" "}
							<span className="text-primary">Elite</span>
						</h1>
						<p
							className="text-muted-foreground font-bold uppercase"
							style={{ fontSize: "0.65rem", letterSpacing: "0.2em" }}
						>
							Start your free 14-day trial
						</p>
					</div>
				</div>

				{/* Form card */}
				<div className="border border-border/50 bg-card/60 backdrop-blur-sm p-8 space-y-6">
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<label
								htmlFor="email-input"
								className="flex items-center gap-2 text-foreground/70"
								style={{ fontSize: "0.65rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}
							>
								<EnvelopeSimple weight="fill" size={13} className="text-primary" />
								Email Address
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
								className={`h-12 rounded-none border-border/60 bg-background/60 text-sm placeholder:text-muted-foreground/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-colors ${
									error ? "border-destructive/50 focus-visible:ring-destructive/20" : ""
								}`}
								style={{ transitionDuration: "var(--duration-micro)" }}
							/>
							{error && (
								<p className="flex items-center gap-1.5 text-destructive" style={{ fontSize: "0.75rem" }}>
									<WarningCircle weight="fill" size={14} className="shrink-0" />
									{error}
								</p>
							)}
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className="w-full h-12 bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
							style={{ transitionDuration: "var(--duration-micro)", transitionTimingFunction: "var(--ease)" }}
						>
							{isLoading ? (
								<CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
							) : (
								"Get Started Free"
							)}
						</button>
					</form>

				</div>

				{/* Sign in link */}
				<p
					className="text-center font-bold uppercase text-muted-foreground"
					style={{ fontSize: "0.65rem", letterSpacing: "0.15em" }}
				>
					Already have an account?{" "}
					<Link
						to="/login"
						className="text-primary hover:text-primary/80 border-b border-primary/30 transition-colors pb-px"
						style={{ transitionDuration: "var(--duration-micro)" }}
					>
						Sign In
					</Link>
				</p>
			</div>
		</main>
	);
}
