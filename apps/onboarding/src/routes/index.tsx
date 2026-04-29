import {
	ChartLineUp,
	CircleNotch,
	Users,
	VideoCamera,
	WarningCircle,
} from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import CTA from "#/components/shadcn-studio/blocks/cta-section-01/cta-section-01";
import type { TestimonialItem } from "#/components/shadcn-studio/blocks/testimonials-component-18/testimonials-component-18";
import TestimonialsComponent from "#/components/shadcn-studio/blocks/testimonials-component-18/testimonials-component-18";
import { CoachVideoSection } from "#/components/home/CoachVideoSection";
import { GallerySection } from "#/components/home/GallerySection";
import { Input } from "#/components/ui/input";
import { fetchGalleryItems, type GalleryApiItem } from "#/services/galleryService";
import { PhoneMockup } from "#/components/ui/PhoneMockup";
import { config } from "#/lib/config";
import { usePortalConfig } from "#/hooks/usePortalConfig";

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

const STATS = [
	{ value: "10K+", label: "Athletes" },
	{ value: "500+", label: "Coaches" },
	{ value: "4.9★", label: "Rating" },
];

/* ─── Component ─── */

function RouteComponent() {
	const portalCfg = usePortalConfig();
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const [authReady, setAuthReady] = useState(false);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [galleryItems, setGalleryItems] = useState<GalleryApiItem[]>([]);
	const [galleryLoading, setGalleryLoading] = useState(true);
	const navigate = useNavigate();

	const splitLast = (text: string | undefined | null) => {
		const parts = (text ?? "").trim().split(/\s+/).filter(Boolean);
		if (parts.length <= 1) return { head: "", tail: parts[0] ?? "" };
		return { head: parts.slice(0, -1).join(" "), tail: parts[parts.length - 1] };
	};
	const splitFirst2 = (text: string | undefined | null) => {
		const parts = (text ?? "").trim().split(/\s+/).filter(Boolean);
		if (parts.length === 0) return { head: "", tail: "" };
		if (parts.length === 1) return { head: parts[0], tail: "" };
		return { head: parts.slice(0, 2).join(" "), tail: parts.slice(2).join(" ") };
	};

	const safeTestimonialItems = Array.isArray(portalCfg.testimonials?.items) ? portalCfg.testimonials.items : [];
	const configuredTestimonials: TestimonialItem[] = safeTestimonialItems.length
		? safeTestimonialItems.map((t) => {
			const roleStr = typeof t?.role === "string" ? t.role : "";
			const [roleVal, companyVal] = roleStr.split("·").map((s) => s.trim());
			return {
				name: typeof t?.name === "string" ? t.name : "",
				role: roleVal || roleStr,
				company: companyVal || "",
				rating: 5,
				content: typeof t?.quote === "string" ? t.quote : "",
			};
		})
		: testimonials;
	const safeFeatureItems = Array.isArray(portalCfg.features?.items) ? portalCfg.features.items : [];
	const featuresFromConfig = safeFeatureItems.length
		? safeFeatureItems.map((f, i) => ({
			num: String(i + 1).padStart(2, "0"),
			icon: FEATURES[i % FEATURES.length].icon,
			title: typeof f?.title === "string" ? f.title : "",
			description: typeof f?.body === "string" ? f.body : "",
		}))
		: FEATURES;
	const stats = Array.isArray(portalCfg.hero?.stats) && portalCfg.hero.stats.length ? portalCfg.hero.stats : STATS;
	const featuresSubheading = splitLast(portalCfg.features?.subheading);
	const testimonialsHeading = splitLast(portalCfg.testimonials?.heading);
	const ctaHeading = splitLast(portalCfg.cta?.heading);
	const ceoTitle = splitFirst2(portalCfg.ceoIntro?.title);

	useEffect(() => {
		fetchGalleryItems().then((data) => {
			setGalleryItems(data);
			setGalleryLoading(false);
		});
	}, []);

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
					{/* Background: stronger radial bloom + subtle grid */}
					<div
						className="absolute inset-0 pointer-events-none -z-10"
						style={{
							background: "radial-gradient(ellipse at 15% 30%, hsl(var(--primary) / 0.14), transparent 60%)",
						}}
					/>
					<div
						className="absolute inset-0 pointer-events-none -z-10"
						style={{
							backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='rgba(255,255,255,0.025)' stroke-width='1'/%3E%3C/svg%3E")`,
							backgroundSize: "60px 60px",
						}}
					/>

					<div className="max-w-6xl mx-auto w-full py-24 md:py-32 flex flex-col md:flex-row items-start md:items-center justify-between gap-12 md:gap-16 lg:gap-24">
						{/* Copy side */}
						<div className="hero-stagger flex-1 min-w-0 w-full">
							{/* Overline */}
							<p
								className="text-primary font-black mb-6"
								style={{ fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase" }}
							>
								{portalCfg.hero?.eyebrow ?? ""}
							</p>

							{/* Headline */}
							<h1
								className="font-black uppercase text-foreground"
								style={{
									fontFamily: "var(--font-display)",
									fontSize: "clamp(3rem, 8vw, 9rem)",
									letterSpacing: "-0.03em",
									lineHeight: 0.95,
								}}
							>
								{portalCfg.hero?.title ?? ""}
								<br />
								<span className="text-primary">{portalCfg.hero?.titleAccent ?? ""}</span>
							</h1>

							{/* Subheading */}
							<p
								className="mt-6 text-muted-foreground max-w-lg"
								style={{ fontSize: "clamp(0.9rem, 1.25vw, 1.1rem)", lineHeight: 1.65 }}
							>
								{portalCfg.hero?.subtitle ?? ""}
							</p>

							{/* Stats bar */}
							<div className="flex items-center gap-0 mt-8 border border-border/50 divide-x divide-border/50 w-fit">
								{stats.map((stat) => (
									<div key={stat.label} className="px-5 py-3">
										<p
											className="font-black text-foreground uppercase"
											style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", lineHeight: 1 }}
										>
											{stat.value}
										</p>
										<p
											className="text-muted-foreground/60 font-bold uppercase mt-1"
											style={{ fontSize: "0.6rem", letterSpacing: "0.15em" }}
										>
											{stat.label}
										</p>
									</div>
								))}
							</div>

							{/* Auth states */}
							{authReady && isAuthenticated && (
								<div className="mt-8 max-w-md">
									<div className="border border-primary/20 bg-card p-5">
										<p className="text-sm font-black uppercase tracking-wider text-foreground" style={{ fontFamily: "var(--font-display)" }}>
											Welcome back.
										</p>
										<p className="mt-1 text-sm text-muted-foreground">
											Continue to your portal dashboard.
										</p>
										<div className="mt-4 flex gap-3">
											<button
												type="button"
												onClick={() => navigate({ to: "/portal/dashboard" })}
												className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs px-4 py-2.5 hover:bg-primary/90 active:scale-[0.98] transition-all"
												style={{ transitionDuration: "var(--duration-micro)", transitionTimingFunction: "var(--ease)" }}
											>
												Go to Dashboard
											</button>
											<button
												type="button"
												onClick={() => {
													localStorage.removeItem("auth_token");
													localStorage.removeItem("user_type");
													localStorage.removeItem("pending_email");
													setIsAuthenticated(false);
												}}
												className="border border-border/60 text-muted-foreground font-bold uppercase tracking-wider text-xs px-4 py-2.5 hover:text-foreground hover:border-border transition-all"
												style={{ transitionDuration: "var(--duration-micro)", transitionTimingFunction: "var(--ease)" }}
											>
												Sign Out
											</button>
										</div>
									</div>
								</div>
							)}

							{authReady && !isAuthenticated && (
								<div className="mt-8 max-w-md space-y-3">
									<form
										onSubmit={handleSubmit}
										className={`flex w-full overflow-hidden ${
											error
												? "ring-1 ring-destructive/50"
												: "ring-1 ring-border/60 focus-within:ring-primary/50"
										}`}
										style={{ transition: `box-shadow var(--duration-standard) var(--ease)` }}
									>
										<Input
											type="email"
											placeholder={portalCfg.hero?.emailPlaceholder ?? "Enter your email"}
											aria-label="Email address"
											value={email}
											onChange={(e) => {
												setEmail(e.target.value);
												if (error) setError(undefined);
											}}
											disabled={isLoading}
											className="flex-1 border-0 rounded-none h-12 px-5 focus-visible:ring-0 bg-card/80 text-sm placeholder:text-muted-foreground/40 min-w-0"
										/>
										<button
											type="submit"
											disabled={isLoading}
											className="h-12 px-6 bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs shrink-0 flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-70"
											style={{ transitionDuration: "var(--duration-micro)", transitionTimingFunction: "var(--ease)" }}
										>
											{isLoading ? (
												<CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
											) : (
												portalCfg.hero?.emailCtaLabel ?? "Join Free"
											)}
										</button>
									</form>
									{error && (
										<p className="text-xs text-destructive flex items-center gap-1.5 break-words">
											<WarningCircle weight="fill" className="w-4 h-4 shrink-0" />
											{error}
										</p>
									)}
								</div>
							)}
						</div>

						{/* Phone mockup */}
						<div className="shrink-0 w-full max-w-[320px] mx-auto md:mx-0 md:w-[270px] lg:w-[300px] animate-float">
							<div
								style={{
									filter: "drop-shadow(0 0 40px hsl(var(--primary) / 0.18)) drop-shadow(0 0 80px hsl(var(--primary) / 0.08))",
								}}
							>
								<PhoneMockup
									src={portalCfg.hero?.mobileScreenshotUrl || "/home.png"}
									alt="PH Performance app — home screen"
								/>
							</div>
						</div>
					</div>
				</section>

				{/* ━━━ Coach Video ━━━ */}
				<CoachVideoSection
					eyebrow={portalCfg.ceoIntro?.eyebrow}
					titleLine1={ceoTitle.head}
					titleLine2={ceoTitle.tail}
					body={portalCfg.ceoIntro?.body}
					name={portalCfg.ceoIntro?.name}
					role={portalCfg.ceoIntro?.role}
					watchLabel={portalCfg.ceoIntro?.watchLabel}
					photoUrl={portalCfg.ceoIntro?.photoUrl || undefined}
					videoUrl={portalCfg.ceoIntro?.videoUrl || undefined}
				/>

				{/* ━━━ Features ━━━ */}
				<section id="features" className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
					<div className="mb-16">
						<p
							className="text-primary font-black mb-5"
							style={{ fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase" }}
						>
							{portalCfg.features?.heading ?? ""}
						</p>
						<h2
							className="font-black uppercase text-foreground"
							style={{
								fontFamily: "var(--font-display)",
								fontSize: "clamp(2rem, 5vw, 4.5rem)",
								letterSpacing: "-0.02em",
								lineHeight: 1,
							}}
						>
							{featuresSubheading.head}
							<br />
							<span className="text-primary">{featuresSubheading.tail}</span>
						</h2>
						<p
							className="mt-5 text-muted-foreground max-w-lg"
							style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.1rem)", lineHeight: 1.65 }}
						>
							{portalCfg.features?.description ?? ""}
						</p>
					</div>

					{/* 3-column card grid */}
					<div className="grid grid-cols-1 md:grid-cols-3 border border-border/40 divide-y md:divide-y-0 md:divide-x divide-border/40">
						{featuresFromConfig.map((feature) => (
							<div
								key={feature.title}
								className="feature-card group relative overflow-hidden p-10 hover:bg-card/50 transition-colors"
								style={{ transitionDuration: "var(--duration-standard)", transitionTimingFunction: "var(--ease)" }}
							>
								{/* Large muted number behind */}
								<span
									className="absolute top-4 right-4 font-black text-foreground/5 select-none leading-none pointer-events-none"
									style={{ fontFamily: "var(--font-display)", fontSize: "8rem", lineHeight: 0.85 }}
									aria-hidden
								>
									{feature.num}
								</span>

								<div className="relative z-10">
									<div className="text-primary mb-8">
										<feature.icon size={40} weight="fill" />
									</div>
									<h3
										className="font-black uppercase text-foreground mb-4"
										style={{
											fontFamily: "var(--font-display)",
											fontSize: "1.5rem",
											letterSpacing: "-0.01em",
											lineHeight: 1,
										}}
									>
										{feature.title}
									</h3>
									<p
										className="text-muted-foreground leading-relaxed"
										style={{ fontSize: "0.9rem", lineHeight: 1.7 }}
									>
										{feature.description}
									</p>
								</div>

								{/* Bottom green bar on hover */}
								<div
									className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary origin-left scale-x-0 group-hover:scale-x-100"
									style={{ transition: "transform var(--duration-standard) cubic-bezier(0.25, 0, 0, 1)" }}
								/>
							</div>
						))}
					</div>
				</section>

				{/* ━━━ Testimonials ━━━ */}
				<TestimonialsComponent
					testimonials={configuredTestimonials}
					eyebrow={portalCfg.testimonials?.eyebrow}
					headingLine1={testimonialsHeading.head}
					headingLine2={testimonialsHeading.tail}
				/>

				{/* ━━━ Gallery ━━━ */}
				<GallerySection apiItems={galleryItems} isLoading={galleryLoading} />

				{/* ━━━ CTA ━━━ */}
				<CTA
					eyebrow={portalCfg.cta?.eyebrow}
					headingLine1={ctaHeading.head}
					headingLine2={ctaHeading.tail}
					body={portalCfg.cta?.body}
					appStoreLabel={portalCfg.cta?.appStoreLabel}
					playStoreLabel={portalCfg.cta?.playStoreLabel}
				/>
			</main>
		</div>
	);
}
