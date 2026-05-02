import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { nitro } from "nitro/vite";
import neon from "./neon-vite-plugin.ts";

const onboardingRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
	// Always resolve env from this app (apps/onboarding), not the monorepo cwd — otherwise
	// VITE_PUBLIC_API_URL and the /api + /socket.io proxy target stay at :3000 while the API is on :3001.
	const env = loadEnv(mode, onboardingRoot, "");
	const apiTarget = (
		env.VITE_PUBLIC_API_URL || "http://127.0.0.1:3000"
	).replace(/\/+$/, "");

	return {
		base: env.VITE_BASE_PATH || "/",
		resolve: {
			tsconfigPaths: true,
			dedupe: [
				"react",
				"react-dom",
				"@tanstack/react-router",
				"@tanstack/react-start",
			],
		},
		server: {
			port: Number(env.VITE_DEV_SERVER_PORT || 5173),
			host: env.VITE_DEV_SERVER_HOST || "127.0.0.1",
			proxy: {
				"/api": {
					target: apiTarget,
					changeOrigin: true,
				},
				// Same origin as the page: avoids CORS / wrong host when the API is on a different port (e.g. 3001)
				"/socket.io": {
					target: apiTarget,
					changeOrigin: true,
					ws: true,
				},
			},
		},
		plugins: [
			devtools(),
			neon,
			tailwindcss(),
			tanstackStart(),
			nitro({
				preset: (process.env.NITRO_PRESET ?? "vercel") as "vercel" | "node-server",
				serverDir: "./server",
				routeRules: {
					"/api/auth/**": { cache: false, headers: { "cache-control": "no-store" } },
					"/api/app/**":  { cache: false, headers: { "cache-control": "no-store" } },
					"/assets/**":   { headers: { "cache-control": "public, max-age=31536000, immutable" } },
					"/about":       { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" } },
					"/features":    { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" } },
					"/services":    { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" } },
					"/gallery":     { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" } },
					"/terms-privacy": { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" } },
					"/**":          { headers: { "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600" } },
				},
			}),
			viteReact(),
		],
	};
});
