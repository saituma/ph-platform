import { config } from "@/lib/config";

export type PortalLink = { label: string; href: string };
export type Stat = { value: string; label: string };
export type FeatureItem = { title: string; body: string };
export type TestimonialEntry = { quote: string; name: string; role: string };

export type PortalConfig = {
	nav: {
		brand: string;
		links: PortalLink[];
		loginLabel: string;
		getStartedLabel: string;
	};
	hero: {
		eyebrow: string;
		title: string;
		titleAccent: string;
		subtitle: string;
		stats: Stat[];
		emailPlaceholder: string;
		emailCtaLabel: string;
		mobileScreenshotUrl: string;
	};
	ceoIntro: {
		eyebrow: string;
		title: string;
		body: string;
		name: string;
		role: string;
		watchLabel: string;
		videoUrl: string;
		photoUrl: string;
	};
	features: {
		heading: string;
		subheading: string;
		description: string;
		items: FeatureItem[];
	};
	testimonials: {
		eyebrow: string;
		heading: string;
		items: TestimonialEntry[];
	};
	cta: {
		eyebrow: string;
		heading: string;
		body: string;
		appStoreLabel: string;
		playStoreLabel: string;
	};
	footer: {
		brand: string;
		tagline: string;
		platformLinks: PortalLink[];
		legalLinks: PortalLink[];
		copyright: string;
	};
};

export const DEFAULT_PORTAL_CONFIG: PortalConfig = {
	nav: {
		brand: "PH Performance",
		links: [
			{ label: "Features", href: "/features" },
			{ label: "About", href: "/about" },
		],
		loginLabel: "Log In",
		getStartedLabel: "Get Started",
	},
	hero: {
		eyebrow: "The Platform for Elite Athletes",
		title: "Train Smarter.",
		titleAccent: "Recover Faster.",
		subtitle:
			"The professional platform for athletes and coaches who track progress, optimize training, and push beyond limits.",
		stats: [
			{ value: "10K+", label: "Athletes" },
			{ value: "500+", label: "Coaches" },
			{ value: "4.9★", label: "Rating" },
		],
		emailPlaceholder: "Enter your email",
		emailCtaLabel: "Join Free",
		mobileScreenshotUrl: "",
	},
	ceoIntro: {
		eyebrow: "From the CEO",
		title: "Hear It Directly",
		body:
			"Get a personal introduction to the platform and philosophy behind PH Performance — straight from the CEO who built it.",
		name: "Piers Hatcliff",
		role: "CEO · PH Performance",
		watchLabel: "Watch Intro",
		videoUrl: "",
		photoUrl: "",
	},
	features: {
		heading: "What We Offer",
		subheading: "Built for Serious Athletes",
		description: "Professional tools that simplify elite performance management.",
		items: [
			{ title: "Deep Analytics", body: "Track the metrics that matter — from HRV to max power output. Professional-grade dashboards show your progress in high definition." },
			{ title: "Video Coaching", body: "Upload performance video with automated tagging and frame-by-frame review. Structured feedback cycles keep athletes and coaches aligned." },
			{ title: "Team Sync", body: "Coordinate with your squad in real-time. Manage rosters, schedule sessions, and share insights across your entire organization." },
		],
	},
	testimonials: {
		eyebrow: "Trusted by the best",
		heading: "Athletes Who Push Limits",
		items: [],
	},
	cta: {
		eyebrow: "Join 10,000+ Elite Athletes Today",
		heading: "Start Tracking Everything.",
		body: "Join the elite teams and athletes who rely on PH Performance. Download the mobile app to get started.",
		appStoreLabel: "App Store",
		playStoreLabel: "Google Play",
	},
	footer: {
		brand: "PH Performance",
		tagline: "",
		platformLinks: [],
		legalLinks: [],
		copyright: "",
	},
};

let cached: Promise<PortalConfig> | null = null;

export async function fetchPortalConfig(force = false): Promise<PortalConfig> {
	if (cached && !force) return cached;
	cached = (async () => {
		try {
			const baseUrl = config.api.baseUrl.replace(/\/+$/, "");
			const response = await fetch(`${baseUrl}/api/portal-config`, { cache: "no-store" });
			if (!response.ok) return DEFAULT_PORTAL_CONFIG;
			const data = await response.json();
			return (data?.config as PortalConfig) ?? DEFAULT_PORTAL_CONFIG;
		} catch {
			return DEFAULT_PORTAL_CONFIG;
		}
	})();
	return cached;
}
