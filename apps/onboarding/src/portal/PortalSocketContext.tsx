import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import { getPublicApiBaseUrl } from "@/lib/public-api";
import { usePortal } from "@/portal/PortalContext";

type PortalSocketStatus = "idle" | "connecting" | "connected" | "error";

type PortalSocketContextValue = {
	socket: Socket | null;
	status: PortalSocketStatus;
};

export const PortalSocketContext = createContext<PortalSocketContextValue | null>(
	null,
);

function getSocketUrl() {
	const rawSocket = String(
		(import.meta.env as Record<string, string | undefined>)
			.VITE_PUBLIC_SOCKET_URL ?? "",
	).trim();
	const apiBase = getPublicApiBaseUrl();
	return rawSocket
		? rawSocket.replace(/\/api\/?$/, "")
		: apiBase
			? apiBase.replace(/\/api\/?$/, "")
			: window.location.origin;
}

export function PortalSocketProvider({ children }: { children: ReactNode }) {
	const { token, loading } = usePortal();
	const [socket, setSocket] = useState<Socket | null>(null);
	const [status, setStatus] = useState<PortalSocketStatus>("idle");

	useEffect(() => {
		if (loading || !token || typeof window === "undefined") {
			setStatus("idle");
			setSocket(null);
			return;
		}

		const socketUrl = getSocketUrl();
		const sameOrigin =
			new URL(socketUrl, window.location.origin).origin ===
			window.location.origin;

		let cancelled = false;

		async function connect() {
			let socketAuthToken: string | undefined;

			if (!sameOrigin) {
				// Cross-origin: fetch a short-lived (60s) token from the server, which reads
				// the auth_token httpOnly cookie. Never use localStorage for socket auth.
				try {
					const res = await fetch("/api/app/socket-token", {
						credentials: "include",
						cache: "no-store",
					});
					if (res.ok) {
						const data = (await res.json()) as { token?: string };
						socketAuthToken = data.token ?? undefined;
					}
				} catch {
					// no-op
				}
				if (!socketAuthToken) {
					if (!cancelled) {
						setStatus("idle");
						setSocket(null);
					}
					return;
				}
			}

				if (cancelled) return;
				setStatus("connecting");
				const nextSocket = io(socketUrl, {
					path: "/socket.io",
					auth: socketAuthToken ? { token: socketAuthToken } : undefined,
					withCredentials: true,
					transports: ["polling", "websocket"],
					reconnection: true,
					reconnectionAttempts: 12,
					reconnectionDelay: 1000,
					reconnectionDelayMax: 10000,
				});

				nextSocket.on("connect", () => setStatus("connected"));
				nextSocket.on("connect_error", () => setStatus("error"));
				nextSocket.on("disconnect", () => setStatus("idle"));
				if (!cancelled) setSocket(nextSocket);
				else {
					nextSocket.removeAllListeners();
					nextSocket.disconnect();
				}
			}

			void connect();

			return () => {
				cancelled = true;
				setSocket((prev) => {
					if (prev) {
						prev.removeAllListeners();
						prev.disconnect();
					}
					return null;
				});
				setStatus("idle");
			};
		}, [loading, token]);

	const value = useMemo<PortalSocketContextValue>(
		() => ({ socket, status }),
		[socket, status],
	);

	return (
		<PortalSocketContext.Provider value={value}>
			{children}
		</PortalSocketContext.Provider>
	);
}

export function usePortalSocket() {
	const ctx = useContext(PortalSocketContext);
	if (!ctx) {
		throw new Error("usePortalSocket must be used within PortalSocketProvider");
	}
	return ctx;
}

export function usePortalSocketEvent<TPayload = unknown>(
	event: string,
	handler: (payload: TPayload) => void,
	enabled = true,
) {
	const { socket } = usePortalSocket();
	const handlerRef = useRef(handler);

	useEffect(() => {
		handlerRef.current = handler;
	}, [handler]);

	useEffect(() => {
		if (!socket || !enabled) return;
		const listener = (payload: TPayload) => handlerRef.current(payload);
		socket.on(event, listener);
		return () => {
			socket.off(event, listener);
		};
	}, [enabled, event, socket]);
}
