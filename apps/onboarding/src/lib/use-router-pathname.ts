import { useRouter } from "@tanstack/react-router";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Pathname that updates on SPA navigations. Prefer this over `useRouterState` in
 * TanStack Start: some SSR/HMR bundles can break the internal `useRouter` import
 * inside `useRouterState` (“useRouter is not defined”).
 */
export function useRouterPathname(): string {
	const router = useRouter();

	const subscribe = useCallback(
		(onStoreChange: () => void) =>
			router.history.subscribe(() => onStoreChange()),
		[router],
	);

	const getSnapshot = useCallback(() => {
		const fromHistory = router.history?.location;
		if (fromHistory && typeof fromHistory.pathname === "string") {
			return fromHistory.pathname;
		}
		return router.state.location.pathname;
	}, [router]);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
