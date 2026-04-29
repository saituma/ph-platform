import { eq } from "drizzle-orm";
import { db } from "../../db";
import { portalConfigTable } from "../../db/schema";

export const defaultPortalConfig = {
  nav: {
    brand: "PH Performance",
    links: [
      { label: "Features", href: "#features" },
      { label: "About", href: "#about" },
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
      {
        title: "Deep Analytics",
        body: "Track the metrics that matter — from HRV to max power output. Professional-grade dashboards show your progress in high definition.",
      },
      {
        title: "Video Coaching",
        body: "Upload performance video with automated tagging and frame-by-frame review. Structured feedback cycles keep athletes and coaches aligned.",
      },
      {
        title: "Team Sync",
        body: "Coordinate with your squad in real-time. Manage rosters, schedule sessions, and share insights across your entire organization.",
      },
    ],
  },
  testimonials: {
    eyebrow: "Trusted by the best",
    heading: "Athletes Who Push Limits",
    items: [
      {
        quote:
          "PH Performance has completely revolutionized how we track athlete progress. The video analysis tools are the best in the industry.",
        name: "Marcus Thorne",
        role: "Head Coach · Elite Track Club",
      },
      {
        quote:
          "The data-driven insights allowed me to push past my plateaus and set new personal records this season.",
        name: "Elena Rodriguez",
        role: "Pro Athlete · Global Cycling",
      },
      {
        quote:
          "My coaches were up and running in minutes. The team sync features are a genuine game-changer for our organization.",
        name: "David Chen",
        role: "Performance Director · Titan Athletics",
      },
    ],
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
    tagline:
      "Empowering elite athletes and teams with professional tracking, performance analytics, and specialized coaching tools.",
    platformLinks: [
      { label: "Features", href: "#features" },
      { label: "About Us", href: "#about" },
    ],
    legalLinks: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
    copyright: "© 2026 PH Performance. All rights reserved.",
  },
};

export type PortalConfig = typeof defaultPortalConfig;

function mergeSection<T extends Record<string, any>>(stored: unknown, defaults: T): T {
  if (!stored || typeof stored !== "object") return defaults;
  return { ...defaults, ...(stored as Record<string, any>) } as T;
}

export async function getPortalConfig(): Promise<PortalConfig> {
  const rows = await db.select().from(portalConfigTable).limit(1);
  const row = rows[0];
  if (!row) return defaultPortalConfig;
  return {
    nav: mergeSection(row.nav, defaultPortalConfig.nav),
    hero: mergeSection(row.hero, defaultPortalConfig.hero),
    ceoIntro: mergeSection(row.ceoIntro, defaultPortalConfig.ceoIntro),
    features: mergeSection(row.features, defaultPortalConfig.features),
    testimonials: mergeSection(row.testimonials, defaultPortalConfig.testimonials),
    cta: mergeSection(row.cta, defaultPortalConfig.cta),
    footer: mergeSection(row.footer, defaultPortalConfig.footer),
  };
}

export async function updatePortalConfig(userId: number, input: Partial<PortalConfig>): Promise<PortalConfig> {
  const current = await getPortalConfig();
  const merged: PortalConfig = {
    nav: input.nav ?? current.nav,
    hero: input.hero ?? current.hero,
    ceoIntro: input.ceoIntro ?? current.ceoIntro,
    features: input.features ?? current.features,
    testimonials: input.testimonials ?? current.testimonials,
    cta: input.cta ?? current.cta,
    footer: input.footer ?? current.footer,
  };

  const existing = await db.select().from(portalConfigTable).limit(1);
  if (existing[0]) {
    await db
      .update(portalConfigTable)
      .set({
        nav: merged.nav,
        hero: merged.hero,
        ceoIntro: merged.ceoIntro,
        features: merged.features,
        testimonials: merged.testimonials,
        cta: merged.cta,
        footer: merged.footer,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(portalConfigTable.id, existing[0].id));
  } else {
    await db.insert(portalConfigTable).values({
      nav: merged.nav,
      hero: merged.hero,
      ceoIntro: merged.ceoIntro,
      features: merged.features,
      testimonials: merged.testimonials,
      cta: merged.cta,
      footer: merged.footer,
      updatedBy: userId,
    });
  }
  return merged;
}
