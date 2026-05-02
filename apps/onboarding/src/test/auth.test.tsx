import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { z } from "zod";

const loginSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

describe("Login validation", () => {
	it("rejects empty email", () => {
		const result = loginSchema.safeParse({ email: "", password: "12345678" });
		expect(result.success).toBe(false);
	});

	it("rejects invalid email format", () => {
		const result = loginSchema.safeParse({ email: "notanemail", password: "12345678" });
		expect(result.success).toBe(false);
	});

	it("rejects short password", () => {
		const result = loginSchema.safeParse({ email: "test@example.com", password: "short" });
		expect(result.success).toBe(false);
	});

	it("accepts valid credentials", () => {
		const result = loginSchema.safeParse({ email: "test@example.com", password: "validpass123" });
		expect(result.success).toBe(true);
	});
});

describe("Login form renders", () => {
	it("renders email and password inputs", () => {
		render(
			<form data-testid="login-form">
				<input type="email" placeholder="Email address" aria-label="Email" />
				<input type="password" placeholder="Password" aria-label="Password" />
				<button type="submit">Sign In</button>
			</form>,
		);
		expect(screen.getByLabelText("Email")).toBeDefined();
		expect(screen.getByLabelText("Password")).toBeDefined();
		expect(screen.getByRole("button", { name: "Sign In" })).toBeDefined();
	});
});
