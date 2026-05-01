import {
	ArrowRight,
	CircleNotch,
	EnvelopeSimple,
	Eye,
	EyeSlash,
	LockKey,
	WarningCircle,
} from "@phosphor-icons/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "#/components/ui/input";
import { config } from "#/lib/config";
import { isTokenExpired } from "#/lib/token-expiry";

export const Route = createFileRoute("/login")({
	head: () => ({
		meta: [
			{ title: "Sign In — PH Performance" },
			{
				name: "description",
				content:
					"Sign in to your PH Performance account to access your training dashboard, coaching feedback, schedule, and team management.",
			},
			{ name: "robots", content: "noindex, follow" },
		],
		links: [{ rel: "canonical", href: "https://ph-platform-onboarding.vercel.app/login" }],
	}),
	component: Login,
});

const loginSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
	const navigate = useNavigate();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isLoading) return;
		setErrors({});

		const result = loginSchema.safeParse({ email, password });
		if (!result.success) {
			const fieldErrors: any = {};
			for (const issue of result.error.issues) {
				fieldErrors[issue.path[0]] = issue.message;
			}
			setErrors(fieldErrors);
			return;
		}

		setIsLoading(true);
		try {
			const tokenResponse = await fetch(`${config.api.baseUrl}/api/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const data = await tokenResponse.json().catch(() => ({}));
			if (!tokenResponse.ok) {
				throw new Error(data.error || "Login failed");
			}
			if (!data?.accessToken || typeof data.accessToken !== "string") {
				throw new Error("Login succeeded but no access token was returned");
			}
			if (isTokenExpired(data.accessToken)) {
				throw new Error("Login token is already expired. Please check server JWT settings.");
			}

			localStorage.setItem("auth_token", data.accessToken);
			localStorage.setItem("pending_email", email);
			navigate({ to: "/portal/dashboard", replace: true });
		} catch (error: any) {
			toast.error("Login failed", {
				description: error.message || "Invalid email or password.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main className="relative min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden">
			<div className="absolute inset-0 overflow-hidden bg-background pointer-events-none" aria-hidden="true">
				<div className="w-full h-full bg-noise-pattern opacity-[0.02] dark:opacity-[0.05]" />
			</div>

			<motion.section
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: "easeOut" }}
				className="relative w-full max-w-sm space-y-8"
			>
				<div className="space-y-3">
					<Link to="/" className="inline-flex items-center gap-2 mb-4">
						<div className="w-6 h-6 overflow-hidden">
							<img src="/ph.jpg" alt="PH Performance" className="w-full h-full object-cover" />
						</div>
						<span className="font-mono text-xs uppercase tracking-wider text-foreground/50">PH Performance</span>
					</Link>
					<h1 className="text-2xl md:text-3xl tracking-tight font-medium text-foreground">
						Sign in to your account
					</h1>
					<p className="text-sm text-muted-foreground">
						Access your performance dashboard
					</p>
				</div>

				<div className="border border-foreground/[0.06] bg-card/50 p-6 sm:p-8 space-y-6">
					<form onSubmit={handleLogin} className="space-y-5">
						<div className="space-y-2">
							<label
								htmlFor="email-input"
								className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
							>
								<EnvelopeSimple weight="bold" size={12} className="text-foreground/40" />
								Email
							</label>
							<Input
								type="email"
								id="email-input"
								placeholder="name@example.com"
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									if (errors.email) setErrors({ ...errors, email: undefined });
								}}
								className={`h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm placeholder:text-foreground/20 focus-visible:ring-0 focus-visible:border-foreground/20 transition-colors ${
									errors.email ? "border-destructive/50" : ""
								}`}
							/>
							{errors.email && (
								<p className="text-xs text-destructive flex items-center gap-1.5 font-mono">
									<WarningCircle weight="fill" size={12} />
									{errors.email}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<label
								htmlFor="password-input"
								className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5"
							>
								<LockKey weight="bold" size={12} className="text-foreground/40" />
								Password
							</label>
							<div className="relative">
								<Input
									type={showPassword ? "text" : "password"}
									id="password-input"
									placeholder="••••••••"
									value={password}
									onChange={(e) => {
										setPassword(e.target.value);
										if (errors.password) setErrors({ ...errors, password: undefined });
									}}
									className={`h-10 rounded-none border-foreground/[0.06] bg-transparent font-mono text-sm pr-10 placeholder:text-foreground/20 focus-visible:ring-0 focus-visible:border-foreground/20 transition-colors ${
										errors.password ? "border-destructive/50" : ""
									}`}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors duration-150"
								>
									{showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
								</button>
							</div>
							{errors.password && (
								<p className="text-xs text-destructive flex items-center gap-1.5 font-mono">
									<WarningCircle weight="fill" size={12} />
									{errors.password}
								</p>
							)}
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className="w-full h-10 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
						>
							{isLoading ? (
								<CircleNotch className="w-4 h-4 animate-spin" weight="bold" />
							) : (
								<>
									Sign In
									<ArrowRight weight="bold" className="w-3.5 h-3.5" />
								</>
							)}
						</button>
					</form>
				</div>

				<p className="text-center font-mono text-[11px] text-foreground/40 uppercase tracking-wider">
					Don't have an account?{" "}
					<Link
						to="/register"
						className="text-foreground/60 hover:text-foreground transition-colors duration-150 border-b border-foreground/20"
					>
						Register
					</Link>
				</p>
			</motion.section>
		</main>
	);
}
