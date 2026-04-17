import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
	component: About,
});

function About() {
	return (
		<main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
			<section className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-6 text-center max-w-3xl mx-auto">
					<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
						The PH Platform Mission
					</p>
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-7xl">
						Performance for <span className="text-primary">Everyone.</span>
					</h1>
					<p className="text-xl text-muted-foreground leading-relaxed">
						PH Platform is a world-class performance ecosystem designed to
						empower every individual—from aspiring youth athletes to
						health-conscious adults—with elite-level coaching and data-driven
						training.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-8 md:grid-cols-3">
					<div className="space-y-4 p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
						<div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								fill="currentColor"
								viewBox="0 0 256 256"
								role="img"
								aria-label="Inclusivity icon"
							>
								<title>Inclusivity</title>
								<path d="M244.24,147.24l-32,32a6,6,0,0,1-8.48-8.48l21.75-21.76H134V200h18a6,6,0,0,1,0,12H104a6,6,0,0,1,0-12h18V149H25.51l21.75,21.76a6,6,0,0,1-8.48,8.48l-32-32a6,6,0,0,1,0-8.48l32-32a6,6,0,0,1,8.48,8.48L33.51,137H122V56h-18a6,6,0,0,1,0-12h52a6,6,0,0,1,0,12h-18V137h91.51l-21.75-21.76a6,6,0,0,1,8.48-8.48l32,32A6,6,0,0,1,244.24,147.24Z" />
							</svg>
						</div>
						<h3 className="text-xl font-bold text-foreground">Inclusivity</h3>
						<p className="text-muted-foreground leading-relaxed">
							Whether you are a professional athlete, a weekend warrior, or
							starting your fitness journey as an adult, we have a place for
							you.
						</p>
					</div>
					<div className="space-y-4 p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
						<div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								fill="currentColor"
								viewBox="0 0 256 256"
								role="img"
								aria-label="Elite coaching icon"
							>
								<title>Elite Coaching</title>
								<path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H208V208ZM160,128a32,32,0,1,1-32-32A32,32,0,0,1,160,128Z" />
							</svg>
						</div>
						<h3 className="text-xl font-bold text-foreground">
							Elite Coaching
						</h3>
						<p className="text-muted-foreground leading-relaxed">
							Access the same training methodologies used by top-tier
							professionals. Expert guidance tailored to your specific age and
							goals.
						</p>
					</div>
					<div className="space-y-4 p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
						<div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								fill="currentColor"
								viewBox="0 0 256 256"
								role="img"
								aria-label="Community icon"
							>
								<title>Community</title>
								<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H136v48a8,8,0,0,1-16,0V128a8,8,0,0,1,8-8h56A8,8,0,0,1,192,128Z" />
							</svg>
						</div>
						<h3 className="text-xl font-bold text-foreground">Community</h3>
						<p className="text-muted-foreground leading-relaxed">
							Join a global community of dedicated individuals pushing each
							other to be better every single day.
						</p>
					</div>
				</div>

				<div className="space-y-8 py-12 border-t border-border/40">
					<div className="max-w-3xl">
						<h2 className="text-3xl font-bold text-foreground mb-6">
							Our Story & Vision
						</h2>
						<div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
							<p>
								PH Platform started with a simple observation: high-quality,
								professional performance coaching was often gated behind elite
								sports academies. We set out to change that by building a
								technology platform that brings elite coaching to everyone.
							</p>
							<p>
								Today, we serve a diverse demographic. From 10-year-old football
								athletes learning the basics of agility to 45-year-old adults
								reclaiming their peak physical form, our platform scales with
								you. We believe that performance isn't just about winning
								medals—it's about personal growth and long-term health.
							</p>
							<p>
								Our team consists of veteran sports scientists, professional
								coaches, and tech innovators who share a single vision: making
								the "pro experience" accessible to the everyday person.
							</p>
						</div>
					</div>
				</div>

				<div className="rounded-[2.5rem] bg-card border border-border p-12 text-center space-y-6">
					<h2 className="text-3xl font-bold text-foreground">
						Ready to start?
					</h2>
					<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
						No matter where you are in your journey, there is a PH Program
						waiting to take you to the next level.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
						<button
							type="button"
							className="px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
						>
							Join the Platform
						</button>
						<button
							type="button"
							className="px-8 py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold border border-border transition-transform hover:scale-105 active:scale-95"
						>
							View Programs
						</button>
					</div>
				</div>
			</section>
		</main>
	);
}
