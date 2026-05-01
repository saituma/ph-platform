import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
    ChartLineUp,
    VideoCamera,
    Users,
    AppWindow,
    Lightning,
    ShieldCheck,
    Globe
} from "@phosphor-icons/react";

export const Route = createFileRoute("/features")({
	head: () => ({
		meta: [
			{ title: "Platform Features — PH Performance" },
			{
				name: "description",
				content:
					"Explore PH Performance's full feature set: deep analytics, video coaching with automated tagging, team sync, programme scheduling, and nutrition logging for athletes and coaches.",
			},
			{ property: "og:title", content: "Platform Features — PH Performance" },
			{
				property: "og:description",
				content:
					"Deep analytics, video coaching, team sync, and programme scheduling. Everything elite athletes and coaches need in one professional platform.",
			},
			{
				property: "og:url",
				content: "https://ph-platform-onboarding.vercel.app/features",
			},
		],
		links: [{ rel: "canonical", href: "https://ph-platform-onboarding.vercel.app/features" }],
	}),
	component: Features,
});

const features = [
	{
		title: "Deep Analytics",
		desc: "Track metrics that matter. From HRV to max power output, see your progress in high definition.",
		icon: ChartLineUp,
	},
	{
		title: "Video Coaching",
		desc: "Upload and analyze performance video with automated tagging and coach feedback cycles.",
		icon: VideoCamera,
	},
	{
		title: "Team Sync",
		desc: "Coordinate schedules, training loads, and availability across your entire roster effortlessly.",
		icon: Users,
	},
	{
		title: "White-Label Portals",
		desc: "Custom-branded dashboards for professional organizations and sports academies.",
		icon: AppWindow,
	},
	{
		title: "Data Security",
		desc: "Enterprise-grade encryption for all athlete data and performance records.",
		icon: ShieldCheck,
	},
	{
		title: "Global Reach",
		desc: "Connect with coaches and scouts worldwide through our integrated talent network.",
		icon: Globe,
	},
];

function Features() {
	return (
		<main className="pt-[calc(var(--topbar-height)+2rem)] pb-20">
			<section className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-7">
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: "easeOut" }}
					className="mb-16"
				>
					<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-200/80 dark:bg-neutral-800/80 mb-4">
						<Lightning weight="fill" className="w-3 h-3 text-neutral-600 dark:text-neutral-100" />
						<span className="text-xs text-neutral-600 dark:text-neutral-100 font-light">Platform Capabilities</span>
					</div>
					<h1 className="text-3xl md:text-4xl xl:text-5xl tracking-tight font-medium text-foreground leading-tight text-balance">
						Professional tools for elite teams
					</h1>
					<p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-lg">
						PH Performance brings together professional tracking, real-time analytics, and coaching tools into one refined ecosystem.
					</p>
				</motion.div>

				{/* Feature grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-foreground/[0.06] divide-y lg:divide-y-0 md:divide-x divide-foreground/[0.06]">
					{features.map((feature, i) => (
						<motion.div
							key={feature.title}
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
							className="group relative overflow-hidden p-8 hover:bg-foreground/[0.02] transition-colors duration-200"
						>
							<div className="text-foreground/50 mb-5">
								<feature.icon size={28} weight="light" />
							</div>
							<h3 className="text-base font-medium text-foreground mb-2 tracking-tight">
								{feature.title}
							</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{feature.desc}
							</p>
							<div className="absolute bottom-0 left-0 right-0 h-px bg-foreground origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
						</motion.div>
					))}
				</div>

				{/* Integration Spotlight */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, ease: "easeOut" }}
					className="mt-24 border border-foreground/[0.06] flex flex-col md:flex-row overflow-hidden"
				>
					<div className="flex-1 p-8 md:p-12 lg:p-16 flex flex-col justify-center">
						<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 mb-3">Integration</p>
						<h2 className="text-2xl md:text-3xl tracking-tight font-medium text-foreground mb-4">
							Wearable data, unified
						</h2>
						<p className="text-sm text-muted-foreground leading-relaxed mb-6">
							Sync data from Garmin, Whoop, Apple Watch, and Oura seamlessly. One source of truth for all your health metrics.
						</p>
						<ul className="grid grid-cols-2 gap-3">
							{["Real-time sync", "Automated insights", "Recovery tracking", "Load management"].map((item) => (
								<li key={item} className="flex items-center gap-2 font-mono text-[10px] text-foreground/50 uppercase tracking-wider">
									<div className="w-1 h-1 rounded-full bg-foreground/30" />
									{item}
								</li>
							))}
						</ul>
					</div>
					<div className="flex-1 border-t md:border-t-0 md:border-l border-foreground/[0.06]">
						<div className="aspect-square flex items-center justify-center overflow-hidden bg-foreground/[0.02]">
							<img src="/ph.jpg" alt="Integration" className="w-full h-full object-cover grayscale-[0.3] opacity-80" />
						</div>
					</div>
				</motion.div>
			</section>
		</main>
	);
}
