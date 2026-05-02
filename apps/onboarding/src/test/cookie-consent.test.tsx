import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { CookieConsent } from "#/components/CookieConsent";

describe("CookieConsent", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("shows banner when no consent stored", () => {
		render(<CookieConsent />);
		expect(screen.getByText(/We use cookies/)).toBeDefined();
	});

	it("hides banner when consent already accepted", () => {
		localStorage.setItem("ph-cookie-consent", "accepted");
		render(<CookieConsent />);
		expect(screen.queryByText(/We use cookies/)).toBeNull();
	});

	it("clicking Accept All stores consent and hides banner", () => {
		render(<CookieConsent />);
		fireEvent.click(screen.getByText("Accept All"));
		expect(localStorage.getItem("ph-cookie-consent")).toBe("accepted");
		expect(screen.queryByText(/We use cookies/)).toBeNull();
	});

	it("clicking Essential Only stores minimal consent", () => {
		render(<CookieConsent />);
		fireEvent.click(screen.getByText("Essential Only"));
		expect(localStorage.getItem("ph-cookie-consent")).toBe("minimal");
	});
});
