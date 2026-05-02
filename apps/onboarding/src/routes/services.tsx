import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Users, User, Monitor, Dumbbell, Zap, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/services")({
	head: () => ({
		meta: [
			{ title: "Services — PH Performance" },
			{
				name: "description",
				content:
					"Explore PH Performance's training services: 1-1 coaching, small group training, team programmes, and the PH Performance app.",
			},
			{ property: "og:title", content: "Services — PH Performance" },
			{
				property: "og:description",
				content:
					"From personalised 1-1 coaching to full team performance solutions. See what PH Performance offers.",
			},
		],
	}),
	component: ServicesPage,
});

const SERVICES = [
	{
		icon: User,
		title: "1-1 Coaching",
		description:
			"Fully personalised training programmes built around you and your goals. Your coach designs every session, tracks your progress, and adjusts the plan in real time.",
		features: ["Bespoke programme design", "Weekly video analysis", "Nutrition guidance", "Direct coach messaging"],
		image: "/landing/coaching-1on1.jpg",
	},
	{
		icon: Users,
		title: "Small Group Training",
		description:
			"High quality training in small groups (max 4) to maximise results and individual attention. Competitive environment with personalised feedback.",
		features: ["Groups of 2–4 athletes", "Position-specific drills", "Performance benchmarking", "Flexible scheduling"],
		image: "/landing/small-group.jpg",
	},
	{
		icon: Users,
		title: "Team Programmes",
		description:
			"Complete performance solutions for teams and academies with tracking, reporting, and periodised programming for the full squad.",
		features: ["Squad management dashboard", "GPS & load monitoring", "Injury prevention protocols", "Season periodisation"],
		image: "/landing/team.jpg",
	},
	{
		icon: Monitor,
		title: "PH Performance App",
		description:
			"Train smarter with the PH Performance app. Track programmes, log nutrition, monitor GPS running data, book sessions, and review progress — all in one place.",
		features: ["Training programmes", "GPS performance tracking", "Nutrition logging", "Session booking"],
		image: "/landing/app-preview.jpg",
	},
];

const DISCIPLINES = [
	{ icon: Dumbbell, label: "Strength & Conditioning" },
	{ icon: Zap, label: "Speed & Acceleration" },
	{ icon: ShieldCheck, label: "Injury Prevention & Rehab" },
	{ icon: User, label: "1-1 & Small Group Coaching" },
];

function ServicesPage() {
	return (
		<main className="min-h-dvh bg-background text-foreground">
			{/* Hero */}
			<section className="pt-8 pb-16 max-w-6xl mx-auto px-5 sm:px-8 lg:px-10">
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="max-w-2xl"
				>
					<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary mb-4">
						Our Services
					</p>
					<h1 className="landing-section-heading text-foreground mb-4">
						Everything you need to{" "}
						<span className="text-primary">perform</span>
					</h1>
					<p className="text-[14px] text-muted-foreground leading-[1.7] max-w-lg">
						From personalised coaching to full team solutions, we provide
						professional-grade training services for athletes at every level.
					</p>
				</motion.div>
			</section>

			{/* Discipline strip */}
			<section className="border-y border-border bg-card/50">
				<div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10">
					<div className="grid grid-cols-2 sm:grid-cols-4">
						{DISCIPLINES.map((d, i) => (
							<div
								key={d.label}
								className={`flex flex-col items-center gap-3 py-6 text-center ${
									i < DISCIPLINES.length - 1 ? "border-r border-border" : ""
								}`}
							>
								<d.icon size={28} className="text-muted-foreground" strokeWidth={1.2} />
								<span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium whitespace-pre-line leading-snug">
									{d.label}
								</span>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Service cards */}
			<section className="py-16 max-w-6xl mx-auto px-5 sm:px-8 lg:px-10">
				<div className="space-y-12">
					{SERVICES.map((service, i) => (
						<motion.div
							key={service.title}
							initial={{ opacity: 0, y: 24 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: i * 0.1 }}
							className={`grid grid-cols-1 lg:grid-cols-2 gap-0 border border-border overflow-hidden ${
								i % 2 === 1 ? "lg:direction-rtl" : ""
							}`}
						>
							{/* Image */}
							<div
								className={`relative overflow-hidden bg-card ${
									i % 2 === 1 ? "lg:order-2" : ""
								}`}
								style={{ aspectRatio: "16/10" }}
							>
								<img
									src={service.image}
									alt={service.title}
									className="w-full h-full object-cover opacity-70 hover:opacity-90 hover:scale-105 transition-all duration-500"
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = "none";
									}}
								/>
								<div className="absolute bottom-4 left-5">
									<service.icon size={22} className="text-primary/60" strokeWidth={1.5} />
								</div>
							</div>

							{/* Content */}
							<div
								className={`p-8 lg:p-10 flex flex-col justify-center ${
									i % 2 === 1 ? "lg:order-1 lg:direction-ltr" : ""
								}`}
							>
								<h2 className="text-[15px] font-bold uppercase tracking-[0.08em] text-foreground mb-3">
									{service.title}
								</h2>
								<p className="text-[13px] text-muted-foreground leading-[1.7] mb-5">
									{service.description}
								</p>
								<ul className="space-y-2 mb-6">
									{service.features.map((f) => (
										<li
											key={f}
											className="flex items-center gap-2 text-[12px] text-foreground/60"
										>
											<span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
											{f}
										</li>
									))}
								</ul>
								<Link
									to="/register"
									className="inline-flex items-center gap-1.5 text-primary text-[11px] font-bold uppercase tracking-[0.1em] hover:gap-2.5 transition-all"
								>
									GET STARTED
									<ArrowRight size={12} />
								</Link>
							</div>
						</motion.div>
					))}
				</div>
			</section>

			{/* Bottom CTA */}
			<section className="border-t border-border py-16">
				<div className="max-w-2xl mx-auto px-5 text-center">
					<h2 className="landing-section-heading text-foreground mb-4">
						Ready to <span className="text-primary">start</span>?
					</h2>
					<p className="text-[14px] text-muted-foreground leading-[1.7] mb-8">
						Whether you're an individual athlete or a full squad, we have a programme for you.
					</p>
					<Link
						to="/register"
						className="inline-flex items-center gap-2.5 px-7 py-[13px] bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-[0.14em] hover:opacity-90 transition-opacity"
					>
						SIGN UP NOW
						<ArrowRight size={12} />
					</Link>
				</div>
			</section>
		</main>
	);
}
