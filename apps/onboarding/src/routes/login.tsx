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
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";
import { config } from "#/lib/config";

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
	const [errors, setErrors] = useState<{ email?: string; password?: string }>(
		{},
	);
	const navigate = useNavigate();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isLoading) return;

		// Reset errors
		setErrors({});

		// Validate
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
			const signInResult = await authClient.signIn.email({ email, password });
			if (signInResult.error) {
				throw new Error(signInResult.error.message || "Invalid email or password");
			}

			// Exchange Better Auth session for app JWT
			const tokenResponse = await fetch(`${config.api.baseUrl}/api/app/token`, {
				method: "POST",
				credentials: "include",
			});
			const data = await tokenResponse.json();
			if (!tokenResponse.ok) {
				throw new Error(data.error || "Login failed");
			}

			localStorage.setItem("auth_token", data.accessToken);
			localStorage.setItem("pending_email", email);

			toast.success("Welcome back!", {
				description: "Redirecting to your dashboard...",
			});

			// Use setTimeout to ensure state updates and navigate works
			setTimeout(() => {
				navigate({ to: "/portal/dashboard", replace: true });
			}, 200);
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
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10" />

			<section className="w-full max-w-md space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out">
				<div className="text-center space-y-3">
					<h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-foreground">
						Welcome{" "}
						<span className="text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.3)]">
							Back
						</span>
					</h1>
					<p className="text-muted-foreground text-sm font-bold tracking-wide uppercase">
						Access your elite performance portal
					</p>
				</div>

				<Card className="w-full p-6 sm:p-12 rounded-[2.5rem] border border-border/80 dark:border-white/10 bg-card dark:bg-card/40 backdrop-blur-3xl shadow-2xl dark:shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
					<form onSubmit={handleLogin} className="space-y-8">
						<div className="space-y-6">
							<div className="space-y-2.5">
								<label 
                                    htmlFor="email-input"
                                    className="text-xs font-black uppercase tracking-widest flex items-center gap-2 px-1 text-foreground/80 cursor-pointer"
                                >
									<EnvelopeSimple
										weight="fill"
										className="text-primary"
										size={16}
									/>
									Email Address
								</label>
								<Input
									type="email"
                                    id="email-input"
									placeholder="name@example.com"
									value={email}
									onChange={(e) => {
										setEmail(e.target.value);
										if (errors.email)
											setErrors({ ...errors, email: undefined });
									}}
									className={`h-14 rounded-2xl bg-secondary/50 dark:bg-background/40 border-border dark:border-white/5 focus-visible:ring-primary/20 focus-visible:border-primary/40 transition-all font-medium text-base placeholder:text-muted-foreground/80 dark:placeholder:text-muted-foreground/30 ${errors.email ? "border-destructive/50 focus-visible:ring-destructive/10" : ""}`}
								/>
								{errors.email && (
									<p className="text-xs font-bold text-destructive flex items-center gap-1.5 px-2 animate-in fade-in slide-in-from-top-1">
										<WarningCircle weight="fill" size={14} />
										{errors.email}
									</p>
								)}
							</div>

							<div className="space-y-2.5">
								<label 
                                    htmlFor="password-input"
                                    className="text-xs font-black uppercase tracking-widest flex items-center gap-2 px-1 text-foreground/80 cursor-pointer"
                                >
									<LockKey weight="fill" className="text-primary" size={16} />
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
											if (errors.password)
												setErrors({ ...errors, password: undefined });
										}}
										className={`h-14 rounded-2xl bg-secondary/50 dark:bg-background/40 border-border dark:border-white/5 focus-visible:ring-primary/20 focus-visible:border-primary/40 transition-all font-medium text-base pr-14 placeholder:text-muted-foreground/80 dark:placeholder:text-muted-foreground/30 ${errors.password ? "border-destructive/50 focus-visible:ring-destructive/10" : ""}`}
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
									>
										{showPassword ? (
											<EyeSlash size={20} weight="bold" />
										) : (
											<Eye size={20} weight="bold" />
										)}
									</button>
								</div>
								{errors.password && (
									<p className="text-xs font-bold text-destructive flex items-center gap-1.5 px-2 animate-in fade-in slide-in-from-top-1">
										<WarningCircle weight="fill" size={14} />
										{errors.password}
									</p>
								)}
							</div>
						</div>

						<Button
							type="submit"
							disabled={isLoading}
							className="w-full h-14 rounded-2xl text-lg font-black italic uppercase tracking-tighter shadow-[0_10px_30px_-10px_rgba(var(--primary),0.3)] transition-all hover:shadow-[0_15px_40px_-10px_rgba(var(--primary),0.4)] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
						>
							{isLoading ? (
								<CircleNotch className="w-7 h-7 animate-spin" weight="bold" />
							) : (
								<>
									Sign In
									<ArrowRight weight="bold" className="ml-2 w-6 h-6" />
								</>
							)}
						</Button>
					</form>
				</Card>

				<div className="text-center space-y-4">
					<p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
						Don't have an account?{" "}
						<Link
							to="/"
							className="text-primary hover:text-primary/80 transition-colors border-b border-primary/20"
						>
							Register Now
						</Link>
					</p>
				</div>
			</section>
		</main>
	);
}
