import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { PortalProvider } from "@/portal/PortalContext";
import { ProtectedLayout } from "@/portal/ProtectedLayout";

export const Route = createFileRoute("/portal")({
	component: PortalLayout,
});

function PortalLayout() {
	return (
		<ProtectedLayout>
			<PortalProvider>
				<BottomNav>
					<Outlet />
				</BottomNav>
			</PortalProvider>
		</ProtectedLayout>
	);
}
