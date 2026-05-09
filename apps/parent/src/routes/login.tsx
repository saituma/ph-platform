import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { csrfFetch } from "#/lib/csrf";
import { isTokenExpired } from "#/lib/token-expiry";
import { setAuthToken, getTokenStatus } from "#/lib/client-storage";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/login")({
	beforeLoad: async () => {
		const status = await getTokenStatus();
		if (status.authenticated) {
			const done = typeof window !== "undefined" && localStorage.getItem("ph_parent_onboarding_done");
			throw redirect({ to: done ? "/dashboard" : "/onboarding/step-1" });
		}
	},
	component: LoginPage,
});

const loginSchema = z.object({
	email: z.string().email("Enter a valid email address"),
	password: z.string().min(1, "Password is required"),
});

const ROLE_ERRORS: Record<string, string> = {
	athlete:       "Athlete accounts use the PH Performance mobile app or portal.",
	adult_athlete: "Athlete accounts use the PH Performance mobile app or portal.",
	youth_athlete: "Athlete accounts use the PH Performance mobile app or portal.",
	team_athlete:  "Athlete accounts use the PH Performance mobile app or portal.",
	coach:         "Coach accounts use the admin dashboard.",
	team_coach:    "Coach accounts use the admin dashboard.",
	program_coach: "Coach accounts use the admin dashboard.",
	admin:         "Admin accounts use the admin dashboard.",
	superAdmin:    "Admin accounts use the admin dashboard.",
};

export default function LoginPage() {
	const navigate = useNavigate();
	const [showPass, setShowPass] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (isLoading) return;

		const form = new FormData(e.currentTarget);
		const email = (form.get("email") as string).trim();
		const password = form.get("password") as string;

		const parsed = loginSchema.safeParse({ email, password });
		if (!parsed.success) {
			toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
			return;
		}

		setIsLoading(true);
		try {
			const res = await csrfFetch(`/api/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || "Incorrect email or password.");

			if (!data?.accessToken || typeof data.accessToken !== "string")
				throw new Error("No access token returned.");
			if (isTokenExpired(data.accessToken))
				throw new Error("Token expired — check server JWT settings.");

			// Decode role from JWT payload (login response doesn't include a user object)
			const jwtPayload = (() => {
				try {
					const part = data.accessToken.split(".")[1] ?? "";
					const padded = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(part.length + ((4 - (part.length % 4)) % 4), "=");
					return JSON.parse(atob(padded)) as Record<string, unknown>;
				} catch { return {}; }
			})();
			const role: string = (jwtPayload.role as string) ?? data.user?.role ?? data.role ?? "";

			if (role !== "guardian") {
				const hint = ROLE_ERRORS[role];
				throw new Error(
					hint
						? `This portal is for parents and guardians only. ${hint}`
						: "This portal is for parents and guardians only.",
				);
			}

			await setAuthToken(data.accessToken);
			const done = localStorage.getItem("ph_parent_onboarding_done");
			navigate({ to: done ? "/dashboard" : "/onboarding/step-1", replace: true });
		} catch (err) {
			toast.error("Sign in failed", {
				description: err instanceof Error ? err.message : "Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex">
			{/* Left — dark brand panel */}
			<div className="hidden lg:flex lg:w-[42%] flex-col bg-[#0a0a0a] p-12 justify-between">
				<div className="flex items-center gap-2">
					<div className="w-7 h-7 bg-primary flex items-center justify-center">
						<span className="text-primary-foreground font-black text-xs">PH</span>
					</div>
					<span className="text-white/60 text-xs font-mono uppercase tracking-widest">
						Parent Portal
					</span>
				</div>

				<div className="space-y-6">
					<p className="label-mono text-white/30">For parents & guardians</p>
					<h1 className="text-4xl font-black text-white uppercase leading-none tracking-tight">
						Track your<br />
						<span style={{ color: "var(--acid)" }}>child's</span><br />
						journey.
					</h1>
					<p className="text-white/40 text-sm leading-relaxed max-w-xs">
						View training progress, message coaches, manage billing and stay close
						to every milestone.
					</p>

					<div className="space-y-2 pt-4">
						{[
							"Progress & performance tracking",
							"Direct coach messaging",
							"Injury & milestone alerts",
							"Billing & subscription control",
						].map((f) => (
							<div key={f} className="flex items-center gap-2.5">
								<div className="w-1 h-1 rounded-full" style={{ background: "var(--acid)" }} />
								<span className="text-white/40 text-xs font-mono">{f}</span>
							</div>
						))}
					</div>
				</div>

				<p className="text-white/20 text-[10px] font-mono uppercase tracking-wider">
					© {new Date().getFullYear()} PH Performance
				</p>
			</div>

			{/* Right — form */}
			<div className="flex-1 flex items-center justify-center bg-background p-6">
				<div className="w-full max-w-sm space-y-8">
					{/* Mobile logo */}
					<div className="lg:hidden flex items-center gap-2 mb-2">
						<div className="w-7 h-7 bg-primary flex items-center justify-center">
							<span className="text-primary-foreground font-black text-xs">PH</span>
						</div>
						<span className="text-foreground/60 text-xs font-mono uppercase tracking-widest">Parent Portal</span>
					</div>

					<div>
						<h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
							Sign in
						</h2>
						<p className="text-muted-foreground text-sm mt-1">
							Use your{" "}
							<span className="text-foreground font-medium">PH Performance</span>{" "}
							account email and password
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-1.5">
							<label htmlFor="email" className="label-mono">Email address</label>
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
								className="w-full px-3.5 py-2.5 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
								placeholder="parent@example.com"
							/>
						</div>

						<div className="space-y-1.5">
							<label htmlFor="password" className="label-mono">Password</label>
							<div className="relative">
								<input
									id="password"
									name="password"
									type={showPass ? "text" : "password"}
									autoComplete="current-password"
									required
									className="w-full px-3.5 py-2.5 pr-10 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
									placeholder="••••••••"
								/>
								<button
									type="button"
									onClick={() => setShowPass((v) => !v)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
								>
									{showPass ? <EyeOff size={15} /> : <Eye size={15} />}
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className={cn(
								"w-full flex items-center justify-center gap-2 py-2.5 px-5 font-bold text-xs uppercase tracking-widest transition-all",
								isLoading
									? "bg-muted text-muted-foreground cursor-not-allowed"
									: "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]",
							)}
						>
							{isLoading ? "Signing in…" : <><ArrowRight size={13} /> Sign in</>}
						</button>
					</form>

					{/* Role notice */}
					<div className="border border-border p-4 space-y-1">
						<p className="label-mono text-foreground/50">Access restricted</p>
						<p className="text-xs text-muted-foreground leading-relaxed">
							Only <span className="text-foreground font-medium">parent / guardian</span> accounts
							can access this portal. Athletes, coaches and admins use their
							respective apps.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
