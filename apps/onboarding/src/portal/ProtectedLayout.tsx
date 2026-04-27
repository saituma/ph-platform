import { useRouter } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { config } from "@/lib/config";

interface ProtectedLayoutProps {
	children: ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
	const router = useRouter();
	const [checking, setChecking] = useState(true);
	const [authenticated, setAuthenticated] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const token = localStorage.getItem("auth_token");

		if (!token) {
			// Use setTimeout to avoid race condition
			setTimeout(() => {
				router.navigate({ to: "/login", replace: true });
			}, 0);
			setChecking(false);
			return;
		}

		const verify = async () => {
			try {
				const baseUrl = config.api.baseUrl.replace(/\/+$/, "");
				let res = await fetch(`${baseUrl}/api/auth/me`, {
					headers: { Authorization: `Bearer ${token}` },
					cache: "no-store",
				});
				if (res.status === 401) {
					await new Promise((resolve) => setTimeout(resolve, 200));
					res = await fetch(`${baseUrl}/api/auth/me`, {
						headers: { Authorization: `Bearer ${token}` },
						cache: "no-store",
					});
				}
				if (res.status === 401 || res.status === 403) {
					localStorage.removeItem("auth_token");
					localStorage.removeItem("user_type");
					localStorage.removeItem("pending_email");
					if (!cancelled) router.navigate({ to: "/login", replace: true });
					return;
				}
				if (res.status === 200 || res.status === 304) {
					if (!cancelled) setAuthenticated(true);
					return;
				}

				// Keep token-based session during transient backend issues.
				if (res.status >= 500) {
					if (!cancelled) setAuthenticated(true);
					return;
				}

				throw new Error("session check failed");
			} catch {
				// Network error: keep local auth state and let feature-level fetches retry.
				if (!cancelled) setAuthenticated(true);
			} finally {
				if (!cancelled) setChecking(false);
			}
		};

		void verify();
		return () => {
			cancelled = true;
		};
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
