import { Star } from "@phosphor-icons/react";

export type TestimonialItem = {
	name: string;
	role: string;
	company: string;
	rating: number;
	content: string;
};

type TestimonialsComponentProps = {
	testimonials: TestimonialItem[];
};

const TestimonialsComponent = ({
	testimonials,
}: TestimonialsComponentProps) => {
	return (
		<section className="py-24 sm:py-32 overflow-hidden border-t border-border/40">
			<div className="mx-auto max-w-6xl px-6 mb-16">
				<p
					className="text-primary font-black mb-4"
					style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase" }}
				>
					Trusted by the best
				</p>
				<h2
					className="font-black text-foreground uppercase"
					style={{
						fontFamily: "var(--font-display)",
						fontSize: "clamp(2rem, 5vw, 4rem)",
						letterSpacing: "-0.02em",
						lineHeight: 1,
					}}
				>
					Athletes Who&nbsp;
					<br className="hidden sm:block" />
					<span className="text-primary">Push Limits</span>
				</h2>
			</div>

			<div className="w-full relative px-6">
				<div className="mx-auto max-w-6xl flex gap-0 overflow-x-auto pb-8 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-x-visible md:pb-0 md:snap-none scrollbar-hide border border-border/40">
					{testimonials.map((testimonial, i) => (
						<div
							key={testimonial.name}
							className={`snap-start shrink-0 w-[85vw] md:w-auto p-10 flex flex-col gap-6 relative group hover:bg-card/40 transition-colors ${
								i < testimonials.length - 1 ? "md:border-r border-border/40" : ""
							}`}
							style={{ transitionDuration: "var(--duration-standard)", transitionTimingFunction: "var(--ease)" }}
						>
							{/* Large decorative quote mark */}
							<div
								className="text-primary/20 font-black select-none leading-none"
								style={{ fontFamily: "var(--font-display)", fontSize: "7rem", lineHeight: 0.8 }}
								aria-hidden
							>
								"
							</div>

							<div className="flex gap-1 text-primary -mt-2">
								{Array.from({ length: 5 }).map((_, j) => (
									<Star key={j} size={14} weight="fill" />
								))}
							</div>

							<p className="text-muted-foreground leading-relaxed flex-1" style={{ fontSize: "1rem", lineHeight: 1.7 }}>
								{testimonial.content}
							</p>

							<div className="pt-6 border-t border-border/40">
								<h4
									className="font-black uppercase tracking-wider text-foreground"
									style={{ fontFamily: "var(--font-display)", fontSize: "0.9rem", letterSpacing: "0.1em" }}
								>
									{testimonial.name}
								</h4>
								<p className="text-xs text-primary/70 mt-1 uppercase tracking-wider font-bold">
									{testimonial.role} · {testimonial.company}
								</p>
							</div>

							{/* Bottom green bar on hover */}
							<div
								className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary origin-left scale-x-0 group-hover:scale-x-100"
								style={{ transition: "transform var(--duration-standard) cubic-bezier(0.25, 0, 0, 1)" }}
							/>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default TestimonialsComponent;
