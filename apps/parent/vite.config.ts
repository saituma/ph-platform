import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, appRoot, "");
	const apiTarget = (env.VITE_PUBLIC_API_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

	return {
		resolve: {
			tsconfigPaths: true,
			dedupe: ["react", "react-dom", "@tanstack/react-router"],
		},
		server: {
			port: Number(env.VITE_DEV_SERVER_PORT || 5174),
			host: env.VITE_DEV_SERVER_HOST || "127.0.0.1",
			proxy: {
				"/api": { target: apiTarget, changeOrigin: true },
				"/socket.io": { target: apiTarget, changeOrigin: true, ws: true },
			},
		},
		build: {
			target: "es2022",
			cssMinify: "lightningcss",
			sourcemap: mode === "production" ? "hidden" : true,
			chunkSizeWarningLimit: 600,
			rollupOptions: {
				output: {
					manualChunks(id: string) {
						if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) return "vendor-react";
						if (id.includes("node_modules/@tanstack/react-router") || id.includes("node_modules/@tanstack/react-query")) return "vendor-router";
						if (id.includes("node_modules/framer-motion")) return "vendor-motion";
						if (id.includes("node_modules/lucide-react") || id.includes("node_modules/sonner")) return "vendor-ui";
						if (id.includes("node_modules/radix-ui") || id.includes("node_modules/@radix-ui")) return "vendor-radix";
						if (id.includes("node_modules/zod")) return "vendor-zod";
						if (id.includes("node_modules/date-fns")) return "vendor-date";
						if (id.includes("node_modules/socket.io")) return "vendor-socket";
					},
				},
			},
		},
		plugins: [
			devtools(),
			tailwindcss(),
			tanstackRouter({
				target: "react",
				routesDirectory: "./src/routes",
				generatedRouteTree: "./src/routeTree.gen.ts",
				routeFileIgnorePattern: "api/.*",
				autoCodeSplitting: true,
			}),
			viteReact(),
		],
	};
});
