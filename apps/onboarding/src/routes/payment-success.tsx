import { createFileRoute } from "@tanstack/react-router";
import { useLayoutEffect } from "react";

/**
 * Alias for Stripe `success_url` when env points here (e.g. `http://localhost:3000/payment-success`).
 * Forwards query params to `/onboarding/success`, which confirms the session with the API.
 */
export const Route = createFileRoute("/payment-success")({
	component: PaymentSuccessForward,
});

function PaymentSuccessForward() {
	useLayoutEffect(() => {
		const search =
			typeof window !== "undefined" ? (window.location.search ?? "") : "";
		window.location.replace(`/onboarding/success${search}`);
	}, []);

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<p className="text-sm text-muted-foreground">Redirecting…</p>
			</div>
		</div>
	);
}
