import { TanStackDevtools } from "@tanstack/react-devtools";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { useEffect, useState, createContext, useContext } from "react";
import { getStoredTheme, applyTheme, saveTheme, type Theme } from "#/lib/theme";

interface RouterContext {
	queryClient: QueryClient;
}

// ── Theme context ─────────────────────────────────────────────────────────────
type ThemeCtx = { theme: Theme; toggle: () => void };
const ThemeContext = createContext<ThemeCtx>({ theme: "dark", toggle: () => {} });
export function useTheme() { return useContext(ThemeContext); }

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
	notFoundComponent: () => (
		<div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
			<h1 className="text-4xl font-bold mb-4">404</h1>
			<p className="text-muted-foreground mb-6">Page not found.</p>
			<a href="/" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium">
				Go Home
			</a>
		</div>
	),
});

function RootLayout() {
	const { queryClient } = Route.useRouteContext();
	const [theme, setTheme] = useState<Theme>("dark");

	// Apply stored theme (or dark default) on first render
	useEffect(() => {
		const stored = getStoredTheme();
		setTheme(stored);
		applyTheme(stored);
	}, []);

	const toggle = () => {
		setTheme((prev) => {
			const next: Theme = prev === "dark" ? "light" : "dark";
			applyTheme(next);
			saveTheme(next);
			return next;
		});
	};

	return (
		<ThemeContext.Provider value={{ theme, toggle }}>
			<QueryClientProvider client={queryClient}>
				<Outlet />
				<Toaster
					closeButton
					position="top-center"
					theme={theme}
					toastOptions={{
						className: "border border-border shadow-md font-sans",
					}}
				/>
				{import.meta.env.DEV && (
					<TanStackDevtools
						config={{ position: "bottom-right" }}
						plugins={[{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> }]}
					/>
				)}
			</QueryClientProvider>
		</ThemeContext.Provider>
	);
}
