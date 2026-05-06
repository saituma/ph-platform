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
import { getClientAuthToken } from "@/lib/client-storage";
import { getPublicApiBaseUrl } from "@/lib/public-api";
import { usePortal } from "@/portal/PortalContext";

type PortalSocketStatus = "idle" | "connecting" | "connected" | "error";

type PortalSocketContextValue = {
	socket: Socket | null;
	status: PortalSocketStatus;
};

const PortalSocketContext = createContext<PortalSocketContextValue | null>(
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

		const clientToken = getClientAuthToken();
		const socketUrl = getSocketUrl();
		const sameOrigin =
			new URL(socketUrl, window.location.origin).origin ===
			window.location.origin;

		if (!clientToken && !sameOrigin) {
			setStatus("idle");
			setSocket(null);
			return;
		}

		setStatus("connecting");
		const nextSocket = io(socketUrl, {
			path: "/socket.io",
			auth: clientToken ? { token: clientToken } : undefined,
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
		setSocket(nextSocket);

		return () => {
			nextSocket.removeAllListeners();
			nextSocket.disconnect();
			setSocket(null);
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
