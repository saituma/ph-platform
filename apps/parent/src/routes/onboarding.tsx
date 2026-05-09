import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Sun, Moon } from "lucide-react";
import { getTokenStatus } from "#/lib/client-storage";
import { cn } from "#/lib/utils";
import { useTheme } from "#/routes/__root";

export const Route = createFileRoute("/onboarding")({
	beforeLoad: async () => {
		const status = await getTokenStatus();
		if (!status.authenticated) throw redirect({ to: "/login" });
	},
	component: OnboardingLayout,
});

const STEPS = [
	{ n: 1, label: "Password" },
	{ n: 2, label: "Your child" },
	{ n: 3, label: "Expectations" },
	{ n: 4, label: "How you found us" },
];

function OnboardingLayout() {
	const pathname = typeof window !== "undefined" ? window.location.pathname : "";
	const stepMatch = pathname.match(/\/onboarding\/step-(\d+)/);
	const current = stepMatch ? Number(stepMatch[1]) : null;
	const isSuccess = pathname.includes("/onboarding/success");
	const { theme, toggle } = useTheme();

	return (
		<div className="min-h-screen bg-background">
			{/* Top bar */}
			<header className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-white/10">
				<div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 bg-primary flex items-center justify-center">
							<span className="text-primary-foreground font-black text-xs">PH</span>
						</div>
						<span className="text-white/60 text-xs font-mono uppercase tracking-widest">
							Parent Portal
						</span>
					</div>

					{current && !isSuccess && (
						<div className="flex items-center gap-2">
							{STEPS.map(({ n }) => (
								<div key={n} className="flex items-center gap-2">
									<div className={cn(
										"w-6 h-6 flex items-center justify-center text-xs font-bold transition-all duration-300",
										n < current
											? "bg-primary text-primary-foreground"
											: n === current
												? "border-2 text-white/90"
												: "bg-white/10 text-white/30",
									)}
									style={n === current ? { borderColor: "var(--acid)", color: "var(--acid)" } : undefined}
									>
										{n < current ? (
											<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
												<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
											</svg>
										) : n}
									</div>
									{n < STEPS.length && (
										<div className={cn(
											"w-5 h-px transition-all duration-300",
											n < current ? "bg-primary" : "bg-white/15",
										)} />
									)}
								</div>
							))}
						</div>
					)}

					<div className="flex items-center gap-3">
						<span className="label-mono text-white/30">
							{current && !isSuccess ? `${current} / ${STEPS.length}` : ""}
						</span>
						<button
							type="button"
							onClick={toggle}
							title="Toggle theme"
							className="text-white/40 hover:text-white/80 transition-colors"
						>
							{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
						</button>
					</div>
				</div>

				{/* Progress bar */}
				{current && !isSuccess && (
					<div className="h-0.5 bg-white/10">
						<div
							className="h-full transition-all duration-500 ease-out"
							style={{
								width: `${(current / STEPS.length) * 100}%`,
								background: "var(--acid)",
							}}
						/>
					</div>
				)}
			</header>

			<main className="max-w-2xl mx-auto px-5 py-10">
				<Outlet />
			</main>
		</div>
	);
}
