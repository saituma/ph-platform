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
import Footer from "../components/Footer";
import Header from "../components/Header";
import { Toaster } from "../components/ui/sonner";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark')?stored:'light';var root=document.documentElement;var style=document.createElement('style');style.appendChild(document.createTextNode('*{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}'));document.head.appendChild(style);root.classList.remove('light','dark');root.classList.add(mode);root.setAttribute('data-theme',mode);root.style.colorScheme=mode;window.getComputedStyle(style).opacity;document.head.removeChild(style);}catch(e){}})();`;

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "PH Platform Onboarding",
			},
		],
		links: [
			// Fontshare (Telma) Preconnect & Load
			{ rel: "preconnect", href: "https://api.fontshare.com" },
			{
				rel: "stylesheet",
				href: "https://api.fontshare.com/v2/css?f[]=telma@400,500,600,700&display=swap",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
	notFoundComponent: () => {
		return (
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
		);
	},
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = router.state.location.pathname;
	const showChrome = !pathname.startsWith("/portal");

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: theme init script must run before hydration */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
				{showChrome && <Header />}
				{children}
				{showChrome && <Footer />}
				<Toaster 
                    closeButton 
                    position="top-center" 
                    toastOptions={{
                        className: "bg-card/40 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl",
                        style: {
                            fontFamily: "var(--font-sans)",
                        }
                    }}
                />

				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
