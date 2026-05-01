import {
	ArrowRight,
	Quotes,
	RocketLaunch,
	Target,
	UsersThree,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/about")({
	head: () => ({
		meta: [
			{ title: "About PH Performance — Our Mission & Vision" },
			{
				name: "description",
				content:
					"Learn about PH Performance's mission to democratize elite athletic training. We build professional tools for athletes, coaches, and teams of every level.",
			},
			{ property: "og:title", content: "About PH Performance — Our Mission & Vision" },
			{
				property: "og:description",
				content:
					"We're building the professional performance platform that makes elite training accessible to every athlete and team.",
			},
			{
				property: "og:url",
				content: "https://ph-platform-onboarding.vercel.app/about",
			},
		],
		links: [{ rel: "canonical", href: "https://ph-platform-onboarding.vercel.app/about" }],
	}),
	component: About,
});

const values = [
	{
		title: "Inclusivity",
		desc: "Whether you're a youth athlete or a professional, our platform scales to your specific needs.",
		Icon: UsersThree,
	},
	{
		title: "Elite Standards",
		desc: "We use training methodologies trusted by pro organizations to ensure world-class results.",
		Icon: Target,
	},
	{
		title: "Innovation",
		desc: "Leveraging cutting-edge data science to push the boundaries of human potential.",
		Icon: RocketLaunch,
	},
];

function About() {
	return (
		<main className="pt-[calc(var(--topbar-height)+2rem)] pb-24 overflow-hidden relative">
			<section className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-7">
				{/* Hero */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: "easeOut" }}
					className="mb-24 max-w-2xl"
				>
					<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 mb-4">
						Our Vision & Mission
					</p>
					<h1 className="text-3xl md:text-4xl xl:text-5xl tracking-tight font-medium text-foreground leading-tight text-balance mb-4">
						Democratizing performance
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
						PH Performance was born from a simple idea: professional-grade tools
						shouldn't be gated. We're bringing elite insights to every athlete,
						everywhere.
					</p>
				</motion.div>

				{/* Values Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 border border-foreground/[0.06] divide-y md:divide-y-0 md:divide-x divide-foreground/[0.06] mb-24">
					{values.map((value, i) => (
						<motion.div
							key={value.title}
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
							className="group relative overflow-hidden p-8 lg:p-10 hover:bg-foreground/[0.02] transition-colors duration-200"
						>
							<div className="text-foreground/50 mb-5">
								<value.Icon size={28} weight="light" />
							</div>
							<h3 className="text-base font-medium text-foreground mb-2 tracking-tight">
								{value.title}
							</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{value.desc}
							</p>
							<div className="absolute bottom-0 left-0 right-0 h-px bg-foreground origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
						</motion.div>
					))}
				</div>

				{/* The Story */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, ease: "easeOut" }}
					className="grid grid-cols-1 lg:grid-cols-2 border border-foreground/[0.06] mb-24"
				>
					<div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-foreground/[0.06]">
						<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 mb-3">Our Story</p>
						<h2 className="text-2xl md:text-3xl tracking-tight font-medium text-foreground mb-6">
							Built by coaches, for coaches
						</h2>
						<div className="space-y-4 text-sm text-muted-foreground leading-relaxed mb-8">
							<p>
								What started in a local gym has grown into a global community.
								We saw that professional-grade tools were often too complex for
								most teams.
							</p>
							<p>
								We simplified the complex, unified fragmented data, and created a
								workspace where athletes actually want to spend time.
							</p>
						</div>
						<div className="flex items-start gap-3 p-5 border border-foreground/[0.06] bg-foreground/[0.02]">
							<Quotes size={20} weight="bold" className="text-foreground/20 shrink-0 mt-0.5" />
							<p className="text-sm text-foreground/70 leading-relaxed italic">
								"PH Performance isn't just about the numbers; it's about the
								growth that happens between them."
							</p>
						</div>
					</div>
					<div className="aspect-square lg:aspect-auto overflow-hidden bg-foreground/[0.02]">
						<img
							src="/ph.jpg"
							alt="Team"
							className="w-full h-full object-cover grayscale-[0.3] opacity-80 hover:opacity-100 hover:grayscale-0 transition-all duration-700"
						/>
					</div>
				</motion.div>

				{/* Bottom CTA */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, ease: "easeOut" }}
					className="border border-foreground/[0.06] p-8 md:p-16 text-center"
				>
					<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 mb-4">
						Join Us
					</p>
					<h2 className="text-2xl md:text-3xl xl:text-4xl tracking-tight font-medium text-foreground mb-4">
						Ready to reach your peak?
					</h2>
					<p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-8">
						Join the professional community of athletes and coaches using PH
						Performance to stay ahead.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-3">
						<Link
							to="/register"
							className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:opacity-90 transition-colors"
						>
							Get Started
							<ArrowRight weight="bold" className="w-3.5 h-3.5" />
						</Link>
						<Link
							to="/features"
							className="relative inline-flex items-center gap-1.5 px-6 py-2.5 text-foreground/60 text-xs sm:text-sm font-medium transition-colors group"
						>
							<span className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity" style={{
								backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 4px, currentColor 4px, currentColor 5px)",
							}} />
							<span className="absolute top-0 -left-[6px] -right-[6px] h-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
							<span className="absolute bottom-0 -left-[6px] -right-[6px] h-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
							<span className="absolute left-0 -top-[6px] -bottom-[6px] w-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
							<span className="absolute right-0 -top-[6px] -bottom-[6px] w-px bg-foreground/20 group-hover:bg-foreground/30 transition-colors" />
							<span className="relative">View Features</span>
						</Link>
					</div>
				</motion.div>
			</section>
		</main>
	);
}
