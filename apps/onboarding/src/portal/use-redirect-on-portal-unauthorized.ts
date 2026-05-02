import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { usePortal } from "@/portal/PortalContext";
import { PORTAL_UNAUTHORIZED_ERROR } from "@/portal/portal-errors";
import { clearAuthToken } from "@/lib/client-storage";

/** Clears portal session and sends the user to login when `/api/auth/me` returns 401. */
export function useRedirectOnPortalUnauthorized() {
	const navigate = useNavigate();
	const { error, refresh } = usePortal();

	useEffect(() => {
		if (error !== PORTAL_UNAUTHORIZED_ERROR) return;
		void clearAuthToken();
		localStorage.removeItem("user_type");
		localStorage.removeItem("pending_email");
		void refresh();
		navigate({ to: "/login", replace: true });
	}, [error, navigate, refresh]);
}
