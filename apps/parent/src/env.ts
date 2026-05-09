import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

function normalizeOptionalPublicApiUrl(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	const s = String(value).trim();
	if (!s) return undefined;
	const noTrailingSlash = s.replace(/\/+$/, "");
	if (/^https?:\/\//i.test(noTrailingSlash)) return noTrailingSlash;
	return `http://${noTrailingSlash.replace(/^\/+/, "")}`;
}

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_PUBLIC_API_URL: z.preprocess(
			normalizeOptionalPublicApiUrl,
			z.string().url().optional(),
		),
	},
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
});
