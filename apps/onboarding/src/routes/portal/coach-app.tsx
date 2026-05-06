import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/coach-app")({
  beforeLoad: () => {
    throw redirect({ to: "/portal/parent-platform" });
  },
  component: () => null,
});
