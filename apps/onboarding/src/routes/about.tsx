import {
	ArrowRight,
	Quotes,
	RocketLaunch,
	Star,
	Target,
	UsersThree,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";

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

function About() {
	return (
		<main className="pt-32 pb-24 selection:bg-primary/20 overflow-hidden relative">
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[140%] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10" />

			<section className="max-w-7xl mx-auto px-6 mb-24 relative z-10">
				{/* Hero Section */}
				<div className="text-center space-y-8 max-w-4xl mx-auto mb-40 animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out">
					<p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]">
						Our Vision & Mission
					</p>
					<h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-foreground leading-[0.95] uppercase italic">
						Democratizing{" "}
						<span className="text-primary drop-shadow-[0_0_20px_rgba(var(--primary),0.2)]">
							Performance
						</span>
					</h1>
					<p className="text-xl text-muted-foreground/60 leading-relaxed font-medium max-w-2xl mx-auto uppercase tracking-wide">
						PH Performance was born from a simple idea: professional-grade tools
						shouldn't be gated. We're bringing elite insights to every athlete,
						everywhere.
					</p>
				</div>

				{/* Values Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-48">
					{[
						{
							title: "Inclusivity",
							desc: "Whether you're a youth athlete or a professional, our platform scales to your specific needs.",
							icon: <UsersThree size={28} weight="fill" />,
							color: "bg-primary/10 text-primary shadow-inner",
						},
						{
							title: "Elite Standards",
							desc: "We use training methodologies trusted by pro organizations to ensure world-class results.",
							icon: <Target size={28} weight="fill" />,
							color: "bg-orange-500/10 text-orange-500 shadow-inner",
						},
						{
							title: "Innovation",
							desc: "Leveraging cutting-edge data science to push the boundaries of human potential.",
							icon: <RocketLaunch size={28} weight="fill" />,
							color: "bg-blue-500/10 text-blue-500 shadow-inner",
						},
					].map((value, i) => (
						<div
							key={i}
							className="bg-card dark:bg-card/40 backdrop-blur-3xl border border-border/80 dark:border-white/10 p-10 rounded-[2.5rem] hover:border-primary/40 hover:-translate-y-2 transition-all duration-500 group shadow-2xl"
						>
							<div
								className={`w-14 h-14 ${value.color} rounded-2xl flex items-center justify-center mb-8 border border-border/60 dark:border-white/5`}
							>
								{value.icon}
							</div>
							<h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4 group-hover:text-primary transition-colors">
								{value.title}
							</h3>
							<p className="text-sm text-muted-foreground/60 leading-relaxed font-medium">
								{value.desc}
							</p>
						</div>
					))}
				</div>

				{/* The Story Section - Refined */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center mb-48">
					<div className="space-y-10 order-2 lg:order-1">
						<h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.0] uppercase italic">
							A story of{" "}
							<span className="text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.2)]">
								dedication
							</span>
						</h2>
						<div className="space-y-8 text-muted-foreground/60 text-lg leading-relaxed font-medium">
							<p>
								What started in a local gym has grown into a global community.
								We saw that professional-grade tools were often too complex for
								most teams.
							</p>
							<p>
								PH Performance was built by coaches, for coaches. We simplified
								the complex, unified fragmented data, and created a workspace
								where athletes actually want to spend time.
							</p>
						</div>
						<div className="flex items-center gap-6 p-8 bg-card dark:bg-card/40 backdrop-blur-3xl rounded-[2.5rem] border border-border/80 dark:border-white/10 relative group hover:border-primary/20 transition-all duration-500 shadow-2xl">
							<Quotes
								size={32}
								weight="fill"
								className="text-primary/20 group-hover:text-primary/40 transition-colors"
							/>
							<p className="text-foreground/80 text-base font-black italic tracking-tight uppercase leading-snug">
								"PH Performance isn't just about the numbers; it's about the
								growth that happens between them."
							</p>
						</div>
					</div>
					<div className="order-1 lg:order-2">
						<div className="aspect-[4/5] bg-background rounded-[3rem] overflow-hidden border border-border/80 dark:border-white/10 relative group shadow-2xl animate-float ring-1 ring-white/5">
							<img
								src="/ph.jpg"
								alt="Team"
								className="w-full h-full object-cover grayscale-[0.1] transition-all duration-1000 group-hover:scale-105"
							/>
							<div className="absolute bottom-8 left-8 right-8 bg-background dark:bg-background/40 backdrop-blur-2xl p-6 rounded-2xl border border-border/80 dark:border-white/10 shadow-2xl flex items-center justify-between group-hover:border-primary/30 transition-all duration-500">
								<div>
									<div className="flex items-center gap-1 text-primary mb-1">
										{[1, 2, 3, 4, 5].map((i) => (
											<Star
												key={i}
												weight="fill"
												size={14}
												className="drop-shadow-[0_0_5px_rgba(var(--primary),0.4)]"
											/>
										))}
									</div>
									<p className="text-[10px] font-black tracking-widest uppercase text-foreground/60">
										Trusted by 10k+ Athletes
									</p>
								</div>
								<div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20 animate-pulse">
									<RocketLaunch size={20} weight="fill" />
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Bottom CTA - Refined */}
				<div className="bg-card dark:bg-card/40 backdrop-blur-3xl border border-border/80 dark:border-white/10 rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden group shadow-2xl hover:border-primary/20 transition-all duration-700">
					<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50" />
					<div className="relative z-10 space-y-10">
						<h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-[0.95] uppercase italic">
							Ready to reach <br />
							your{" "}
							<span className="text-primary drop-shadow-[0_0_20px_rgba(var(--primary),0.3)]">
								peak?
							</span>
						</h2>
						<p className="text-xl text-muted-foreground max-w-xl mx-auto font-black uppercase tracking-widest">
							Join the professional community of athletes and coaches using PH
							Performance to stay ahead.
						</p>
						<div className="flex flex-col sm:flex-row gap-6 justify-center pt-6">
							<Link
								to="/"
								className="px-12 py-5 rounded-2xl bg-primary text-primary-foreground font-black italic uppercase tracking-tighter shadow-[0_10px_40px_-10px_rgba(var(--primary),0.5)] hover:shadow-[0_15px_50px_-10px_rgba(var(--primary),0.6)] transition-all hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-3 group/btn"
							>
								GET STARTED NOW{" "}
								<ArrowRight
									weight="bold"
									className="group-hover/btn:translate-x-2 transition-transform w-6 h-6"
								/>
							</Link>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
