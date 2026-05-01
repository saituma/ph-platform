import {
	ChartLineUp,
	CircleNotch,
	Users,
	VideoCamera,
	WarningCircle,
} from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import type { TestimonialItem } from "#/components/shadcn-studio/blocks/testimonials-component-18/testimonials-component-18";
import TestimonialsComponent from "#/components/shadcn-studio/blocks/testimonials-component-18/testimonials-component-18";
import { CoachVideoSection } from "#/components/home/CoachVideoSection";
import { GallerySection } from "#/components/home/GallerySection";
import { Input } from "#/components/ui/input";
import { fetchGalleryItems, type GalleryApiItem } from "#/services/galleryService";
import { PhoneMockup } from "#/components/ui/PhoneMockup";
import { config } from "#/lib/config";
import { usePortalConfig } from "#/hooks/usePortalConfig";

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
		<div className="relative min-h-[100dvh] bg-background selection:bg-foreground selection:text-background overflow-x-hidden">
			<main>
				{/* ━━━ Hero ━━━ */}
				<section id="hero" className="relative pt-[var(--topbar-height)] lg:pt-0">
					<div className="relative text-foreground">
						<div className="flex flex-col lg:flex-row">
							{/* Left side — Title */}
							<div className="relative w-full lg:w-[40%] lg:h-dvh border-b lg:border-b-0 lg:border-r border-foreground/[0.06] px-5 sm:px-6 lg:px-7 lg:sticky lg:top-0 z-10 bg-background lg:overflow-clip">
								{/* Subtle noise background */}
								<div className="absolute inset-0 overflow-hidden bg-background pointer-events-none" aria-hidden="true">
									<div className="w-full h-full bg-noise-pattern opacity-[0.03] dark:opacity-[0.08]" />
								</div>

								<motion.div
									initial={{ opacity: 0, y: 12 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.5, ease: "easeOut" }}
									className="relative z-[2] w-full py-16 flex flex-col justify-center h-full pointer-events-none"
								>
									<div>
										{/* Eyebrow badge */}
										{portalCfg.hero?.eyebrow && (
											<span className="relative inline-flex items-center gap-1.5 px-2.5 py-1 pointer-events-auto rounded-full bg-neutral-200/80 dark:bg-neutral-800/80 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/50 transition-colors">
												<svg xmlns="http://www.w3.org/2000/svg" width="0.9em" height="0.9em" viewBox="0 0 24 24" className="text-neutral-600 dark:text-neutral-100" aria-hidden="true">
													<path fill="currentColor" d="M12 17l1.56-3.42L17 12l-3.44-1.56L12 7l-1.57 3.44L7 12l3.43 1.58z" />
												</svg>
												<span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-100 font-light">
													{portalCfg.hero.eyebrow}
												</span>
											</span>
										)}

										{/* Headline */}
										<h1 className="pt-3 sm:pt-4 text-2xl md:text-3xl xl:text-4xl text-primary tracking-tight leading-tight text-balance">
											{portalCfg.hero?.title ?? "The most comprehensive"}{" "}
											<span className="text-primary/90">{portalCfg.hero?.titleAccent ?? "performance platform"}</span>
										</h1>

										{/* Subtitle */}
										{portalCfg.hero?.subtitle && (
											<p className="pt-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-md">
												{portalCfg.hero.subtitle}
											</p>
										)}

										{/* CTA Buttons */}
										<div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-4 sm:pt-5 pointer-events-auto">
											{authReady && isAuthenticated ? (
												<>
													<button
														type="button"
														onClick={() => navigate({ to: "/portal/dashboard" })}
														className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:opacity-90 transition-colors"
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
														className="relative inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 text-neutral-600 dark:text-neutral-300 text-xs sm:text-sm font-medium transition-colors group"
													>
														<span className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity" style={{
															backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 4px, currentColor 4px, currentColor 5px)",
														}} />
														<span className="absolute top-0 -left-[6px] -right-[6px] h-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
														<span className="absolute bottom-0 -left-[6px] -right-[6px] h-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
														<span className="absolute left-0 -top-[6px] -bottom-[6px] w-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
														<span className="absolute right-0 -top-[6px] -bottom-[6px] w-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
														<span className="relative">Sign Out</span>
													</button>
												</>
											) : authReady ? (
												<>
													<button
														type="button"
														onClick={() => navigate({ to: "/register" })}
														className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:opacity-90 transition-colors"
													>
														Get Started
													</button>
													<button
														type="button"
														onClick={() => navigate({ to: "/login" })}
														className="relative inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 text-neutral-600 dark:text-neutral-300 text-xs sm:text-sm font-medium transition-colors group"
													>
														<span className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity" style={{
															backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 4px, currentColor 4px, currentColor 5px)",
														}} />
														<span className="absolute top-0 -left-[6px] -right-[6px] h-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
														<span className="absolute bottom-0 -left-[6px] -right-[6px] h-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
														<span className="absolute left-0 -top-[6px] -bottom-[6px] w-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
														<span className="absolute right-0 -top-[6px] -bottom-[6px] w-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
														<span className="absolute -bottom-[6px] -right-[6px] font-mono text-[8px] text-foreground/40 dark:text-foreground/50 leading-none select-none translate-x-1/2 translate-y-1/2">+</span>
														<span className="relative">Sign In</span>
													</button>
												</>
											) : null}
										</div>

										{/* Stats */}
										<div className="flex items-center gap-0 mt-6 pointer-events-auto">
											{stats.map((stat, i) => (
												<div key={stat.label} className="flex items-center">
													{i > 0 && <span className="text-foreground/10 text-[10px] mx-2">|</span>}
													<div className="flex items-baseline gap-1.5">
														<span className="font-mono text-sm font-medium text-foreground">{stat.value}</span>
														<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">{stat.label}</span>
													</div>
												</div>
											))}
										</div>
									</div>
								</motion.div>
							</div>

							{/* Right side — Email signup + Phone mockup */}
							<div className="relative z-0 w-full lg:w-[60%] overflow-x-hidden">
								<div className="flex flex-col items-center justify-center min-h-[60vh] lg:min-h-dvh px-5 sm:px-6 lg:px-10 py-16">
									{/* Email form */}
									{authReady && !isAuthenticated && (
										<motion.div
											initial={{ opacity: 0, y: 8 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
											className="w-full max-w-md mb-12"
										>
											<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 mb-3">
												Start free — no credit card required
											</p>
											<form
												onSubmit={handleSubmit}
												className={`flex w-full overflow-hidden border ${
													error ? "border-destructive/50" : "border-foreground/[0.06] focus-within:border-foreground/20"
												} transition-colors duration-200`}
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
													className="flex-1 border-0 rounded-none h-10 px-4 focus-visible:ring-0 bg-transparent font-mono text-sm placeholder:text-foreground/25 min-w-0"
												/>
												<button
													type="submit"
													disabled={isLoading}
													className="h-10 px-5 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider shrink-0 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-70"
												>
													{isLoading ? (
														<CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
													) : (
														portalCfg.hero?.emailCtaLabel ?? "Join"
													)}
												</button>
											</form>
											{error && (
												<p className="mt-2 text-xs text-destructive flex items-center gap-1.5 break-words font-mono">
													<WarningCircle weight="fill" className="w-3.5 h-3.5 shrink-0" />
													{error}
												</p>
											)}
										</motion.div>
									)}

									{/* Phone mockup */}
									<motion.div
										initial={{ opacity: 0, y: 16 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
										className="w-full max-w-[280px] animate-float"
									>
										<PhoneMockup
											src={portalCfg.hero?.mobileScreenshotUrl || "/home.png"}
											alt="PH Performance app — home screen"
										/>
									</motion.div>
								</div>
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
				<section id="features" className="border-t border-foreground/[0.06]">
					<div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-7 py-24 sm:py-32">
						<div className="mb-16">
							<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 mb-4">
								{portalCfg.features?.heading ?? "Capabilities"}
							</p>
							<h2 className="text-2xl md:text-3xl xl:text-4xl tracking-tight leading-tight text-balance text-primary">
								{featuresSubheading.head}{" "}
								<span className="text-primary/60">{featuresSubheading.tail}</span>
							</h2>
							{portalCfg.features?.description && (
								<p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-lg">
									{portalCfg.features.description}
								</p>
							)}
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 border border-foreground/[0.06] divide-y md:divide-y-0 md:divide-x divide-foreground/[0.06]">
							{featuresFromConfig.map((feature, i) => (
								<motion.div
									key={feature.title}
									initial={{ opacity: 0, y: 16 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
									className="group relative overflow-hidden p-8 lg:p-10 hover:bg-foreground/[0.02] transition-colors duration-200"
								>
									{/* Large muted number */}
									<span
										className="absolute top-4 right-4 font-mono text-[6rem] leading-none font-bold text-foreground/[0.03] select-none pointer-events-none"
										aria-hidden
									>
										{feature.num}
									</span>

									<div className="relative z-10">
										<div className="text-foreground/60 mb-6">
											<feature.icon size={32} weight="light" />
										</div>
										<h3 className="text-base font-medium text-foreground mb-3 tracking-tight">
											{feature.title}
										</h3>
										<p className="text-sm text-muted-foreground leading-relaxed">
											{feature.description}
										</p>
									</div>

									<div className="absolute bottom-0 left-0 right-0 h-px bg-foreground origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
								</motion.div>
							))}
						</div>
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
				<section className="border-t border-foreground/[0.06]">
					<div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-7 py-24 sm:py-32">
						<div className="flex flex-col items-center text-center">
							<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 mb-4">
								{portalCfg.cta?.eyebrow ?? "Get Started"}
							</p>
							<h2 className="text-2xl md:text-3xl xl:text-4xl tracking-tight leading-tight text-balance mb-4 text-primary">
								{ctaHeading.head}{" "}
								<span className="text-primary/60">{ctaHeading.tail}</span>
							</h2>
							{portalCfg.cta?.body && (
								<p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-8">
									{portalCfg.cta.body}
								</p>
							)}
							<div className="flex flex-wrap items-center justify-center gap-3">
								<button
									type="button"
									onClick={() => navigate({ to: "/register" })}
									className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:opacity-90 transition-colors"
								>
									Get Started Free
								</button>
								<button
									type="button"
									onClick={() => navigate({ to: "/login" })}
									className="relative inline-flex items-center gap-1.5 px-6 py-2.5 text-foreground/60 text-xs sm:text-sm font-medium transition-colors group"
								>
									<span className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity" style={{
										backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 4px, currentColor 4px, currentColor 5px)",
									}} />
									<span className="absolute top-0 -left-[6px] -right-[6px] h-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
									<span className="absolute bottom-0 -left-[6px] -right-[6px] h-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
									<span className="absolute left-0 -top-[6px] -bottom-[6px] w-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
									<span className="absolute right-0 -top-[6px] -bottom-[6px] w-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
									<span className="relative">Sign In</span>
								</button>
							</div>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
