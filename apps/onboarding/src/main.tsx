import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

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
