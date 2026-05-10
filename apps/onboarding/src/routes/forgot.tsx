import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	LockKeyIcon,
	EnvelopeSimpleIcon,
	CircleNotch,
} from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { config } from "#/lib/config";
import { csrfFetch } from "#/lib/csrf";

export const Route = createFileRoute("/forgot")({
	head: () => ({
		meta: [
			{ title: "Reset Password — PH Performance" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: ForgotPassword,
});

type Step = "email" | "reset";

function ForgotPassword() {
	const [step, setStep] = useState<Step>("email");
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const navigate = useNavigate();

	const handleSendCode = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (isLoading) return;

		const formData = new FormData(e.currentTarget);
		const emailValue = (formData.get("email") as string).trim();

		if (!emailValue || !emailValue.includes("@")) {
			toast.error("Please enter a valid email address");
			return;
		}

		setIsLoading(true);
		try {
			const response = await csrfFetch(`${config.api.baseUrl}/api/auth/forgot`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: emailValue }),
			});

			// Always 200 for security — don't leak whether the email exists
			await response.json().catch(() => ({}));

			setEmail(emailValue);
			toast.success("Reset code sent!", {
				description: `If an account exists for ${emailValue}, you'll receive a code shortly.`,
			});
			setStep("reset");
		} catch (err: any) {
			toast.error("Something went wrong", {
				description: err.message || "Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (isLoading) return;

		const formData = new FormData(e.currentTarget);
		const code = (formData.get("code") as string).trim();
		const password = formData.get("password") as string;
		const confirmPassword = formData.get("confirmPassword") as string;

		if (!code) {
			toast.error("Please enter the reset code");
			return;
		}
		if (password.length < 8) {
			toast.error("Password must be at least 8 characters");
			return;
		}
		if (password !== confirmPassword) {
			toast.error("Passwords do not match");
			return;
		}

		setIsLoading(true);
		try {
			const response = await csrfFetch(
				`${config.api.baseUrl}/api/auth/forgot/confirm`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email, code, password }),
				},
			);

			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error((data as any).error || "Failed to reset password");
			}

			toast.success("Password reset!", {
				description: "Your password has been updated. Please sign in.",
			});
			navigate({ to: "/login" });
		} catch (err: any) {
			toast.error("Reset failed", {
				description: err.message || "Please check your code and try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleResend = async () => {
		if (isResending || !email) return;
		setIsResending(true);
		try {
			await csrfFetch(`${config.api.baseUrl}/api/auth/forgot`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			toast.success("Code resent", {
				description: `A new code has been sent to ${email}.`,
			});
		} catch (err: any) {
			toast.error("Could not resend code", {
				description: err.message || "Please try again.",
			});
		} finally {
			setIsResending(false);
		}
	};

	return (
		<main className="relative min-h-screen bg-background flex flex-col items-center justify-center p-4 overflow-hidden selection:bg-primary/20">
			{/* Background radial accent */}
			<div
				className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20"
				style={{
					background:
						"radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 60%)",
				}}
			/>

			<div className="relative z-10 w-full max-w-md flex flex-col items-center">
				<Link
					to="/login"
					className="group mb-8 flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
				>
					<ArrowLeftIcon className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
					Back to login
				</Link>

				<AnimatePresence mode="wait">
					{step === "email" ? (
						<motion.div
							key="email-step"
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -16 }}
							transition={{ duration: 0.25, ease: "easeOut" }}
							className="w-full"
						>
							<Card className="w-full border border-border/40 shadow-2xl bg-card/60 backdrop-blur-xl rounded-[2rem] overflow-hidden">
								<CardHeader className="space-y-4 pt-10 text-center">
									<div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
										<EnvelopeSimpleIcon weight="duotone" className="w-8 h-8" />
									</div>
									<CardTitle className="text-3xl font-bold tracking-tight">
										Reset Password
									</CardTitle>
									<p className="text-sm text-muted-foreground">
										Enter your email and we'll send you a reset code.
									</p>
								</CardHeader>

								<CardContent className="pt-4 pb-10">
									<form onSubmit={handleSendCode} className="space-y-4">
										<div className="space-y-2">
											<label
												htmlFor="email"
												className="text-sm font-medium text-foreground"
											>
												Email address
											</label>
											<Input
												id="email"
												name="email"
												type="email"
												autoComplete="email"
												required
												placeholder="you@example.com"
												className="h-12 rounded-xl border border-input bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 focus-visible:border-primary transition-all"
											/>
										</div>

										<Button
											type="submit"
											disabled={isLoading}
											className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
										>
											{isLoading ? (
												<CircleNotch className="w-5 h-5 animate-spin" />
											) : (
												"Send Reset Code"
											)}
										</Button>
									</form>
								</CardContent>
							</Card>
						</motion.div>
					) : (
						<motion.div
							key="reset-step"
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -16 }}
							transition={{ duration: 0.25, ease: "easeOut" }}
							className="w-full"
						>
							<Card className="w-full border border-border/40 shadow-2xl bg-card/60 backdrop-blur-xl rounded-[2rem] overflow-hidden">
								<CardHeader className="space-y-4 pt-10 text-center">
									<div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
										<LockKeyIcon weight="duotone" className="w-8 h-8" />
									</div>
									<CardTitle className="text-3xl font-bold tracking-tight">
										Enter Reset Code
									</CardTitle>
									<p className="text-sm text-muted-foreground">
										Check your email for the reset code.
									</p>
								</CardHeader>

								<CardContent className="pt-4 pb-10">
									<form onSubmit={handleResetPassword} className="space-y-4">
										{/* Greyed-out email confirmation */}
										<div className="space-y-1.5">
											<label className="text-sm font-medium text-foreground">
												Email
											</label>
											<div className="h-12 px-4 flex items-center rounded-xl border border-border/60 bg-muted/40 text-sm text-muted-foreground select-none">
												{email}
											</div>
										</div>

										<div className="space-y-2">
											<label
												htmlFor="code"
												className="text-sm font-medium text-foreground"
											>
												Reset code
											</label>
											<Input
												id="code"
												name="code"
												type="text"
												inputMode="numeric"
												autoComplete="one-time-code"
												required
												maxLength={8}
												placeholder="6-digit code"
												className="h-12 rounded-xl border border-input bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 focus-visible:border-primary transition-all tracking-widest text-center text-lg font-semibold"
											/>
										</div>

										<div className="space-y-2">
											<label
												htmlFor="password"
												className="text-sm font-medium text-foreground"
											>
												New password
											</label>
											<Input
												id="password"
												name="password"
												type="password"
												autoComplete="new-password"
												required
												placeholder="At least 8 characters"
												className="h-12 rounded-xl border border-input bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 focus-visible:border-primary transition-all"
											/>
										</div>

										<div className="space-y-2">
											<label
												htmlFor="confirmPassword"
												className="text-sm font-medium text-foreground"
											>
												Confirm new password
											</label>
											<Input
												id="confirmPassword"
												name="confirmPassword"
												type="password"
												autoComplete="new-password"
												required
												placeholder="Repeat your new password"
												className="h-12 rounded-xl border border-input bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 focus-visible:border-primary transition-all"
											/>
										</div>

										<Button
											type="submit"
											disabled={isLoading}
											className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
										>
											{isLoading ? (
												<CircleNotch className="w-5 h-5 animate-spin" />
											) : (
												"Reset Password"
											)}
										</Button>
									</form>
								</CardContent>

								<CardFooter className="bg-muted/30 py-5 flex flex-col items-center space-y-2 border-t">
									<p className="text-xs text-muted-foreground">
										Didn't get a code?
									</p>
									<Button
										type="button"
										variant="ghost"
										disabled={isResending || isLoading}
										onClick={handleResend}
										className="text-primary hover:text-primary hover:bg-primary/10 font-bold h-auto py-1.5 px-4 rounded-lg text-sm"
									>
										{isResending ? "Sending..." : "Resend code"}
									</Button>
								</CardFooter>
							</Card>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</main>
	);
}
