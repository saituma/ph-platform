const CTA = () => {
	return (
		<section className="bg-background py-28 sm:py-40 border-t border-border/40">
			<div className="mx-auto max-w-4xl px-6 text-center hero-stagger">
				<h2
					className="font-bold text-foreground leading-[1.05]"
					style={{
						fontSize: "clamp(2.5rem, 5vw, 5rem)",
						letterSpacing: "-0.02em",
					}}
				>
					Start tracking everything.
				</h2>
				<p
					className="mt-6 text-muted-foreground max-w-xl mx-auto"
					style={{ fontSize: "clamp(1rem, 1.5vw, 1.125rem)", lineHeight: 1.6 }}
				>
					Join the elite teams and athletes who rely on PH Performance. Download the mobile app to get started.
				</p>

				<div className="mt-12 flex flex-wrap items-center justify-center gap-4">
					<a
						href="#"
						className="inline-flex items-center gap-4 rounded-xl border border-[rgba(255,255,255,0.12)] bg-card text-foreground px-6 py-3 transition-colors hover:bg-card/60 active:scale-[0.98]"
						style={{ transitionDuration: "var(--duration-micro)", transitionTimingFunction: "var(--ease)" }}
					>
						<img
							src="/apple-app-store.svg"
							alt="App Store"
							className="size-8"
						/>
						<div className="flex flex-col items-start">
							<span className="text-[10px] uppercase font-semibold leading-none opacity-60">
								Download on
							</span>
							<span className="text-sm font-bold leading-tight tracking-tight mt-1" style={{ fontFamily: "var(--font-sans)" }}>
								App Store
							</span>
						</div>
					</a>

					<a
						href="#"
						className="inline-flex items-center gap-4 rounded-xl border border-[rgba(255,255,255,0.12)] bg-card text-foreground px-6 py-3 transition-colors hover:bg-card/60 active:scale-[0.98]"
						style={{ transitionDuration: "var(--duration-micro)", transitionTimingFunction: "var(--ease)" }}
					>
						<img
							src="/svgs/google.svg"
							alt="Google Play"
							className="size-8"
						/>
						<div className="flex flex-col items-start">
							<span className="text-[10px] uppercase font-semibold leading-none opacity-60">
								Get it on
							</span>
							<span className="text-sm font-bold leading-tight tracking-tight mt-1" style={{ fontFamily: "var(--font-sans)" }}>
								Google Play
							</span>
						</div>
					</a>
				</div>
			</div>
		</section>
	);
};

export default CTA;
