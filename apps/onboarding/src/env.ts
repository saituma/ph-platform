import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** Accepts full URLs or bare `host:port` (common .env mistake — fetch requires a scheme). */
function normalizeOptionalPublicApiUrl(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	const s = String(value).trim();
	if (!s) return undefined;
	const noTrailingSlash = s.replace(/\/+$/, "");
	if (/^https?:\/\//i.test(noTrailingSlash)) return noTrailingSlash;
	return `http://${noTrailingSlash.replace(/^\/+/, "")}`;
}

export const env = createEnv({
	server: {
		SERVER_URL: z.string().url().optional(),
	},

	/**
	 * The prefix that client-side variables must have. This is enforced both at
	 * a type-level and at runtime.
	 */
	clientPrefix: "VITE_",

	client: {
		VITE_APP_TITLE: z.string().min(1).optional(),
		VITE_PUBLIC_API_URL: z.preprocess(
			normalizeOptionalPublicApiUrl,
			z.string().url().optional(),
		),
		/** Admin web app origin for links from onboarding (e.g. team detail). */
		VITE_PUBLIC_ADMIN_WEB_URL: z.preprocess(
			normalizeOptionalPublicApiUrl,
			z.string().url().optional(),
		),
		/** Shown in copy for coach-provisioned athlete emails (`user.team@{domain}`). */
		VITE_TEAM_ATHLETE_EMAIL_DOMAIN: z.string().min(1).optional(),
	},

	/**
	 * What object holds the environment variables at runtime. This is usually
	 * `process.env` or `import.meta.env`.
	 */
	runtimeEnv: import.meta.env,

	/**
	 * By default, this library will feed the environment variables directly to
	 * the Zod validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file), the default value will never be applied.
	 *
	 * In order to solve these issues, we recommend that all new projects
	 * explicitly specify this option as true.
	 */
	emptyStringAsUndefined: true,
});
