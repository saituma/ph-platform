#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { createInterface } = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");

const appIndex = process.argv.indexOf("--app");
const appName =
	appIndex >= 0 && process.argv[appIndex + 1]
		? process.argv[appIndex + 1]
		: process.env.HEROKU_APP || "ph-performance";
const forceAll = process.argv.includes("--all");

const requiredVars = [
	{
		key: "DATABASE_URL",
		secret: true,
		hint: "Postgres connection URL. Leave empty to create a Heroku Postgres add-on.",
	},
	{
		key: "DATABASE_SSL",
		defaultValue: "true",
		hint: "Use true for managed Postgres providers.",
	},
	{ key: "JWT_SECRET", secret: true, generate: "hex32" },
	{ key: "STRIPE_SECRET_KEY", secret: true },
	{ key: "STRIPE_SUCCESS_URL" },
	{ key: "STRIPE_CANCEL_URL" },
	{ key: "ADMIN_WEB_URL" },
];

const optionalVars = [
	"STRIPE_PUBLISHABLE_KEY",
	"STRIPE_WEBHOOK_SECRET",
	"STRIPE_PRICE_PHP",
	"STRIPE_PRICE_PHP_PLUS",
	"STRIPE_PRICE_PHP_PREMIUM",
	"STRIPE_PRICE_PHP_PRO",
	"CORS_ORIGINS",
	"PUBLIC_API_BASE_URL",
	"SENTRY_DSN",
	"OPEN_AI_API_KEY",
	"EXPO_ACCESS_TOKEN",
	"RESEND_API_KEY",
	"UPSTASH_REDIS_REST_URL",
	"UPSTASH_REDIS_REST_TOKEN",
	"REDIS_URL",
	"TURNSTILE_SECRET_KEY",
	"R2_ACCOUNT_ID",
	"R2_ACCESS_KEY_ID",
	"R2_SECRET_ACCESS_KEY",
	"R2_BUCKET",
	"MEDIA_PUBLIC_BASE_URL",
];

function runHeroku(args, options = {}) {
	return execFileSync("heroku", args, {
		stdio: options.stdio ?? "pipe",
		encoding: "utf8",
	});
}

function randomHex32() {
	return require("node:crypto").randomBytes(32).toString("hex");
}

function getExistingConfig() {
	const raw = runHeroku(["config", "--json", "-a", appName]);
	return JSON.parse(raw);
}

function hasConfigValue(config, key) {
	return typeof config[key] === "string" && config[key].length > 0;
}

async function prompt(rl, item) {
	const hint = item.hint ? `\n${item.hint}` : "";
	const fallback = item.generate === "hex32" ? randomHex32() : item.defaultValue;
	const suffix = fallback ? ` [default hidden/set]` : "";
	const label = `${item.key}${suffix}:${hint}\n> `;

	if (!item.secret) {
		const value = (await rl.question(label)).trim();
		return value || fallback || "";
	}

	const value = await rl.question(label);
	return value.trim() || fallback || "";
}

async function main() {
	console.log(`Configuring Heroku app: ${appName}`);
	runHeroku(["auth:whoami"], { stdio: "inherit" });
	const existingConfig = getExistingConfig();

	const rl = createInterface({ input, output });
	const values = {};

	try {
		for (const item of requiredVars) {
			if (!forceAll && hasConfigValue(existingConfig, item.key)) {
				console.log(`${item.key} already set; skipping.`);
				continue;
			}
			values[item.key] = await prompt(rl, item);
			if (item.key === "DATABASE_URL" && !values[item.key]) {
				console.log("Creating Heroku Postgres add-on...");
				runHeroku(["addons:create", "heroku-postgresql:essential-0", "-a", appName], {
					stdio: "inherit",
				});
				continue;
			}
			if (!values[item.key]) {
				throw new Error(`${item.key} is required`);
			}
		}

		const askOptional = (
			await rl.question("Set optional API vars now? [y/N]\n> ")
		)
			.trim()
			.toLowerCase();

		if (askOptional === "y" || askOptional === "yes") {
			for (const key of optionalVars) {
				if (!forceAll && hasConfigValue(existingConfig, key)) {
					console.log(`${key} already set; skipping.`);
					continue;
				}
				const value = (await rl.question(`${key} (empty to skip):\n> `)).trim();
				if (value) values[key] = value;
			}
		}
	} finally {
		rl.close();
	}

	const entries = Object.entries(values).filter(([, value]) => value);
	if (entries.length) {
		runHeroku(
			["config:set", ...entries.map(([key, value]) => `${key}=${value}`), "-a", appName],
			{ stdio: "inherit" },
		);
	}

	runHeroku(["restart", "-a", appName], { stdio: "inherit" });
	console.log("Done. Tail logs with:");
	console.log(`heroku logs --tail -a ${appName}`);
	console.log("Use --all to re-enter values that are already set.");
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
