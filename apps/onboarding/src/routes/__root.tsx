import * as Sentry from "@sentry/tanstackstart-react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	Link,
	Outlet,
	useRouteContext,
	useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { CookieConsent } from "../components/CookieConsent";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { NavigationProgress } from "../components/NavigationProgress";
import { OfflineIndicator } from "../components/OfflineIndicator";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { env } from "../env";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { reportWebVitals } from "../lib/web-vitals";

if (typeof window !== "undefined" && env.VITE_SENTRY_DSN) {
	Sentry.init({
		dsn: env.VITE_SENTRY_DSN,
		sendDefaultPii: false,
		tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
		environment: import.meta.env.PROD ? "production" : "development",
	});
}

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: RootLayout,
	notFoundComponent: () => (
		<div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
			<h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
			<p className="text-muted-foreground mb-8">
				The page you are looking for does not exist.
			</p>
			<Link
				to="/"
				className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold"
			>
				Go Home
			</Link>
		</div>
	),
});

function RootLayout() {
	const router = useRouter();
	const { queryClient } = useRouteContext({ from: "__root__" });
	const pathname = router.state.location.pathname;

	useEffect(() => {
		reportWebVitals();
	}, []);

	useEffect(() => {
		if ("serviceWorker" in navigator && import.meta.env.PROD) {
			navigator.serviceWorker.register("/sw.js").catch(() => {});
		}
	}, []);

	const marketingPages = [
		"/about",
		"/features",
		"/services",
		"/app-download",
		"/gallery",
		"/contact",
		"/education-faq",
		"/terms-privacy",
	];
	const showChrome = marketingPages.includes(pathname);

	return (
		<QueryClientProvider client={queryClient}>
		<div className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-foreground selection:text-background">
			<NavigationProgress />
			<OfflineIndicator />
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-black focus:rounded"
			>
				Skip to main content
			</a>
			<TooltipProvider>
				<ErrorBoundary>
					{showChrome && <Header />}
					<main id="main-content">
						<Outlet />
					</main>
					{showChrome && <Footer />}
				</ErrorBoundary>
				<Toaster
					closeButton
					position="top-center"
					toastOptions={{
						className:
							"bg-card/40 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl",
						style: { fontFamily: "var(--font-sans)" },
					}}
				/>

				<CookieConsent />

				{import.meta.env.DEV && (
					<TanStackDevtools
						config={{ position: "bottom-right" }}
						plugins={[
							{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> },
							TanStackQueryDevtools,
						]}
					/>
				)}
			</TooltipProvider>
		</div>
		</QueryClientProvider>
	);
}
