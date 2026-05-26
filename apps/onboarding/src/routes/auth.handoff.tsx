import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { setAuthToken } from "#/lib/client-storage";

export const Route = createFileRoute("/auth/handoff")({
	component: AuthHandoff,
});

function AuthHandoff() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const token = params.get("token");
		const fromMobile = params.get("from_mobile");

		if (!token) {
			setError("No token provided. Please sign in again.");
			return;
		}

		if (fromMobile === "1") {
			sessionStorage.setItem("ph_from_mobile", "1");
		}

		setAuthToken(token)
			.then(() => navigate({ to: "/portal/dashboard", replace: true }))
			.catch(() => setError("Could not authenticate. Please try again."));
	}, [navigate]);

	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center text-center px-6">
				<div>
					<p className="text-red-500 font-medium">{error}</p>
					<a href="/login" className="mt-4 inline-block text-sm underline text-muted-foreground">
						Return to login
					</a>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center">
			<p className="text-muted-foreground text-sm animate-pulse">Loading your account…</p>
		</div>
	);
}
