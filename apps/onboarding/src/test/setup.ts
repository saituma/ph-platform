import "@testing-library/dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
	cleanup();
});

vi.mock("#/env", () => ({
	env: {
		VITE_TURNSTILE_SITE_KEY: "",
		VITE_SENTRY_DSN: "",
		VITE_PUBLIC_API_URL: "http://localhost:3000",
	},
}));

vi.mock("#/lib/config", () => ({
	config: {
		apiBaseUrl: "http://localhost:3000",
	},
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({ component: () => null }),
	Link: ({ children, ...props }: any) => {
		const { createElement } = require("react");
		return createElement("a", props, children);
	},
	useNavigate: () => vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));
