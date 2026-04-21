import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";

type ThemeMode = "light" | "dark";

function getInitialMode(): ThemeMode {
	if (typeof window === "undefined") return "light";
	const stored = window.localStorage.getItem("theme");
	if (stored === "light" || stored === "dark") return stored;
	return "light";
}

function applyThemeMode(mode: ThemeMode) {
	if (typeof window === "undefined") return;
	const root = document.documentElement;

	// Temporarily disable transitions to avoid lag during switch
	const css = document.createElement("style");
	css.appendChild(
		document.createTextNode(
			"* { -webkit-transition: none !important; -moz-transition: none !important; -o-transition: none !important; -ms-transition: none !important; transition: none !important; }",
		),
	);
	document.head.appendChild(css);

	root.classList.remove("light", "dark");
	root.classList.add(mode);
	root.setAttribute("data-theme", mode);
	root.style.colorScheme = mode;

	// Force repaint to ensure theme is applied before re-enabling transitions
	window.getComputedStyle(css).opacity;

	// Remove the style tag after a short delay
	setTimeout(() => {
		document.head.removeChild(css);
	}, 10);
}

export default function ThemeToggle() {
	const [mode, setMode] = useState<ThemeMode>("light");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const initialMode = getInitialMode();
		setMode(initialMode);
		applyThemeMode(initialMode);
		setMounted(true);

		const handleStorage = (e: StorageEvent) => {
			if (e.key === "theme" && (e.newValue === "light" || e.newValue === "dark")) {
				setMode(e.newValue as ThemeMode);
				applyThemeMode(e.newValue as ThemeMode);
			}
		};

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);

	function toggleMode() {
		const nextMode: ThemeMode = mode === "light" ? "dark" : "light";
		setMode(nextMode);
		applyThemeMode(nextMode);
		window.localStorage.setItem("theme", nextMode);
	}

	// Use stable values for SSR to prevent hydration mismatch
	const Icon = !mounted ? Sun : mode === "light" ? Sun : Moon;
	const label = !mounted
		? "Switch theme"
		: `Switch to ${mode === "light" ? "dark" : "light"} mode`;

	return (
		<button
			type="button"
			onClick={toggleMode}
			aria-label={label}
			title={label}
			className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-background/40 backdrop-blur-3xl text-muted-foreground/50 shadow-lg transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:border-primary/20 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
		>
			<Icon
				size={20}
				weight="bold"
				className="transition-transform duration-500 ease-spring"
			/>
		</button>
	);
}

