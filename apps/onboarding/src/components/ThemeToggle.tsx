import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";

type ThemeMode = "light" | "dark";

function getInitialMode(): ThemeMode {
	if (typeof window === "undefined") return "dark";
	const stored = window.localStorage.getItem("theme");
	if (stored === "light" || stored === "dark") return stored;
	return "dark";
}

function applyThemeMode(mode: ThemeMode) {
	if (typeof window === "undefined") return;
	const root = document.documentElement;

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

	window.getComputedStyle(css).opacity;

	setTimeout(() => {
		document.head.removeChild(css);
	}, 10);
}

export default function ThemeToggle() {
	const [mode, setMode] = useState<ThemeMode>("dark");
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

	const Icon = !mounted ? Moon : mode === "dark" ? Moon : Sun;
	const label = !mounted
		? "Switch theme"
		: `Switch to ${mode === "dark" ? "light" : "dark"} mode`;

	return (
		<button
			type="button"
			onClick={toggleMode}
			aria-label={label}
			title={label}
			className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
			style={{ transitionDuration: "var(--duration-micro)", transitionTimingFunction: "var(--ease)" }}
		>
			<Icon
				size={18}
				weight="bold"
			/>
		</button>
	);
}
