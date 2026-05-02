import { describe, it, expect } from "vitest";
import { z } from "zod";

const registrationSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

describe("Registration validation", () => {
	it("rejects empty email", () => {
		const result = registrationSchema.safeParse({ email: "" });
		expect(result.success).toBe(false);
	});

	it("rejects invalid email", () => {
		const result = registrationSchema.safeParse({ email: "invalid" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe("Please enter a valid email address");
		}
	});

	it("accepts valid email", () => {
		const result = registrationSchema.safeParse({ email: "athlete@example.com" });
		expect(result.success).toBe(true);
	});
});
