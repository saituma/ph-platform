import {
	AppWindow,
	ArrowRightIcon,
	ChartLineUp,
	CheckCircle,
	CircleNotch,
	Lightning,
	Users,
	VideoCamera,
	WarningCircle,
} from "@phosphor-icons/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { config } from "#/lib/config";

export const Route = createFileRoute("/")({ component: App });

const registrationSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

function App() {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isLoading) return;

		// Reset error
		setError(undefined);

		// Validate
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
					headers: {
						"Content-Type": "application/json",
					},
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
		} catch (error: any) {
			toast.error("Registration failed", {
				description:
					error.message || "An unexpected error occurred. Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="relative min-h-screen bg-background selection:bg-primary/20 overflow-x-hidden">
			<main className="pt-24 pb-20">
				{/* Hero Section */}
				<section className="relative px-6 max-w-7xl mx-auto mb-32 pt-12">
					<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
						<div className="text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-left-4 duration-1000 ease-out fill-mode-both">
							<div className="space-y-6">
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase">
									<Lightning weight="fill" className="w-3 h-3" />
									<span>Version 2.0 is live</span>
								</div>
								<h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground leading-[1.05]">
									Elevate your{" "}
									<span className="text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.2)]">
										Performance
									</span>
								</h1>
								<p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
									The professional platform for athletes and teams to track
									progress, optimize training, and achieve more.
								</p>
							</div>

							<div className="w-full max-w-md mx-auto lg:mx-0 space-y-6">
								<div className="space-y-3">
									<form
										onSubmit={handleSubmit}
										className={`group flex w-full overflow-hidden rounded-[1.25rem] border bg-card dark:bg-card/40 backdrop-blur-2xl focus-within:ring-4 transition-all duration-300 shadow-2xl dark:shadow-primary/5 ${error ? "border-destructive focus-within:ring-destructive/10 focus-within:border-destructive/40" : "border-border/80 dark:border-white/5 focus-within:ring-primary/10 focus-within:border-primary/40"}`}
									>
										<Input
											type="email"
											placeholder="Enter your email address"
											aria-label="Email address"
											value={email}
											onChange={(e) => {
												setEmail(e.target.value);
												if (error) setError(undefined);
											}}
											disabled={isLoading}
											className="flex-1 border-0 h-14 px-6 focus-visible:ring-0 bg-transparent text-base placeholder:text-muted-foreground/80 dark:placeholder:text-muted-foreground/30"
										/>
										<Button
											type="submit"
											variant="ghost"
											disabled={isLoading}
											className="h-14 w-14 p-0 rounded-none border-l border-border/80 dark:border-white/5 hover:bg-primary/10 hover:text-primary transition-all active:scale-[0.95]"
										>
											{isLoading ? (
												<CircleNotch
													weight="bold"
													className="w-5 h-5 animate-spin"
												/>
											) : (
												<ArrowRightIcon weight="bold" className="w-5 h-5" />
											)}
										</Button>
									</form>
									{error && (
										<p className="text-xs font-bold text-destructive flex items-center gap-1.5 px-2 animate-in fade-in slide-in-from-top-1">
											<WarningCircle weight="fill" className="w-4 h-4" />
											{error}
										</p>
									)}
								</div>

								<div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-[10px] text-muted-foreground/50 uppercase tracking-widest font-bold">
									<div className="flex items-center gap-2">
										<CheckCircle
											weight="fill"
											className="text-primary w-4 h-4"
										/>
										<span>Team Sync</span>
									</div>
									<div className="flex items-center gap-2">
										<CheckCircle
											weight="fill"
											className="text-primary w-4 h-4"
										/>
										<span>Pro Analytics</span>
									</div>
								</div>
							</div>
						</div>

						{/* Mobile Mockup - Peak Refinement */}
						<div className="relative flex justify-center items-center lg:justify-end animate-in fade-in slide-in-from-right-4 duration-1000 delay-200 ease-out fill-mode-both">
							<div className="absolute w-[120%] h-[120%] bg-primary/20 rounded-full blur-[140px] pointer-events-none opacity-20" />

							{/* Device Frame - Deep Dark Premium */}
							<div className="relative w-[260px] h-[540px] md:w-[280px] md:h-[580px] bg-background rounded-[3rem] border-[10px] border-foreground/5 shadow-[0_0_100px_-10px_rgba(0,0,0,0.5)] overflow-hidden animate-float ring-1 ring-white/10">
								{/* Reflection Overlay */}
								<div className="absolute inset-0 z-30 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-50" />

								{/* Dynamic Island */}
								<div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-40 border border-white/5" />

								<div className="absolute inset-0 z-10 bg-background flex flex-col">
									<div className="flex-1 overflow-hidden relative group">
										<img
											src="/ph.jpg"
											alt="App Screenshot"
											className="w-full h-full object-cover grayscale-[0.1] transition-all duration-1000"
											onError={(e) => {
												e.currentTarget.style.display = "none";
												e.currentTarget.parentElement!.classList.add(
													"bg-gradient-to-br",
													"from-primary/10",
													"to-background",
												);
											}}
										/>
										<div className="absolute inset-0 bg-background/10" />
									</div>
								</div>
							</div>

							{/* Decorative Floating Elements - Purposed Interactions */}
							<div className="absolute -left-6 top-16 w-14 h-14 bg-card/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center justify-center text-primary transition-all duration-500 hover:-translate-y-2 hover:border-primary/40 group cursor-default">
								<ChartLineUp
									weight="fill"
									size={24}
									className="drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]"
								/>
							</div>
							<div className="absolute -right-4 bottom-32 w-12 h-12 bg-card/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center justify-center text-primary transition-all duration-500 hover:translate-y-2 hover:border-primary/40 group cursor-default">
								<Users
									weight="fill"
									size={22}
									className="drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]"
								/>
							</div>
						</div>
					</div>
				</section>

				{/* Bento Grid Features - Refined */}
				<section id="features" className="max-w-7xl mx-auto px-6 mb-32">
					<div className="text-center space-y-4 mb-16">
						<h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">
							Everything you need
						</h2>
						<p className="text-muted-foreground max-w-lg mx-auto text-base font-medium">
							Professional tools simplified for elite performance management.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-6 gap-6">
						<div className="md:col-span-3 bg-card dark:bg-card/40 backdrop-blur-3xl border border-border/80 dark:border-white/10 rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between hover:border-primary/40 hover:-translate-y-1 transition-all duration-500 group shadow-2xl dark:shadow-primary/5">
							<div className="space-y-4 relative z-10">
								<div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
									<ChartLineUp size={28} weight="fill" />
								</div>
								<h3 className="text-2xl font-bold tracking-tight">
									Deep Analytics
								</h3>
								<p className="text-muted-foreground text-sm leading-relaxed font-medium">
									Track metrics that matter. From HRV to max power output, see
									your progress in high definition.
								</p>
							</div>
							<div className="mt-8 relative z-10 h-24 bg-background dark:bg-background/40 rounded-2xl border border-border/60 dark:border-white/5 flex items-end p-4 gap-1.5 overflow-hidden">
								{[40, 70, 45, 90, 65, 80, 55, 95].map((h, i) => (
									<div
										key={i}
										className="flex-1 bg-primary/20 rounded-t-sm group-hover:bg-primary/40 transition-all duration-700 ease-out"
										style={{ height: `${h}%`, transitionDelay: `${i * 50}ms` }}
									/>
								))}
							</div>
						</div>

						<div className="md:col-span-3 bg-card dark:bg-card/40 backdrop-blur-3xl border border-border/80 dark:border-white/10 rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between hover:border-primary/40 hover:-translate-y-1 transition-all duration-500 group shadow-2xl dark:shadow-primary/5">
							<div className="space-y-4 relative z-10">
								<div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
									<VideoCamera size={28} weight="fill" />
								</div>
								<h3 className="text-2xl font-bold tracking-tight">
									Video Coaching
								</h3>
								<p className="text-muted-foreground text-sm leading-relaxed font-medium">
									Upload and analyze performance video with automated tagging
									and coach feedback cycles.
								</p>
							</div>
							<div className="mt-8 relative z-10 aspect-video bg-background dark:bg-background/40 rounded-2xl border border-border/60 dark:border-white/5 flex items-center justify-center overflow-hidden">
								<div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/30 transition-all duration-500 shadow-lg">
									<Lightning weight="fill" size={22} />
								</div>
								<div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
							</div>
						</div>

						<div className="md:col-span-2 bg-card dark:bg-card/40 backdrop-blur-3xl border border-border/80 dark:border-white/10 rounded-[2.5rem] p-8 sm:p-10 flex flex-col gap-6 hover:border-primary/40 hover:-translate-y-1 transition-all duration-500 group shadow-2xl dark:shadow-primary/5">
							<div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
								<Users size={28} weight="fill" />
							</div>
							<div className="space-y-2">
								<h3 className="text-xl font-bold tracking-tight">Team Sync</h3>
								<p className="text-muted-foreground text-sm leading-relaxed font-medium">
									Coordinate with your squad in real-time.
								</p>
							</div>
						</div>

						{/* App Download Section - Refined */}
						<div className="md:col-span-4 bg-card dark:bg-card/40 backdrop-blur-3xl border border-border/80 dark:border-white/10 rounded-[2.5rem] p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 hover:border-primary/40 hover:-translate-y-1 transition-all duration-500 group shadow-2xl dark:shadow-primary/5">
							<div className="space-y-2 text-center md:text-left">
								<h3 className="text-2xl font-bold tracking-tight">
									Download PH Performance
								</h3>
								<p className="text-muted-foreground text-sm font-medium">
									Available now on iOS and Android.
								</p>
							</div>
							<div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
								<a
									href="#"
									className="flex items-center gap-4 bg-foreground text-background px-6 py-3 rounded-2xl hover:opacity-90 transition-all active:scale-[0.98] shadow-xl group/btn"
								>
									<img
										src="/apple-app-store.svg"
										alt="App Store"
										className="w-7 h-7 dark:invert"
									/>
									<div className="text-left">
										<p className="text-[10px] uppercase font-black leading-none opacity-70">
											Download on
										</p>
										<p className="text-lg font-bold leading-none tracking-tight">
											App Store
										</p>
									</div>
								</a>
								<a
									href="#"
									className="flex items-center gap-4 bg-foreground text-background px-6 py-3 rounded-2xl hover:opacity-90 transition-all active:scale-[0.98] shadow-xl group/btn"
								>
									<img
										src="/svgs/google.svg"
										alt="Google Play"
										className="w-7 h-7"
									/>
									<div className="text-left">
										<p className="text-[10px] uppercase font-black leading-none opacity-70">
											Get it on
										</p>
										<p className="text-lg font-bold leading-none tracking-tight">
											Google Play
										</p>
									</div>
								</a>
							</div>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
