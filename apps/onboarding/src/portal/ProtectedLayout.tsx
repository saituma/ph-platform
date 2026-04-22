import { useRouter } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";

interface ProtectedLayoutProps {
	children: ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
	const router = useRouter();
	const [checking, setChecking] = useState(true);
	const [authenticated, setAuthenticated] = useState(false);

	useEffect(() => {
		const token = localStorage.getItem("auth_token");

		if (!token) {
			// Use setTimeout to avoid race condition
			setTimeout(() => {
				router.navigate({ to: "/login", replace: true });
			}, 0);
			setChecking(false);
			return;
		}

		setAuthenticated(true);
		setChecking(false);
	}, [router]);

	// Show spinner briefly to prevent flash
	if (checking) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-center">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
					<p className="mt-4 text-sm text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	if (!authenticated) {
		return null;
	}

	return <>{children}</>;
}
