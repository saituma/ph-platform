import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/parent-platform")({
  component: ParentPlatformLayout,
});

function ParentPlatformLayout() {
  return <Outlet />;
}
