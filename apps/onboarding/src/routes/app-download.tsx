import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Smartphone, Activity, Utensils, MapPin, CalendarCheck, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/app-download")({
	head: () => ({
		meta: [
			{ title: "PH Performance App — Download & Features" },
			{
				name: "description",
				content:
					"Download the PH Performance app. Training programmes, nutrition tracking, GPS performance, session booking, and analytics — all in one place.",
			},
			{ property: "og:title", content: "PH Performance App — Download & Features" },
			{
				property: "og:description",
				content:
					"Train smarter with the PH Performance app. Track everything, book sessions, and stay connected to your coach.",
			},
		],
	}),
	component: AppDownloadPage,
});

const APP_FEATURES = [
	{
		icon: Activity,
		title: "Training Programmes",
		description: "Follow your personalised programme designed by your coach. Every session tracked, every rep counted.",
	},
	{
		icon: Utensils,
		title: "Nutrition Tracking",
		description: "Log meals, track macros, and follow nutrition plans tailored to your training goals.",
	},
	{
		icon: MapPin,
		title: "GPS Performance",
		description: "Track your runs with GPS. Distance, pace, sprint speed, and heat maps — all captured automatically.",
	},
	{
		icon: CalendarCheck,
		title: "Session Booking",
		description: "Book 1-1, small group, and team sessions directly from the app. Manage your training schedule effortlessly.",
	},
	{
		icon: BarChart3,
		title: "Progress Analytics",
		description: "Visualise your progress over time. Strength gains, speed improvements, and performance trends at a glance.",
	},
	{
		icon: Smartphone,
		title: "Coach Messaging",
		description: "Message your coach directly, receive video feedback, and stay connected between sessions.",
	},
];

function AppDownloadPage() {
	return (
		<main className="min-h-dvh bg-background text-foreground">
			{/* Hero */}
			<section className="pt-8 pb-16 max-w-6xl mx-auto px-5 sm:px-8 lg:px-10">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
					<motion.div
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary mb-4">
							The App
						</p>
						<h1 className="landing-section-heading text-foreground mb-4">
							Your training,{" "}
							<span className="text-primary">in your pocket</span>
						</h1>
						<p className="text-[14px] text-muted-foreground leading-[1.7] max-w-md mb-8">
							The PH Performance app brings everything together — programmes,
							nutrition, GPS tracking, bookings, and direct coach access.
							Available on iOS and Android.
						</p>
						<div className="flex flex-wrap items-center gap-4">
							<a
								href="https://apps.apple.com"
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-2.5 px-7 py-[13px] bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-[0.14em] hover:opacity-90 transition-opacity"
							>
								<Smartphone size={14} strokeWidth={2.5} />
								APP STORE
							</a>
							<a
								href="https://play.google.com"
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-2 px-7 py-[13px] border border-border text-foreground text-[11px] font-bold uppercase tracking-[0.14em] hover:border-foreground/30 hover:bg-foreground/5 transition-all"
							>
								GOOGLE PLAY
							</a>
						</div>
					</motion.div>

					{/* Phone mockup area */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="relative flex items-end justify-center"
						style={{ height: 320 }}
					>
						<div className="relative flex items-end justify-center gap-3" style={{ overflow: "visible" }}>
							<div
								className="w-[120px] h-[240px] bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
								style={{ transform: "rotate(-8deg)", transformOrigin: "bottom center" }}
							>
								<img
									src="/landing/app-preview.jpg"
									alt="App screen 1"
									className="w-full h-full object-cover"
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = "none";
									}}
								/>
							</div>
							<div
								className="w-[140px] h-[280px] bg-card border border-border rounded-2xl overflow-hidden shadow-2xl relative z-10"
								style={{ transform: "translateY(-20px)" }}
							>
								<img
									src="/landing/app-preview.jpg"
									alt="App screen 2"
									className="w-full h-full object-cover"
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = "none";
									}}
								/>
							</div>
							<div
								className="w-[120px] h-[240px] bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
								style={{ transform: "rotate(6deg)", transformOrigin: "bottom center" }}
							>
								<img
									src="/landing/app-preview.jpg"
									alt="App screen 3"
									className="w-full h-full object-cover"
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = "none";
									}}
								/>
							</div>
						</div>
					</motion.div>
				</div>
			</section>

			{/* Features grid */}
			<section className="border-y border-border py-16">
				<div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10">
					<motion.p
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary mb-8 text-center"
					>
						App Features
					</motion.p>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
						{APP_FEATURES.map((feature, i) => (
							<motion.div
								key={feature.title}
								initial={{ opacity: 0, y: 16 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.4, delay: i * 0.08 }}
								className="bg-background p-8 hover:bg-card/50 transition-colors"
							>
								<feature.icon size={24} className="text-primary/60 mb-4" strokeWidth={1.5} />
								<h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-foreground mb-2">
									{feature.title}
								</h3>
								<p className="text-[12px] text-muted-foreground leading-[1.7]">
									{feature.description}
								</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Bottom CTA */}
			<section className="py-16">
				<div className="max-w-2xl mx-auto px-5 text-center">
					<h2 className="landing-section-heading text-foreground mb-4">
						Start training <span className="text-primary">smarter</span>
					</h2>
					<p className="text-[14px] text-muted-foreground leading-[1.7] mb-8">
						Download the app and connect with your coach today. Your first session is just a tap away.
					</p>
					<Link
						to="/register"
						className="inline-flex items-center gap-2.5 px-7 py-[13px] bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-[0.14em] hover:opacity-90 transition-opacity"
					>
						GET STARTED
						<ArrowRight size={12} />
					</Link>
				</div>
			</section>
		</main>
	);
}
