import { Card, CardContent } from "#/components/ui/card";

const CTA = () => {
	return (
		<section className="bg-muted py-8 sm:py-16 lg:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<Card className="rounded-[2.5rem] border border-white/10 py-8 shadow-2xl dark:shadow-primary/5 sm:py-16 lg:py-24 overflow-hidden relative group">
					<div className="absolute top-0 left-0 w-full h-full bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" />
					<CardContent className="flex flex-wrap items-center justify-between gap-8 px-8 sm:flex-nowrap sm:px-16 lg:px-24">
						<div className="max-w-xs lg:max-w-lg space-y-4">
							<h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">
								Download PH Performance
							</h2>
							<p className="text-muted-foreground text-lg font-medium leading-relaxed">
								Track your progress, sync with your team, and access elite
								coaching tools on the go. Available now for iOS and Android.
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-6 max-md:w-full max-md:flex-col md:justify-end">
							<a
								href="#"
								className="bg-foreground text-background flex w-50 items-center gap-4 rounded-2xl px-6 py-3 hover:opacity-90 transition-all active:scale-[0.98] shadow-xl group/btn"
							>
								<img
									src="/apple-app-store.svg"
									alt="App Store"
									className="size-8.5 dark:invert"
								/>
								<div className="flex flex-col items-start">
									<p className="text-[10px] uppercase font-black leading-none opacity-70">
										Download on
									</p>
									<p className="text-lg font-bold leading-none tracking-tight">
										App Store
									</p>
								</div>
							</a>

							<a
								href="#"
								className="bg-foreground text-background flex w-50 items-center gap-4 rounded-2xl px-6 py-3 hover:opacity-90 transition-all active:scale-[0.98] shadow-xl group/btn"
							>
								<img
									src="/svgs/google.svg"
									alt="Google Play"
									className="size-8.5"
								/>
								<div className="flex flex-col items-start">
									<p className="text-[10px] uppercase font-black leading-none opacity-70">
										Get it on
									</p>
									<p className="text-lg font-bold leading-none tracking-tight">
										Google Play
									</p>
								</div>
							</a>
						</div>
					</CardContent>
				</Card>
			</div>
		</section>
	);
};

export default CTA;
