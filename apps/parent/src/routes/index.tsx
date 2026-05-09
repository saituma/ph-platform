import { createFileRoute, redirect } from "@tanstack/react-router";
import { getTokenStatus } from "#/lib/client-storage";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const status = await getTokenStatus();
		if (status.authenticated) {
			throw redirect({ to: "/dashboard" });
		} else {
			throw redirect({ to: "/login" });
		}
	},
	component: () => null,
});
