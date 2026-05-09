import { TanStackDevtools } from "@tanstack/react-devtools";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
	notFoundComponent: () => (
		<div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
			<h1 className="text-4xl font-bold mb-4">404</h1>
			<p className="text-muted-foreground mb-6">Page not found.</p>
			<a href="/" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
				Go Home
			</a>
		</div>
	),
});

function RootLayout() {
	const { queryClient } = Route.useRouteContext();
	return (
		<QueryClientProvider client={queryClient}>
			<Outlet />
			<Toaster
				closeButton
				position="top-center"
				toastOptions={{
					className: "rounded-xl border border-border shadow-md",
				}}
			/>
			{import.meta.env.DEV && (
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> }]}
				/>
			)}
		</QueryClientProvider>
	);
}
