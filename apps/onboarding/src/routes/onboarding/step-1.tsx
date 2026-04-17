import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/step-1")({
	component: OnboardingStep1,
});

function OnboardingStep1() {
	return (
		<main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
			<section className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-4">
					<p className="text-sm font-bold uppercase tracking-widest text-primary">
						Step 1 of 4
					</p>
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
						Welcome to the Platform
					</h1>
					<p className="text-xl text-muted-foreground leading-relaxed">
						Let's start by getting to know you better.
					</p>
				</div>
                <div className="p-12 border-2 border-dashed border-border rounded-3xl text-center">
                    <p className="text-muted-foreground italic">Step 1 form content coming soon...</p>
                </div>
			</section>
		</main>
	);
}
