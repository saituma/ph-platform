import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";
import { getClientAuthToken } from "@/lib/client-storage";

// Inject Bearer token on every /api/* request so all service functions
// are authenticated without each one needing to import getAuthHeaders().
const _origFetch = window.fetch.bind(window);
window.fetch = function portalFetch(input, init) {
	const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
	const isApiCall = url.startsWith("/api/") || url.includes("/api/");
	if (isApiCall) {
		const token = getClientAuthToken();
		if (token) {
			const existingHeaders = init?.headers instanceof Headers
				? Object.fromEntries((init.headers as Headers).entries())
				: (init?.headers ?? {}) as Record<string, string>;
			init = {
				...init,
				headers: { Authorization: `Bearer ${token}`, ...existingHeaders },
			};
		}
	}
	return _origFetch(input, init);
};

window.addEventListener("unhandledrejection", (event) => {
	const msg = event.reason?.message ?? String(event.reason);
	if (
		msg.includes("Failed to fetch dynamically imported module") ||
		msg.includes("Importing a module script failed") ||
		msg.includes("error loading dynamically imported module")
	) {
		const reloaded = sessionStorage.getItem("ph_chunk_reload");
		if (!reloaded) {
			sessionStorage.setItem("ph_chunk_reload", "1");
			window.location.reload();
			return;
		}
		sessionStorage.removeItem("ph_chunk_reload");
	}
});

sessionStorage.removeItem("ph_chunk_reload");

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element #root was not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<RouterProvider router={getRouter()} />
	</StrictMode>,
);
