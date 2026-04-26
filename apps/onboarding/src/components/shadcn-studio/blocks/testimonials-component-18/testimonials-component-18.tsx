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
			<div className="mx-auto max-w-6xl px-6 mb-16 text-center">
				<p className="text-primary font-semibold mb-3" style={{ fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
					Social Proof
				</p>
				<h2
					className="font-bold text-foreground"
					style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", letterSpacing: "-0.02em" }}
				>
					Trusted by the best
				</h2>
			</div>

			<div className="w-full relative px-6">
				{/* Mobile: horizontal scroll, Desktop: 3-column grid */}
				<div className="mx-auto max-w-6xl flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-x-visible md:pb-0 md:snap-none scrollbar-hide">
					{testimonials.map((testimonial) => (
						<div
							key={testimonial.name}
							className="snap-start shrink-0 w-[85vw] md:w-auto p-8 rounded-2xl flex flex-col gap-6"
							style={{
								backgroundColor: "rgba(255,255,255,0.02)",
								border: "1px solid rgba(255,255,255,0.06)",
							}}
						>
							<div className="flex gap-1 text-primary">
								{Array.from({ length: 5 }).map((_, j) => (
									<Star key={j} size={16} weight="fill" />
								))}
							</div>

							<p className="text-muted-foreground text-base leading-relaxed flex-1" style={{ fontSize: "1.05rem" }}>
								"{testimonial.content}"
							</p>

							<div className="pt-6 border-t border-[rgba(255,255,255,0.06)]">
								<h4 className="text-sm font-bold text-foreground">
									{testimonial.name}
								</h4>
								<p className="text-sm text-foreground/40 mt-0.5">
									{testimonial.role}, {testimonial.company}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default TestimonialsComponent;
