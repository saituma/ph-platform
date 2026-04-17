import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/education-faq")({
	component: EducationFAQ,
});

function FAQItem({ question, answer }: { question: string; answer: string }) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="border-b border-border/40 py-6 last:border-0">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex w-full items-center justify-between text-left group"
			>
				<span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
					{question}
				</span>
				<div
					className={`shrink-0 ml-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
				>
					{isOpen ? (
						<MinusIcon size={20} className="text-primary" />
					) : (
						<PlusIcon size={20} className="text-muted-foreground" />
					)}
				</div>
			</button>
			<div
				className={`mt-4 overflow-hidden transition-all duration-300 ease-in-out ${
					isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
				}`}
			>
				<p className="text-muted-foreground leading-relaxed text-base">
					{answer}
				</p>
			</div>
		</div>
	);
}

function EducationFAQ() {
	return (
		<main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
			<section className="space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-6 text-center max-w-3xl mx-auto">
					<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
						Support & Learning
					</p>
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-7xl">
						Education & <span className="text-primary">FAQ</span>
					</h1>
					<p className="text-xl text-muted-foreground leading-relaxed">
						Explore our comprehensive guide to the PH Platform ecosystem.
						Whether you're a youth athlete, a parent, or an adult professional,
						we have the answers to help you get started.
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
					<div className="lg:col-span-2 space-y-8">
						<div className="space-y-2">
							<h2 className="text-2xl font-bold text-foreground mb-6">
								General Questions
							</h2>
							<FAQItem
								question="Who is the PH Platform for?"
								answer="PH Platform is designed for everyone committed to performance improvement. While we have deep roots in youth football development, our platform has evolved to support adult fitness, professional sports preparation, and general athletic longevity for all age groups."
							/>
							<FAQItem
								question="Do I need any special equipment to start?"
								answer="Many of our foundation programs (PHP and PHP Plus) are designed to be performed with minimal equipment—often just some space, a ball, or light weights. As you progress into Premium and Pro tiers, our coaches will guide you on specific equipment that may benefit your specific goals."
							/>
							<FAQItem
								question="How do the different membership tiers work?"
								answer="We offer four primary tiers: PHP (Base), PHP Plus, PHP Premium, and PHP Pro. The base tier provides structured training, while higher tiers add features like group bookings, 1-on-1 messaging, and personalized video feedback from our elite coaching staff."
							/>
						</div>

						<div className="space-y-2 pt-8">
							<h2 className="text-2xl font-bold text-foreground mb-6">
								Adult & Professional Training
							</h2>
							<FAQItem
								question="I'm an adult looking to get fit. Is this too intense for me?"
								answer="Not at all. Our adult programs are built on the same 'Elite Performance' philosophy but are scaled specifically for adult physiological needs, recovery capacity, and lifestyle constraints. We focus on mobility, functional strength, and cardiovascular health."
							/>
							<FAQItem
								question="Can I use this for professional sports preparation?"
								answer="Yes. Our PHP Pro and Premium tiers are frequently used by athletes preparing for trials, college recruitment, or professional seasons. The personalized nature of these tiers allows us to tailor the volume and intensity to your specific competition calendar."
							/>
						</div>

						<div className="space-y-2 pt-8">
							<h2 className="text-2xl font-bold text-foreground mb-6">
								Parent & Youth Support
							</h2>
							<FAQItem
								question="How involved should parents be in the youth programs?"
								answer="We encourage parents to use the 'Education' section of our platform, which provides guides on youth nutrition, psychology, and recovery. While athletes do the work, parent support is a critical component of the youth performance ecosystem."
							/>
							<FAQItem
								question="Is the training safe for young children?"
								answer="Athlete safety is our number one priority. All youth movements are vetted by sports scientists to be age-appropriate, focusing on proper mechanics and body control before adding intensity or weight."
							/>
						</div>
					</div>

					<div className="space-y-8">
						<div className="p-8 rounded-[2rem] bg-card border border-border shadow-sm space-y-6">
							<h3 className="text-xl font-bold text-foreground">
								Resource Center
							</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">
								Access our library of whitepapers, nutrition guides, and
								technical breakdowns.
							</p>
							<div className="space-y-3">
								<button
									type="button"
									className="w-full text-left p-4 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all group"
								>
									<p className="text-sm font-bold text-foreground group-hover:text-primary">
										Nutrition Guide 2026
									</p>
									<p className="text-xs text-muted-foreground">PDF • 12MB</p>
								</button>
								<button
									type="button"
									className="w-full text-left p-4 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all group"
								>
									<p className="text-sm font-bold text-foreground group-hover:text-primary">
										Recovery Protocols
									</p>
									<p className="text-xs text-muted-foreground">Video • 45m</p>
								</button>
							</div>
						</div>

						<div className="p-8 rounded-[2rem] bg-primary text-primary-foreground shadow-lg shadow-primary/20 space-y-6">
							<h3 className="text-xl font-bold">Need Direct Help?</h3>
							<p className="text-sm text-primary-foreground/90 leading-relaxed">
								Our coaching support team is available for technical questions
								or membership inquiries.
							</p>
							<button
								type="button"
								className="w-full py-3 rounded-xl bg-background text-foreground font-bold text-sm transition-transform hover:scale-105 active:scale-95"
							>
								Contact Support
							</button>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
