import * as Sentry from "@sentry/tanstackstart-react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
	useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import React from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { env } from "../env";
import appCss from "../styles.css?url";

// Init Sentry client-side once (SSR: runs on server too, but instrument.server.mjs
// handles server init — this guard prevents double-init in SSR).
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

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark')?stored:'light';var root=document.documentElement;var style=document.createElement('style');style.appendChild(document.createTextNode('*{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}'));document.head.appendChild(style);root.classList.remove('light','dark');root.classList.add(mode);root.setAttribute('data-theme',mode);root.style.colorScheme=mode;window.getComputedStyle(style).opacity;document.head.removeChild(style);}catch(e){}})();`;

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "PH Performance — Elite Athlete & Team Training Platform" },
			{
				name: "description",
				content:
					"PH Performance is the professional platform for athletes and teams to track progress, optimize training, and achieve more. Deep analytics, video coaching, and team sync.",
			},
			// Open Graph defaults
			{ property: "og:site_name", content: "PH Performance" },
			{ property: "og:type", content: "website" },
			{
				property: "og:title",
				content: "PH Performance — Elite Athlete & Team Training Platform",
			},
			{
				property: "og:description",
				content:
					"Professional performance tracking for athletes and teams. Deep analytics, video coaching, and real-time team sync — all in one platform.",
			},
			{
				property: "og:image",
				content: "https://ph-platform-onboarding.vercel.app/home.png",
			},
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{
				property: "og:url",
				content: "https://ph-platform-onboarding.vercel.app/",
			},
			// Twitter / X Card defaults
			{ name: "twitter:card", content: "summary_large_image" },
			{
				name: "twitter:title",
				content: "PH Performance — Elite Athlete & Team Training Platform",
			},
			{
				name: "twitter:description",
				content:
					"Professional performance tracking for athletes and teams. Deep analytics, video coaching, and real-time team sync.",
			},
			{
				name: "twitter:image",
				content: "https://ph-platform-onboarding.vercel.app/home.png",
			},
			// Theme colour for browser chrome
			{ name: "theme-color", content: "#22c55e" },
		],
		links: [
			{ rel: "canonical", href: "https://ph-platform-onboarding.vercel.app/" },
			{ rel: "preconnect", href: "https://api.fontshare.com" },
			{
				rel: "stylesheet",
				href: "https://api.fontshare.com/v2/css?f[]=telma@400,500,600,700&display=swap",
			},
			{ rel: "stylesheet", href: appCss },
		],
	}),
	shellComponent: RootDocument,
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

function RootDocument({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = router.state.location.pathname;

	const marketingPages = ["/", "/about", "/features", "/education-faq", "/terms-privacy"];
	const showChrome = marketingPages.includes(pathname);

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: theme init script must run before hydration */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
				<TooltipProvider>
					<ErrorBoundary>
						{showChrome && <Header />}
						{children}
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
				<Scripts />
			</body>
		</html>
	);
}
