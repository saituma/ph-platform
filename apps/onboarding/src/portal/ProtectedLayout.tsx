import { useRouter } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { getTokenStatus } from "@/lib/client-storage";

interface ProtectedLayoutProps {
	children: ReactNode;
}

/**
 * Gate that blocks rendering until we confirm there's an auth token cookie.
 * Full session verification (calling /api/auth/me) is handled by PortalContext.
 */
export function ProtectedLayout({ children }: ProtectedLayoutProps) {
	const router = useRouter();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let cancelled = false;
		async function check() {
			const status = await getTokenStatus();
			if (cancelled) return;
			if (!status.authenticated) {
				router.navigate({ to: "/login", replace: true });
				return;
			}
			setReady(true);
		}
		void check();
		return () => { cancelled = true; };
	}, [router]);

	if (!ready) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-center">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
					<p className="mt-4 text-sm text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
