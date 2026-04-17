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
	const [mode, setMode] = useState<ThemeMode>(getInitialMode());

	useEffect(() => {
		// Sync initial state and handle storage events from other tabs
		const initialMode = getInitialMode();
		setMode(initialMode);
		applyThemeMode(initialMode);

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

	const Icon = mode === "light" ? Sun : Moon;
	const label = `Switch to ${mode === "light" ? "dark" : "light"} mode`;

	return (
		<button
			type="button"
			onClick={toggleMode}
			aria-label={label}
			title={label}
			className="flex h-10 w-10 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground shadow-sm transition-all duration-200 hover:bg-accent hover:text-accent-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<Icon
				size={20}
				weight="regular"
				className="transition-transform duration-300 ease-spring"
			/>
		</button>
	);
}

