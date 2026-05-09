const STORAGE_KEY = "ph_parent_theme";

export type Theme = "light" | "dark";

export function getStoredTheme(): Theme {
	if (typeof window === "undefined") return "dark";
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark") return stored;
	return "dark"; // default to dark
}

export function applyTheme(theme: Theme) {
	if (typeof document === "undefined") return;
	document.documentElement.classList.toggle("dark", theme === "dark");
}

export function saveTheme(theme: Theme) {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEY, theme);
}
