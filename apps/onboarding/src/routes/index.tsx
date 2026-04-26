import {
	ArrowRight,
	ChartLineUp,
	CircleNotch,
	Users,
	VideoCamera,
	WarningCircle,
} from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import CTA from "#/components/shadcn-studio/blocks/cta-section-01/cta-section-01";
import type { TestimonialItem } from "#/components/shadcn-studio/blocks/testimonials-component-18/testimonials-component-18";
import TestimonialsComponent from "#/components/shadcn-studio/blocks/testimonials-component-18/testimonials-component-18";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { config } from "#/lib/config";

/* ─── SEO / Structured Data ─── */

const SITE_URL = "https://ph-platform-onboarding.vercel.app";

const organizationSchema = {
	"@context": "https://schema.org",
	"@type": "Organization",
	name: "PH Performance",
	url: SITE_URL,
	logo: `${SITE_URL}/ph.jpg`,
	description:
		"Professional athlete and team performance tracking platform with deep analytics, video coaching, and team sync.",
	sameAs: [],
};

const websiteSchema = {
	"@context": "https://schema.org",
	"@type": "WebSite",
	name: "PH Performance",
	url: SITE_URL,
	potentialAction: {
		"@type": "SearchAction",
		target: `${SITE_URL}/?q={search_term_string}`,
		"query-input": "required name=search_term_string",
	},
};

const softwareAppSchema = {
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	name: "PH Performance",
	applicationCategory: "SportsApplication",
	operatingSystem: "iOS, Android",
	offers: {
		"@type": "Offer",
		price: "0",
		priceCurrency: "GBP",
	},
	description:
		"Elite performance tracking for athletes and teams — analytics, video coaching, team sync, and scheduling.",
};

export const Route = createFileRoute("/")(
	{
	head: () => ({
		meta: [
			{ title: "PH Performance — Elite Athlete & Team Training Platform" },
			{
				name: "description",
				content:
					"Track performance, optimize training, and manage your team with PH Performance. Deep analytics, video coaching, and real-time team sync for elite athletes.",
			},
			{ property: "og:title", content: "PH Performance — Elite Athlete & Team Training Platform" },
			{
				property: "og:description",
				content:
					"Professional performance tracking for athletes and teams. Deep analytics, video coaching, and real-time team sync — all in one platform.",
			},
			{ property: "og:url", content: SITE_URL },
			{ property: "og:type", content: "website" },
		],
		links: [{ rel: "canonical", href: SITE_URL }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify(organizationSchema),
			},
			{
				type: "application/ld+json",
				children: JSON.stringify(websiteSchema),
			},
			{
				type: "application/ld+json",
				children: JSON.stringify(softwareAppSchema),
			},
		],
	}),
	component: RouteComponent,
});

/* ─── Data ─── */

const testimonials: TestimonialItem[] = [
	{
		name: "Marcus Thorne",
		role: "Head Coach",
		company: "Elite Track Club",
		rating: 5,
		content:
			"PH Performance has completely revolutionized how we track athlete progress. The video analysis tools are the best in the industry.",
	},
	{
		name: "Elena Rodriguez",
		role: "Pro Athlete",
		company: "Global Cycling",
		rating: 5,
		content:
			"The data-driven insights allowed me to push past my plateaus and set new personal records this season.",
	},
	{
		name: "David Chen",
		role: "Performance Director",
		company: "Titan Athletics",
		rating: 5,
		content:
			"My coaches were up and running in minutes. The team sync features are a genuine game-changer for our organization.",
	},
];

const registrationSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

const FEATURES = [
	{
		num: "01",
		icon: ChartLineUp,
		title: "Deep Analytics",
		description:
			"Track the metrics that matter — from HRV to max power output. Professional-grade dashboards show your progress in high definition.",
	},
	{
		num: "02",
		icon: VideoCamera,
		title: "Video Coaching",
		description:
			"Upload performance video with automated tagging and frame-by-frame review. Structured feedback cycles keep athletes and coaches aligned.",
	},
	{
		num: "03",
		icon: Users,
		title: "Team Sync",
		description:
			"Coordinate with your squad in real-time. Manage rosters, schedule sessions, and share insights across your entire organization.",
	},
];

/* ─── IntersectionObserver for feature rows ─── */

function useFeatureObserver() {
	const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

	const setRef = useCallback(
		(index: number) => (el: HTMLDivElement | null) => {
			rowRefs.current[index] = el;
		},
		[],
	);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const el = entry.target as HTMLElement;
						const delay = Number(el.dataset.delay) || 0;
						setTimeout(() => {
							el.classList.add("is-visible");
						}, delay);
						observer.unobserve(el);
					}
				}
			},
			{ threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
		);

		// Defer to ensure DOM is painted
		const timeout = setTimeout(() => {
			for (const el of rowRefs.current) {
				if (el) observer.observe(el);
			}
		}, 100);

		return () => {
			clearTimeout(timeout);
			observer.disconnect();
		};
	}, []);

	return { setRef };
}

/* ─── Component ─── */

function RouteComponent() {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const [authReady, setAuthReady] = useState(false);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const navigate = useNavigate();
	const { setRef } = useFeatureObserver();

	useEffect(() => {
		let cancelled = false;
		const syncAuthState = async () => {
			if (typeof window === "undefined") return;
			const token = localStorage.getItem("auth_token");
			if (!token) {
				if (!cancelled) {
					setIsAuthenticated(false);
					setAuthReady(true);
				}
				return;
			}
			try {
				const baseUrl = config.api.baseUrl.replace(/\/+$/, "");
				const response = await fetch(`${baseUrl}/api/auth/me`, {
					headers: { Authorization: `Bearer ${token}` },
					cache: "no-store",
				});
				const isAuthenticatedStatus =
					response.status === 200 || response.status === 304;
				if (!cancelled) setIsAuthenticated(isAuthenticatedStatus);
				if (
					(response.status === 401 || response.status === 403) &&
					typeof window !== "undefined"
				) {
					localStorage.removeItem("auth_token");
					localStorage.removeItem("user_type");
					localStorage.removeItem("pending_email");
				}
			} catch {
				if (!cancelled) setIsAuthenticated(true);
			} finally {
				if (!cancelled) setAuthReady(true);
			}
		};
		void syncAuthState();
		return () => {
			cancelled = true;
		};
	}, []);

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
		<div className="relative min-h-[100dvh] bg-background selection:bg-primary/20 overflow-x-hidden">
			<main>
				{/* ━━━ Hero ━━━ */}
				<section className="relative min-h-[100dvh] flex items-center px-6">
					{/* Accent radial bloom — top-left, 8% opacity */}
					<div
						className="absolute top-0 left-0 w-[60vw] h-[60vh] pointer-events-none -z-10"
						style={{
							background: "radial-gradient(ellipse at 20% 20%, hsl(var(--primary) / 0.08), transparent 70%)",
						}}
					/>

					<div className="max-w-6xl mx-auto w-full py-24 md:py-32 flex flex-row items-center justify-between gap-6 md:gap-16 lg:gap-24">
						{/* Copy side */}
						<div className="hero-stagger flex-1 min-w-0 pr-2">
							<h1
								className="font-bold text-foreground leading-[1.08]"
								style={{ fontSize: "clamp(1.75rem, 4vw, 7rem)", letterSpacing: "-0.02em" }}
							>
								Train Smarter.
								<br />
								<span className="text-primary">Recover Faster.</span>
							</h1>

							<p
								className="mt-4 md:mt-6 text-muted-foreground max-w-lg"
								style={{ fontSize: "clamp(0.875rem, 1.25vw, 1.125rem)", lineHeight: 1.6 }}
							>
								The professional platform for athletes and coaches who track
								progress, optimize training, and push beyond limits.
							</p>

							{/* Auth states */}
							{authReady && isAuthenticated && (
								<div className="mt-8 max-w-md">
									<div className="rounded-xl border border-border bg-card p-5">
										<p className="text-sm font-semibold text-foreground">
											Welcome back.
										</p>
										<p className="mt-1 text-sm text-muted-foreground">
											Continue to your portal dashboard.
										</p>
										<div className="mt-4 flex gap-3">
											<Button
												type="button"
												onClick={() => navigate({ to: "/portal/dashboard" })}
												className="flex-1 text-xs md:text-sm"
											>
												Go to Dashboard
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={() => {
													localStorage.removeItem("auth_token");
													localStorage.removeItem("user_type");
													localStorage.removeItem("pending_email");
													setIsAuthenticated(false);
												}}
												className="text-xs md:text-sm"
											>
												Sign Out
											</Button>
										</div>
									</div>
								</div>
							)}

							{authReady && !isAuthenticated && (
								<div className="mt-6 md:mt-8 max-w-md space-y-3">
									<form
										onSubmit={handleSubmit}
										className={`flex w-full overflow-hidden rounded-xl transition-colors ${
											error
												? "ring-1 ring-destructive/40"
												: "ring-1 ring-[rgba(255,255,255,0.12)] focus-within:ring-primary/60"
										}`}
										style={{ transitionDuration: "var(--duration-standard)", transitionTimingFunction: "var(--ease)" }}
									>
										<Input
											type="email"
											placeholder="Enter your email"
											aria-label="Email address"
											value={email}
											onChange={(e) => {
												setEmail(e.target.value);
												if (error) setError(undefined);
											}}
											disabled={isLoading}
											className="flex-1 border-0 h-10 md:h-12 px-4 md:px-5 focus-visible:ring-0 bg-transparent text-sm placeholder:text-muted-foreground/50 min-w-0"
										/>
										<button
											type="submit"
											disabled={isLoading}
											className="h-10 md:h-12 px-4 md:px-5 bg-card text-primary hover:text-foreground border-l border-[rgba(255,255,255,0.12)] transition-colors shrink-0 flex items-center justify-center"
											style={{ transitionDuration: "var(--duration-micro)", transitionTimingFunction: "var(--ease)" }}
										>
											{isLoading ? (
												<CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
											) : (
												<ArrowRight weight="bold" className="w-4 h-4" />
											)}
										</button>
									</form>
									{error && (
										<p className="text-xs md:text-sm text-destructive flex items-center gap-1.5 break-words">
											<WarningCircle weight="fill" className="w-4 h-4 shrink-0" />
											{error}
										</p>
									)}
									<p className="text-muted-foreground/50 leading-tight" style={{ fontSize: "clamp(0.6rem, 1vw, 0.8rem)" }}>
										Free 14-day trial · No credit card · Cancel anytime
									</p>
								</div>
							)}
						</div>

						{/* App screenshot — clean container, no phone chrome */}
						<div className="relative shrink-0 w-[120px] sm:w-[180px] md:w-[240px] lg:w-[260px]">
							<div className="w-full rounded-2xl overflow-hidden ring-1 ring-[rgba(255,255,255,0.08)] animate-float">
								<img
									src="/home.png"
									alt="PH Performance app — home screen"
									className="w-full h-auto block"
									onError={(e) => {
										e.currentTarget.style.display = "none";
									}}
								/>
							</div>
						</div>
					</div>
				</section>

				{/* ━━━ Features ━━━ */}
				<section id="features" className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
					<div className="mb-16">
						<p className="text-primary font-semibold mb-3" style={{ fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
							How it works
						</p>
						<h2
							className="font-bold text-foreground"
							style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", letterSpacing: "-0.02em" }}
						>
							Built for serious athletes
						</h2>
						<p
							className="mt-3 text-muted-foreground max-w-lg"
							style={{ fontSize: "clamp(1rem, 1.5vw, 1.125rem)", lineHeight: 1.6 }}
						>
							Professional tools that simplify elite performance management.
						</p>
					</div>

					<div>
						{FEATURES.map((feature, index) => (
							<div
								key={feature.title}
								ref={setRef(index)}
								data-delay={index * 100}
								className="feature-row border-t border-border/40 py-10 sm:py-12 grid grid-cols-1 sm:grid-cols-[4rem_1fr_auto] gap-4 sm:gap-8 items-start"
							>
								{/* Number — hidden on mobile */}
								<span
									className="hidden sm:block text-4xl font-bold text-muted-foreground/15 select-none"
									style={{ fontFamily: "var(--font-display)", lineHeight: 1 }}
								>
									{feature.num}
								</span>

								{/* Content */}
								<div>
									<h3
										className="text-xl font-bold text-foreground"
										style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
									>
										{feature.title}
									</h3>
									<p
										className="mt-2 text-muted-foreground max-w-lg"
										style={{ lineHeight: 1.6 }}
									>
										{feature.description}
									</p>
								</div>

								{/* Icon */}
								<div className="hidden sm:flex w-10 h-10 items-center justify-center text-primary/60">
									<feature.icon size={24} weight="fill" />
								</div>
							</div>
						))}
						{/* Bottom border */}
						<div className="border-t border-border/40" />
					</div>
				</section>

				{/* ━━━ Testimonials ━━━ */}
				<TestimonialsComponent testimonials={testimonials} />

				{/* ━━━ CTA ━━━ */}
				<CTA />
			</main>
		</div>
	);
}
