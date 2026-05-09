import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "#/lib/api-client";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/onboarding/step-1")({
	component: Step1,
});

function Step1() {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [showPass, setShowPass] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const checks = useMemo(() => ({
		length: password.length >= 8,
		upper: /[A-Z]/.test(password),
		number: /[0-9]/.test(password),
		special: /[!@#$%^&*(),.?":{}|<>_\-]/.test(password),
	}), [password]);

	const strong = Object.values(checks).every(Boolean);
	const matches = password && password === confirm;
	const canContinue = strong && matches;

	const handleContinue = async () => {
		if (!canContinue || isLoading) return;
		setIsLoading(true);
		try {
			await api.patch("/api/portal/me", { password });
			localStorage.setItem("ph_parent_ob_password_done", "1");
			navigate({ to: "/onboarding/step-2" });
		} catch (err) {
			toast.error("Could not save password", {
				description: err instanceof Error ? err.message : "Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const strength = Object.values(checks).filter(Boolean).length;
	const strengthColors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-primary"];
	const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

	return (
		<div className="space-y-8 animate-fade-in-up">
			{/* Header */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
						<Lock size={16} className="text-primary" />
					</div>
					<span className="label-mono">Step 1</span>
				</div>
				<h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
					Secure your<br />
					<span style={{ color: "var(--acid)" }}>account</span>
				</h1>
				<p className="text-muted-foreground text-sm">
					Create a strong password to protect your parent portal
				</p>
			</div>

			{/* Card */}
			<div className="bento-card p-6 space-y-5">
				{/* Password field */}
				<div className="space-y-2">
					<label htmlFor="password" className="label-mono">New password</label>
					<div className="relative">
						<input
							id="password"
							type={showPass ? "text" : "password"}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••••"
							className="w-full px-3.5 py-2.5 pr-10 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
						/>
						<button
							type="button"
							onClick={() => setShowPass((v) => !v)}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						>
							{showPass ? <EyeOff size={15} /> : <Eye size={15} />}
						</button>
					</div>

					{password && (
						<div className="space-y-2 pt-1 animate-fade-in">
							<div className="flex gap-1">
								{[0, 1, 2, 3].map((i) => (
									<div
										key={i}
										className={cn(
											"h-1 flex-1 transition-all duration-300",
											i < strength ? strengthColors[strength - 1] : "bg-muted",
										)}
									/>
								))}
							</div>
							{strength > 0 && (
								<p className={cn(
									"text-xs font-mono uppercase tracking-wider",
									strength < 2 ? "text-red-500" : strength < 3 ? "text-orange-500" : strength < 4 ? "text-yellow-600" : "text-primary",
								)}>
									{strengthLabels[strength]}
								</p>
							)}
						</div>
					)}
				</div>

				{/* Confirm field */}
				<div className="space-y-2">
					<label htmlFor="confirm" className="label-mono">Confirm password</label>
					<div className="relative">
						<input
							id="confirm"
							type={showConfirm ? "text" : "password"}
							value={confirm}
							onChange={(e) => setConfirm(e.target.value)}
							placeholder="••••••••••"
							className={cn(
								"w-full px-3.5 py-2.5 pr-10 border bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all",
								confirm && !matches
									? "border-red-400 focus:ring-red-200"
									: "border-input focus:ring-ring",
							)}
						/>
						<button
							type="button"
							onClick={() => setShowConfirm((v) => !v)}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						>
							{showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
						</button>
					</div>
					{confirm && !matches && (
						<p className="text-xs text-red-500 flex items-center gap-1 font-mono">
							<XCircle size={12} /> Passwords don't match
						</p>
					)}
					{matches && (
						<p className="text-xs text-primary flex items-center gap-1 font-mono animate-fade-in">
							<CheckCircle2 size={12} /> Passwords match
						</p>
					)}
				</div>

				{/* Requirements grid */}
				<div className="grid grid-cols-2 gap-2 pt-1">
					{[
						{ key: "length", label: "8+ characters" },
						{ key: "upper", label: "Uppercase letter" },
						{ key: "number", label: "One number" },
						{ key: "special", label: "Special character" },
					].map(({ key, label }) => {
						const met = checks[key as keyof typeof checks];
						return (
							<div key={key} className={cn(
								"flex items-center gap-2 px-3 py-2 text-xs font-mono transition-all duration-300 border",
								met
									? "bg-primary/5 text-primary border-primary/20"
									: "bg-muted/30 text-muted-foreground border-transparent",
							)}>
								{met
									? <CheckCircle2 size={12} className="flex-shrink-0" />
									: <div className="w-3 h-3 border border-muted-foreground/30 flex-shrink-0" />
								}
								{label}
							</div>
						);
					})}
				</div>
			</div>

			<button
				type="button"
				onClick={handleContinue}
				disabled={!canContinue || isLoading}
				className={cn(
					"w-full flex items-center justify-center gap-2 py-3 px-5 font-bold text-xs uppercase tracking-widest transition-all",
					canContinue && !isLoading
						? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
						: "bg-muted text-muted-foreground cursor-not-allowed",
				)}
			>
				{isLoading ? "Saving…" : <><ArrowRight size={13} /> Continue</>}
			</button>
		</div>
	);
}
