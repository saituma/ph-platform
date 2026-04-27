const CTA = () => {
	return (
		<section className="relative overflow-hidden border-t border-primary/20 bg-primary/5 py-28 sm:py-40">
			{/* Accent radial bloom */}
			<div
				className="absolute inset-0 pointer-events-none -z-10"
				style={{
					background: "radial-gradient(ellipse at 50% 100%, hsl(var(--primary) / 0.12), transparent 70%)",
				}}
			/>

			<div className="mx-auto max-w-4xl px-6 text-center">
				<p
					className="text-primary font-black mb-6"
					style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase" }}
				>
					Join 10,000+ Elite Athletes Today
				</p>

				<h2
					className="font-black uppercase text-foreground"
					style={{
						fontFamily: "var(--font-display)",
						fontSize: "clamp(2.5rem, 7vw, 6rem)",
						letterSpacing: "-0.02em",
						lineHeight: 1,
					}}
				>
					Start Tracking
					<br />
					<span className="text-primary">Everything.</span>
				</h2>

				<p
					className="mt-8 text-muted-foreground max-w-xl mx-auto"
					style={{ fontSize: "clamp(1rem, 1.5vw, 1.125rem)", lineHeight: 1.6 }}
				>
					Join the elite teams and athletes who rely on PH Performance. Download the mobile app to get started.
				</p>

				<div className="mt-12 flex flex-wrap items-center justify-center gap-4">
					<a
						href="#"
						className="inline-flex items-center gap-4 border border-primary/30 bg-card/60 text-foreground px-6 py-4 hover:bg-card hover:border-primary/60 active:scale-[0.98] transition-all"
						style={{ transitionDuration: "var(--duration-micro)", transitionTimingFunction: "var(--ease)" }}
					>
						<img
							src="/apple-app-store.svg"
							alt="App Store"
							className="size-8"
						/>
						<div className="flex flex-col items-start">
							<span className="text-[10px] uppercase font-black tracking-widest leading-none opacity-50">
								Download on
							</span>
							<span
								className="font-black uppercase tracking-wider leading-tight mt-1"
								style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}
							>
								App Store
							</span>
						</div>
					</a>

					<a
						href="#"
						className="inline-flex items-center gap-4 border border-primary/30 bg-card/60 text-foreground px-6 py-4 hover:bg-card hover:border-primary/60 active:scale-[0.98] transition-all"
						style={{ transitionDuration: "var(--duration-micro)", transitionTimingFunction: "var(--ease)" }}
					>
						<img
							src="/svgs/google.svg"
							alt="Google Play"
							className="size-8"
						/>
						<div className="flex flex-col items-start">
							<span className="text-[10px] uppercase font-black tracking-widest leading-none opacity-50">
								Get it on
							</span>
							<span
								className="font-black uppercase tracking-wider leading-tight mt-1"
								style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}
							>
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
