import { createFileRoute, redirect } from "@tanstack/react-router";

// No self-registration — parents use their apps/onboarding credentials.
export const Route = createFileRoute("/register")({
	beforeLoad: () => { throw redirect({ to: "/login" }); },
	component: () => null,
});
