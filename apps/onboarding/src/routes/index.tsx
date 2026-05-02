import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
    Users,
    Dumbbell,
    Zap,
    ShieldCheck,
    Phone,
    User,
    Monitor,
    ArrowRight,
    Check,
    Menu,
    X,
} from "lucide-react";
import { useState } from "react";
import { MagneticText } from "@/components/ui/morphing-cursor";
import VaporizeTextCycle, { Tag } from "@/components/ui/vapour-text-effect";
import { CinematicFooter } from "@/components/ui/motion-footer";

const SITE_URL = "https://ph-platform-onboarding.vercel.app";

const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PH Performance",
    url: SITE_URL,
    logo: `${SITE_URL}/ph.jpg`,
    description:
        "Elite training and performance coaching for footballers who want more.",
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

export const Route = createFileRoute("/")({
    head: () => ({
        meta: [
            { title: "PH Performance — Elite Athlete & Team Training Platform" },
            {
                name: "description",
                content:
                    "Elite training and performance coaching for footballers who want more. Build faster, get stronger, stay ahead with PH Performance.",
            },
            {
                property: "og:title",
                content: "PH Performance — Elite Athlete & Team Training Platform",
            },
            {
                property: "og:description",
                content:
                    "Elite training and performance coaching for footballers who want more.",
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
    component: LandingPage,
});

const NAV_LINKS = [
    { label: "Home", href: "/", isRoute: true },
    { label: "About", href: "/about", isRoute: true },
    { label: "Services", href: "/services", isRoute: true },
    { label: "App", href: "/app-download", isRoute: true },
    { label: "Results", href: "/gallery", isRoute: true },
    { label: "Contact", href: "/contact", isRoute: true },
];

const SERVICE_ICONS = [
    { icon: Users, label: "1-1 & Small Group\nCoaching" },
    { icon: Dumbbell, label: "Strength &\nConditioning" },
    { icon: Zap, label: "Speed &\nAcceleration" },
    { icon: ShieldCheck, label: "Injury Prevention\n& Rehab" },
];

const SERVICE_CARDS = [
    {
        icon: User,
        title: "1-1 COACHING",
        description:
            "Fully personalised training programmes built around you and your goals.",
        image: "/landing/coaching-1on1.png",
        cta: "Fill in",
        href: "/enquiry/121",
    },
    {
        icon: Users,
        title: "SMALL GROUP TRAINING",
        description:
            "High quality training in small groups (max 4) to maximise results and individual attention.",
        image: "/landing/small-group.png",
        cta: "Fill in",
        href: "/enquiry/semi-private",
    },
    {
        icon: Users,
        title: "TEAM PROGRAMMES",
        description:
            "Complete performance solutions for teams and academies with tracking and reporting.",
        image: "/landing/team.png",
        cta: "Fill in",
        href: "/enquiry/team",
    },
    {
        icon: Monitor,
        title: "PH PERFORMANCE APP",
        description:
            "Train smarter. Track progress. Nutrition guidance. GPS running. All in one place.",
        image: "/landing/app-preview.png",
        cta: "Fill in",
        href: "/register",
    },
];

const APP_FEATURES_LEFT = [
    "Training Programmes",
    "Nutrition Tracking",
    "GPS Performance Tracking",
];

const APP_FEATURES_RIGHT = [
    "Session Booking",
    "Progress Analytics",
    "Education Hub",
];

function LandingPage() {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="relative min-h-dvh bg-[#0a0a0a] text-white overflow-x-hidden landing-page">
            {/* ━━━ Navigation ━━━ */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm">
                <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 shrink-0">
                        <img
                            src="/logo.png"
                            alt="PH Performance"
                            className="w-20 h-20 rounded object-cover"
                        />
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hidden lg:flex items-center">
                        {NAV_LINKS.map((link) => {
                            const cls = `relative px-[18px] py-2 text-[12px] font-medium tracking-[0.16em] uppercase transition-colors ${link.label === "Home"
                                    ? "text-[#8aff00]"
                                    : "text-white/50 hover:text-white"
                                }`;
                            const underline = link.label === "Home" && (
                                <span className="absolute bottom-0 left-[18px] right-[18px] h-[2px] bg-[#8aff00]" />
                            );
                            if (link.isRoute) {
                                return (
                                    <Link key={link.label} to={link.href} className={cls}>
                                        {link.label}
                                        {underline}
                                    </Link>
                                );
                            }
                            return (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        document
                                            .querySelector(link.href)
                                            ?.scrollIntoView({ behavior: "smooth" });
                                    }}
                                    className={cls}
                                >
                                    {link.label}
                                    {underline}
                                </a>
                            );
                        })}
                    </div>

                    {/* Desktop CTA button */}
                    <div className="hidden lg:flex">
                        <button
                            type="button"
                            onClick={() => navigate({ to: "/register" })}
                            className="border border-[#8aff00] rounded-[4px] px-5 py-2.5 hover:bg-[#8aff00]/5 transition-all flex items-center gap-3"
                        >
                            <span className="w-[7px] h-[7px] rounded-full bg-[#8aff00] shrink-0" />
                            <div className="text-left">
                                <span className="block text-[11px] font-bold tracking-[0.08em] uppercase leading-tight text-[#8aff00]">
                                    SIGN UP TO APP NOW
                                </span>
                                <span className="block text-[9px] font-normal text-white/40 tracking-wide mt-[2px]">
                                    Start your journey today
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden text-white p-2"
                    >
                        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden bg-[#0a0a0a] border-t border-white/5 px-5 pb-4">
                        {NAV_LINKS.map((link) => {
                            if (link.isRoute) {
                                return (
                                    <Link
                                        key={link.label}
                                        to={link.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-white/50 hover:text-white border-b border-white/5"
                                    >
                                        {link.label}
                                    </Link>
                                );
                            }
                            return (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setMobileMenuOpen(false);
                                        document
                                            .querySelector(link.href)
                                            ?.scrollIntoView({ behavior: "smooth" });
                                    }}
                                    className="block py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-white/50 hover:text-white border-b border-white/5"
                                >
                                    {link.label}
                                </a>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => {
                                setMobileMenuOpen(false);
                                navigate({ to: "/register" });
                            }}
                            className="w-full mt-3 border border-[#8aff00] text-[#8aff00] rounded-[4px] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em]"
                        >
                            SIGN UP TO APP NOW
                        </button>
                    </div>
                )}
            </nav>

            <main>
                {/* ━━━ Hero Section ━━━ */}
                <section className="relative pt-16 h-dvh overflow-hidden">
                    {/* Background */}
                    <div className="absolute inset-0">
                        <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: "url('/landing/hero-bg.jpg')" }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/30" />
                    </div>

                    <div
                        className="relative z-10 flex flex-col"
                        style={{ height: "calc(100dvh - 64px)" }}
                    >
                        {/* Hero body */}
                        <div className="flex-1 flex items-center">
                            <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 w-full">
                                <div className="flex items-center">
                                    {/* Left: Text content */}
                                    <div className="w-full lg:w-[46%] relative z-20">
                                        <motion.p
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4 }}
                                            className="text-[#8aff00] text-[11px] font-semibold uppercase tracking-[0.3em] mb-6"
                                        >
                                            PH Performance
                                        </motion.p>

                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, delay: 0.1 }}
                                            className="hidden lg:flex flex-col items-start"
                                        >
                                            <MagneticText
                                                text="BUILD FASTER."
                                                hoverText="TRAIN HARDER."
                                            />
                                            <MagneticText
                                                text="GET STRONGER."
                                                hoverText="PUSH FURTHER."
                                                accentColor
                                            />
                                            <MagneticText text="STAY AHEAD." hoverText="WIN MORE." />
                                        </motion.div>
                                        <motion.h1
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, delay: 0.1 }}
                                            className="landing-hero-heading lg:hidden"
                                        >
                                            <span className="block text-white">BUILD FASTER.</span>
                                            <span className="block text-[#8aff00] landing-hero-accent">
                                                GET STRONGER.
                                            </span>
                                            <span className="block text-white">STAY AHEAD.</span>
                                        </motion.h1>

                                        <motion.p
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: 0.3 }}
                                            className="text-white/40 text-[14px] mt-6 max-w-[320px] leading-[1.7]"
                                        >
                                            Elite training and performance coaching
                                            <br />
                                            for footballers who want more.
                                        </motion.p>

                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: 0.4 }}
                                            className="flex flex-wrap items-center gap-4 mt-8"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => navigate({ to: "/register" })}
                                                className="inline-flex items-center gap-2.5 px-7 py-[13px] bg-[#8aff00] text-black text-[11px] font-bold uppercase tracking-[0.14em] hover:bg-[#9fff33] transition-colors"
                                            >
                                                <Phone size={14} strokeWidth={2.5} />
                                                SIGN UP TO APP
                                            </button>
                                            <a
                                                href="#services"
                                                className="inline-flex items-center gap-2 px-7 py-[13px] border border-white/30 text-white text-[11px] font-bold uppercase tracking-[0.14em] hover:border-white/50 hover:bg-white/5 transition-all"
                                            >
                                                LEARN MORE
                                            </a>
                                        </motion.div>
                                    </div>

                                    {/* Right: Athlete image + PH watermark */}
                                    <div className="hidden lg:flex w-[54%] items-end justify-end relative self-stretch">
                                        <img
                                            src="hero.png"
                                            alt="Elite athlete training"
                                            className="h-[92vh] max-h-[820px] w-auto object-contain relative z-10 drop-shadow-2xl"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Service icons strip */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            className="border-t border-white/[0.08] bg-[#0a0a0a]/70 backdrop-blur-sm"
                        >
                            <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10">
                                <div className="grid grid-cols-2 sm:grid-cols-4">
                                    {SERVICE_ICONS.map((svc, i) => (
                                        <div
                                            key={svc.label}
                                            className={`flex flex-col items-center gap-3 py-6 text-center ${i < SERVICE_ICONS.length - 1
                                                    ? "border-r border-white/[0.08]"
                                                    : ""
                                                }`}
                                        >
                                            <svc.icon
                                                size={32}
                                                className="text-white/30"
                                                strokeWidth={1.1}
                                            />
                                            <span className="text-[10px] uppercase tracking-[0.14em] text-white/30 font-medium whitespace-pre-line leading-snug">
                                                {svc.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* ━━━ Services Cards ━━━ */}
                <section id="services" className="bg-[#0a0a0a] py-8">
                    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {SERVICE_CARDS.map((card, i) => (
                                <motion.div
                                    key={card.title}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: i * 0.1 }}
                                    className="group relative bg-[#111] overflow-hidden"
                                >
                                    {/* Card image with icon overlay */}
                                    <div
                                        className="relative overflow-hidden bg-[#181818]"
                                        style={{ aspectRatio: "3/4" }}
                                    >
                                        <img
                                            src={card.image}
                                            alt={card.title}
                                            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#111] to-transparent" />
                                        <div className="absolute bottom-3 left-4 z-10">
                                            <card.icon
                                                size={20}
                                                className="text-[#8aff00]/60"
                                                strokeWidth={1.5}
                                            />
                                        </div>
                                    </div>

                                    {/* Card content */}
                                    <div className="px-5 pt-4 pb-5">
                                        <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-white mb-1.5">
                                            {card.title}
                                        </h3>
                                        <p className="text-[11px] text-white/[0.28] leading-[1.6] mb-3">
                                            {card.description}
                                        </p>
                                        <Link
                                            to={card.href}
                                            className="inline-flex items-center gap-1.5 text-[#8aff00] text-[10px] font-bold uppercase tracking-[0.1em] group-hover:gap-2.5 transition-all"
                                        >
                                            {card.cta}
                                            <ArrowRight size={11} />
                                        </Link>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ━━━ App Promotion Section ━━━ */}
                <section
                    id="app"
                    className="bg-[#0d0d0d] border-t border-white/5 py-8 overflow-visible"
                >
                    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10">
                        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-0">
                            {/* Left: Phone mockups */}
                            <div className="w-full lg:w-[36%] relative overflow-visible">
                                <div className="flex items-center justify-center lg:justify-start">
                                    <div
                                        className="relative ml-4 flex items-end"
                                        style={{ height: 260 }}
                                    >
                                        {/* PH Logo bottom-left */}
                                        <div className="absolute left-0 -bottom-2 z-[4] flex items-center gap-1.5 pointer-events-none">
                                            <img
                                                src="/ph-logo.png"
                                                alt=""
                                                className="w-[30px] h-[30px] rounded object-contain opacity-40"
                                            />
                                            <span className="text-white/20 text-[8px] uppercase tracking-[0.2em] font-semibold">
                                                Performance
                                            </span>
                                        </div>
                                        {/* Phone 1 — left tilted */}
                                        <div
                                            className="absolute left-[20px] bottom-0 w-[110px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 z-[1]"
                                            style={{
                                                transform: "rotate(-8deg)",
                                                transformOrigin: "bottom center",
                                            }}
                                        >
                                            <img
                                                src="/home.png"
                                                alt="PH Performance App"
                                                loading="lazy"
                                                className="w-full h-auto"
                                            />
                                        </div>
                                        {/* Phone 2 — center front */}
                                        <div className="absolute left-[95px] bottom-0 w-[125px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 z-[3]">
                                            <img
                                                src="/home.png"
                                                alt="PH Performance App"
                                                loading="lazy"
                                                className="w-full h-auto"
                                            />
                                        </div>
                                        {/* Phone 3 — right tilted */}
                                        <div
                                            className="absolute left-[188px] bottom-0 w-[110px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 z-[2]"
                                            style={{
                                                transform: "rotate(6deg)",
                                                transformOrigin: "bottom center",
                                            }}
                                        >
                                            <img
                                                src="/home.png"
                                                alt="PH Performance App"
                                                loading="lazy"
                                                className="w-full h-auto"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Center: Title + Store badges */}
                            <div className="w-full lg:w-[32%] text-center lg:text-left lg:pl-4">
                                <p className="text-white/25 text-[9px] uppercase tracking-[0.3em] font-semibold mb-2">
                                    PH Performance App
                                </p>
                                <div className="mb-5 h-[60px] sm:h-[70px]">
                                    <VaporizeTextCycle
                                        texts={["TRAIN ANYWHERE.", "ANYTIME.", "YOUR WAY."]}
                                        font={{
                                            fontFamily: "Inter, sans-serif",
                                            fontSize: "42px",
                                            fontWeight: 900,
                                        }}
                                        color="rgb(255, 255, 255)"
                                        spread={5}
                                        density={5}
                                        animation={{
                                            vaporizeDuration: 2,
                                            fadeInDuration: 1,
                                            waitDuration: 0.5,
                                        }}
                                        direction="left-to-right"
                                        alignment="left"
                                        tag={Tag.H2}
                                    />
                                </div>
                                <div className="flex items-center justify-center lg:justify-start gap-3">
                                    <a
                                        href="#"
                                        className="inline-block"
                                        aria-label="Download on the App Store"
                                    >
                                        <img
                                            src="/apple-app-store.svg"
                                            alt="Download on the App Store"
                                            loading="lazy"
                                            className="h-[38px]"
                                        />
                                    </a>
                                    <a
                                        href="#"
                                        className="inline-block"
                                        aria-label="Get it on Google Play"
                                    >
                                        <img
                                            src="/google-play.svg"
                                            alt="Get it on Google Play"
                                            loading="lazy"
                                            className="h-[56px]"
                                        />
                                    </a>
                                </div>
                            </div>

                            {/* Right: Feature checklist */}
                            <div className="w-full lg:w-[32%] lg:pl-4">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                                    <div className="flex flex-col gap-3.5">
                                        {APP_FEATURES_LEFT.map((feature) => (
                                            <div key={feature} className="flex items-center gap-2">
                                                <Check
                                                    size={15}
                                                    className="text-[#8aff00] shrink-0"
                                                    strokeWidth={3}
                                                />
                                                <span className="text-[11px] text-white/50 leading-tight">
                                                    {feature}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-col gap-3.5">
                                        {APP_FEATURES_RIGHT.map((feature) => (
                                            <div key={feature} className="flex items-center gap-2">
                                                <Check
                                                    size={15}
                                                    className="text-[#8aff00] shrink-0"
                                                    strokeWidth={3}
                                                />
                                                <span className="text-[11px] text-white/50 leading-tight">
                                                    {feature}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ━━━ Cinematic Footer ━━━ */}
                <CinematicFooter />
            </main>
        </div>
    );
}
